package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/config"
	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/database"
	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/handlers"
	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/middleware"
	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/services"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		panic(fmt.Sprintf("Failed to load config: %v", err))
	}

	// Initialize logger
	logger := initLogger(cfg.LogLevel)
	defer logger.Sync()

	logger.Info("Starting Google Contacts Sync Service",
		zap.String("service", cfg.ServiceName),
		zap.String("environment", cfg.Environment),
		zap.String("port", cfg.Port),
	)

	// Initialize database
	db, err := database.NewPostgres(cfg.DatabaseURL)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer db.Close()
	logger.Info("Database connected successfully")

	// Initialize services
	googleService := services.NewGoogleService(cfg, logger)
	backendService := services.NewBackendService(cfg, logger)
	syncService := services.NewSyncService(db, googleService, backendService, logger, cfg)

	// Initialize handlers
	healthHandler := handlers.NewHealthHandler(db, logger)
	oauthHandler := handlers.NewOAuthHandler(cfg, db, googleService, logger)
	syncHandler := handlers.NewSyncHandler(syncService, logger)

	// Gin setup
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.Logger(logger))
	router.Use(middleware.CORS(cfg.AllowedOrigins))

	// ------------------------------------------------------------------
	// Public routes (NO gateway auth)
	// ------------------------------------------------------------------

	router.Any("/health", healthHandler.Check)
	
	// OAuth callback (no auth required - called by Google redirect)
	router.GET("/google-contacts/callback", oauthHandler.HandleCallback)

	// ------------------------------------------------------------------
	// Protected routes (Gateway-only, internal use)
	// ------------------------------------------------------------------

		api := router.Group("/google-contacts")
		{
    	api.Use(middleware.GatewayAuth(cfg.GatewaySecret, logger))
			
    	// OAuth flow
    	api.GET("/connect", oauthHandler.InitiateOAuth)
    	api.DELETE("/disconnect", oauthHandler.Disconnect)
    	api.GET("/status", oauthHandler.GetConnectionStatus)
			
    	// Sync operations
    	api.POST("/sync", syncHandler.TriggerSync)
    	api.GET("/sync-status", syncHandler.GetSyncStatus)
			
			// Real-time sync endpoints
    	api.POST("/sync-client/:clientId", syncHandler.SyncSingleClient)
    	api.DELETE("/sync-client/:clientId", syncHandler.DeleteSyncedClient)
		}

	// HTTP server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Start server
	go func() {
		logger.Info("Server starting", zap.String("address", srv.Addr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Server failed to start", zap.Error(err))
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server stopped gracefully")
}

func initLogger(level string) *zap.Logger {
	var zapLevel zapcore.Level
	switch level {
	case "debug":
		zapLevel = zapcore.DebugLevel
	case "info":
		zapLevel = zapcore.InfoLevel
	case "warn":
		zapLevel = zapcore.WarnLevel
	case "error":
		zapLevel = zapcore.ErrorLevel
	default:
		zapLevel = zapcore.InfoLevel
	}

	cfg := zap.Config{
		Level:            zap.NewAtomicLevelAt(zapLevel),
		Development:      false,
		Encoding:         "json",
		EncoderConfig:    zap.NewProductionEncoderConfig(),
		OutputPaths:      []string{"stdout"},
		ErrorOutputPaths: []string{"stderr"},
	}

	cfg.EncoderConfig.TimeKey = "timestamp"
	cfg.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder

	logger, err := cfg.Build()
	if err != nil {
		panic(fmt.Sprintf("Failed to initialize logger: %v", err))
	}

	return logger
}
