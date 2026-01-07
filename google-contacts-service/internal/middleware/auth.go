package middleware

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/models"
	"go.uber.org/zap"
)

// GatewayAuth validates requests from the API gateway
func GatewayAuth(gatewaySecret string, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		
		// Check gateway secret
		providedSecret := c.GetHeader("x-gateway-key")
		
		logger.Warn("GatewayAuth check",
    zap.String("provided", providedSecret),
    zap.String("expected", gatewaySecret),
)
		
		if providedSecret != gatewaySecret {
			logger.Warn("Unauthorized request - invalid gateway key",
				zap.String("ip", c.ClientIP()),
				zap.String("path", c.Request.URL.Path),
			)
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Unauthorized - invalid gateway key",
			})
			c.Abort()
			return
		}

		// Extract user context from headers (set by API gateway)
		userID := c.GetHeader("x-user-id")
		userEmail := c.GetHeader("x-user-email")
		userRole := c.GetHeader("x-user-role")

		if userID == "" {
			logger.Warn("Missing user context in request",
				zap.String("path", c.Request.URL.Path),
			)
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Missing user context",
			})
			c.Abort()
			return
		}

		// Store user context in gin context
		userCtx := &models.UserContext{
			UserID: userID,
			Email:  userEmail,
			Role:   userRole,
		}
		c.Set("user", userCtx)

		logger.Debug("Request authenticated",
			zap.String("user_id", userID),
			zap.String("email", userEmail),
			zap.String("role", userRole),
		)

		c.Next()
	}
}

// CORS middleware
func CORS(allowedOrigins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")

		// Check if origin is allowed
		allowed := false
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin {
				allowed = true
				break
			}
		}

		if allowed {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
			c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")
		}

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// Logger middleware
func Logger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Log request
		latency := time.Since(start)
		statusCode := c.Writer.Status()

		fields := []zap.Field{
			zap.String("method", c.Request.Method),
			zap.String("path", path),
			zap.String("query", query),
			zap.Int("status", statusCode),
			zap.Duration("latency", latency),
			zap.String("ip", c.ClientIP()),
			zap.String("user_agent", c.Request.UserAgent()),
		}

		// Add user context if available
		if user, exists := c.Get("user"); exists {
			if userCtx, ok := user.(*models.UserContext); ok {
				fields = append(fields, zap.String("user_id", userCtx.UserID))
			}
		}

		// Add error if present
		if len(c.Errors) > 0 {
			fields = append(fields, zap.String("error", c.Errors.String()))
		}

		// Log based on status code
		if statusCode >= 500 {
			logger.Error("Server error", fields...)
		} else if statusCode >= 400 {
			logger.Warn("Client error", fields...)
		} else {
			logger.Info("Request completed", fields...)
		}
	}
}

// GetUserContext extracts user context from gin context
func GetUserContext(c *gin.Context) (*models.UserContext, bool) {
	user, exists := c.Get("user")
	if !exists {
		return nil, false
	}

	userCtx, ok := user.(*models.UserContext)
	return userCtx, ok
}