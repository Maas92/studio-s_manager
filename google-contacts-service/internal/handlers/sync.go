package handlers

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/middleware"
	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/services"
	
	appErrors "github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/errors"
)

type SyncHandler struct {
	syncService *services.SyncService
	logger      *zap.Logger
}

func NewSyncHandler(syncService *services.SyncService, logger *zap.Logger) *SyncHandler {
	return &SyncHandler{
		syncService: syncService,
		logger:      logger,
	}
}

// TriggerSync initiates a full sync operation
func (h *SyncHandler) TriggerSync(c *gin.Context) {
	userCtx, ok := middleware.GetUserContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
		return
	}

	h.logger.Info("Sync triggered by user",
		zap.String("user_id", userCtx.UserID),
		zap.String("email", userCtx.Email),
	)

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	// Perform sync - pass string userID directly (MongoDB ObjectId)
	result, err := h.syncService.PerformSync(ctx, userCtx.UserID)
	if err != nil {
		var httpErr *appErrors.HTTPError
		if errors.As(err, &httpErr) {
			c.JSON(httpErr.Status, gin.H{
				"error": httpErr.Message,
			})
			return
		}
		
		h.logger.Error("Sync failed",
			zap.String("user_id", userCtx.UserID),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Sync failed",
			"message": err.Error(),
		})
		return
	}

	h.logger.Info("Sync completed successfully",
		zap.String("user_id", userCtx.UserID),
		zap.Duration("duration", result.Duration),
		zap.Int("created", result.Created),
		zap.Int("updated", result.Updated),
		zap.Int("conflicts", len(result.Conflicts)),
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"result":  result,
	})
}

// TriggerIncrementalSync performs an incremental sync using sync tokens
func (h *SyncHandler) TriggerIncrementalSync(c *gin.Context) {
	userCtx, ok := middleware.GetUserContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	result, err := h.syncService.PerformIncrementalSync(ctx, userCtx.UserID)
	if err != nil {
		h.logger.Error("Incremental sync failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Sync failed",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"result":  result,
	})
}

// SyncSingleClient syncs a specific client to Google (called from backend webhook)
func (h *SyncHandler) SyncSingleClient(c *gin.Context) {
	userCtx, ok := middleware.GetUserContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
		return
	}

	// Get clientID from URL parameter (as string - can be UUID or MongoDB ObjectId)
	clientID := c.Param("clientId")
	
	if clientID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Client ID is required"})
		return
	}

	h.logger.Info("Syncing single client",
		zap.String("user_id", userCtx.UserID),
		zap.String("client_id", clientID),
	)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := h.syncService.SyncSingleClient(ctx, userCtx.UserID, clientID); err != nil {
		h.logger.Error("Failed to sync single client", 
			zap.String("client_id", clientID),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to sync client",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Client synced to Google",
	})
}

// DeleteSyncedClient removes a client from Google (called from backend webhook)
func (h *SyncHandler) DeleteSyncedClient(c *gin.Context) {
	userCtx, ok := middleware.GetUserContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
		return
	}

	// Get clientID from URL parameter (as string - can be UUID or MongoDB ObjectId)
	clientID := c.Param("clientId")
	
	if clientID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Client ID is required"})
		return
	}

	h.logger.Info("Deleting synced client",
		zap.String("user_id", userCtx.UserID),
		zap.String("client_id", clientID),
	)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := h.syncService.DeleteSyncedClient(ctx, userCtx.UserID, clientID); err != nil {
		h.logger.Error("Failed to delete synced client", 
			zap.String("client_id", clientID),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to delete client from Google",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Client deleted from Google",
	})
}

// GetSyncStatus returns the last sync status and metadata
func (h *SyncHandler) GetSyncStatus(c *gin.Context) {
	userCtx, ok := middleware.GetUserContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
		return
	}

	// TODO: Implement sync history tracking
	// You might want to add a "sync_history" table to track sync runs
	// For now, return basic status

	c.JSON(http.StatusOK, gin.H{
		"user_id": userCtx.UserID,
		"message": "Sync status endpoint - implement sync history tracking if needed",
	})
}