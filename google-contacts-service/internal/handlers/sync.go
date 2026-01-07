package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/middleware"
	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/services"
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

// TriggerSync initiates a sync operation
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