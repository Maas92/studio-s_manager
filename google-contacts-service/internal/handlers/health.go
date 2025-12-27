package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/yourusername/google-contacts-service/internal/database"
)

type HealthHandler struct {
	db     *database.Postgres
	logger *zap.Logger
}

func NewHealthHandler(db *database.Postgres, logger *zap.Logger) *HealthHandler {
	return &HealthHandler{
		db:     db,
		logger: logger,
	}
}

func (h *HealthHandler) Check(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Check database connection
	dbStatus := "healthy"
	if err := h.db.Ping(ctx); err != nil {
		h.logger.Error("Database health check failed", zap.Error(err))
		dbStatus = "unhealthy"
	}

	status := http.StatusOK
	if dbStatus == "unhealthy" {
		status = http.StatusServiceUnavailable
	}

	c.JSON(status, gin.H{
		"status":    "ok",
		"timestamp": time.Now().UTC(),
		"service":   "google-contacts-service",
		"checks": gin.H{
			"database": dbStatus,
		},
	})
}