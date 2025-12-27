package handlers

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/yourusername/google-contacts-service/internal/config"
	"github.com/yourusername/google-contacts-service/internal/crypto"
	"github.com/yourusername/google-contacts-service/internal/database"
	"github.com/yourusername/google-contacts-service/internal/middleware"
	"github.com/yourusername/google-contacts-service/internal/models"
	"github.com/yourusername/google-contacts-service/internal/services"
)

type OAuthHandler struct {
	config        *config.Config
	db            *database.Postgres
	googleService *services.GoogleService
	encryptor     *crypto.Encryptor
	logger        *zap.Logger
	stateStore    map[string]string // In production, use Redis
}

func NewOAuthHandler(cfg *config.Config, db *database.Postgres, googleService *services.GoogleService, logger *zap.Logger) *OAuthHandler {
	encryptor, err := crypto.NewEncryptor(cfg.EncryptionKey)
	if err != nil {
		panic(fmt.Sprintf("Failed to create encryptor: %v", err))
	}

	return &OAuthHandler{
		config:        cfg,
		db:            db,
		googleService: googleService,
		encryptor:     encryptor,
		logger:        logger,
		stateStore:    make(map[string]string), // TODO: Use Redis in production
	}
}

// InitiateOAuth starts the OAuth flow
func (h *OAuthHandler) InitiateOAuth(c *gin.Context) {
	userCtx, ok := middleware.GetUserContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
		return
	}

	// Generate random state for CSRF protection
	state, err := h.generateState()
	if err != nil {
		h.logger.Error("Failed to generate state", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate state"})
		return
	}

	// Store state with user ID (in production, use Redis with expiration)
	h.stateStore[state] = userCtx.UserID

	// Get authorization URL
	authURL := h.googleService.GetAuthURL(state)

	h.logger.Info("OAuth flow initiated",
		zap.String("user_id", userCtx.UserID),
		zap.String("state", state),
	)

	c.JSON(http.StatusOK, gin.H{
		"auth_url": authURL,
	})
}

// HandleCallback handles the OAuth callback from Google
func (h *OAuthHandler) HandleCallback(c *gin.Context) {
	state := c.Query("state")
	code := c.Query("code")
	errorParam := c.Query("error")

	// Check for errors
	if errorParam != "" {
		h.logger.Warn("OAuth callback error", zap.String("error", errorParam))
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("OAuth error: %s", errorParam)})
		return
	}

	if code == "" || state == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing code or state"})
		return
	}

	// Verify state
	userID, ok := h.stateStore[state]
	if !ok {
		h.logger.Warn("Invalid state in OAuth callback", zap.String("state", state))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid state"})
		return
	}

	// Clean up state
	delete(h.stateStore, state)

	// Exchange code for tokens
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	token, err := h.googleService.ExchangeCode(ctx, code)
	if err != nil {
		h.logger.Error("Failed to exchange code", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to exchange code"})
		return
	}

	// Encrypt tokens
	encryptedAccess, err := h.encryptor.Encrypt(token.AccessToken)
	if err != nil {
		h.logger.Error("Failed to encrypt access token", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt tokens"})
		return
	}

	encryptedRefresh, err := h.encryptor.Encrypt(token.RefreshToken)
	if err != nil {
		h.logger.Error("Failed to encrypt refresh token", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt tokens"})
		return
	}

	// Parse user ID
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		h.logger.Error("Invalid user ID", zap.String("user_id", userID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID"})
		return
	}

	// Save to database
	oauthToken := &models.OAuthToken{
		UserID:       userUUID,
		AccessToken:  encryptedAccess,
		RefreshToken: encryptedRefresh,
		TokenType:    token.TokenType,
		Expiry:       token.Expiry,
		Scopes:       []string{"contacts", "userinfo.email"},
	}

	if err := h.db.SaveOAuthToken(ctx, oauthToken); err != nil {
		h.logger.Error("Failed to save OAuth token", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save tokens"})
		return
	}

	h.logger.Info("OAuth connection successful",
		zap.String("user_id", userID),
	)

	// Return success (in production, redirect to frontend with success message)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Google account connected successfully",
	})
}

// Disconnect revokes OAuth access
func (h *OAuthHandler) Disconnect(c *gin.Context) {
	userCtx, ok := middleware.GetUserContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
		return
	}

	userUUID, err := uuid.Parse(userCtx.UserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Delete OAuth token
	if err := h.db.DeleteOAuthToken(ctx, userUUID); err != nil {
		h.logger.Error("Failed to delete OAuth token", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to disconnect"})
		return
	}

	h.logger.Info("Google account disconnected",
		zap.String("user_id", userCtx.UserID),
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Google account disconnected",
	})
}

// GetConnectionStatus checks if user has connected their Google account
func (h *OAuthHandler) GetConnectionStatus(c *gin.Context) {
	userCtx, ok := middleware.GetUserContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
		return
	}

	userUUID, err := uuid.Parse(userCtx.UserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	token, err := h.db.GetOAuthToken(ctx, userUUID)
	if err != nil {
		h.logger.Error("Failed to get OAuth token", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check status"})
		return
	}

	if token == nil {
		c.JSON(http.StatusOK, gin.H{
			"connected": false,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"connected":  true,
		"expires_at": token.Expiry,
		"scopes":     token.Scopes,
	})
}

// Helper functions

func (h *OAuthHandler) generateState() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}