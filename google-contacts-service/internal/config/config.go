package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	// Service
	ServiceName string
	Port        string
	Environment string
	LogLevel    string

	// Database
	DatabaseURL string

	// Google OAuth
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string

	// Backend Service (mTLS)
	BackendServiceURL string
	BackendMTLSCert   string
	BackendMTLSKey    string
	BackendCACert     string

	// Gateway Auth
	GatewaySecret string

	// Encryption
	EncryptionKey []byte

	// CORS
	AllowedOrigins []string
}

func Load() (*Config, error) {
	// Load .env file in development
	if env := os.Getenv("ENVIRONMENT"); env != "production" {
		if err := godotenv.Load(); err != nil {
			// Not critical in production where env vars are set directly
			fmt.Println("Warning: .env file not found, using environment variables")
		}
	}

	cfg := &Config{
		ServiceName: getEnv("SERVICE_NAME", "google-contacts-service"),
		Port:        getEnv("PORT", "5004"),
		Environment: getEnv("ENVIRONMENT", "development"),
		LogLevel:    getEnv("LOG_LEVEL", "info"),

		DatabaseURL: getEnvRequired("DATABASE_URL"),

		GoogleClientID:     getEnvRequired("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: getEnvRequired("GOOGLE_CLIENT_SECRET"),
		GoogleRedirectURL:  getEnvRequired("GOOGLE_REDIRECT_URL"),

		BackendServiceURL: getEnv("BACKEND_SERVICE_URL", "http://localhost:5003"),
		BackendMTLSCert:   getEnv("BACKEND_MTLS_CERT", "./certs/google-contacts-cert.pem"),
		BackendMTLSKey:    getEnv("BACKEND_MTLS_KEY", "./certs/google-contacts-key.pem"),
		BackendCACert:     getEnv("BACKEND_CA_CERT", "./certs/ca-cert.pem"),

		GatewaySecret: getEnvRequired("GATEWAY_SECRET"),

		EncryptionKey: []byte(getEnvRequired("ENCRYPTION_KEY")),
	}

	// Parse allowed origins
	origins := getEnv("ALLOWED_ORIGINS", "http://localhost:5173")
	cfg.AllowedOrigins = parseCommaSeparated(origins)

	// Validate encryption key length (must be 32 bytes for AES-256)
	if len(cfg.EncryptionKey) != 32 {
		return nil, fmt.Errorf("ENCRYPTION_KEY must be exactly 32 bytes, got %d", len(cfg.EncryptionKey))
	}

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvRequired(key string) string {
	value := os.Getenv(key)
	if value == "" {
		panic(fmt.Sprintf("Required environment variable %s is not set", key))
	}
	return value
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		parsed, err := strconv.ParseBool(value)
		if err == nil {
			return parsed
		}
	}
	return defaultValue
}

func parseCommaSeparated(s string) []string {
	if s == "" {
		return []string{}
	}
	result := []string{}
	for _, part := range splitByComma(s) {
		if trimmed := trim(part); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func splitByComma(s string) []string {
	var result []string
	current := ""
	for _, ch := range s {
		if ch == ',' {
			result = append(result, current)
			current = ""
		} else {
			current += string(ch)
		}
	}
	if current != "" {
		result = append(result, current)
	}
	return result
}

func trim(s string) string {
	start := 0
	end := len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\n') {
		end--
	}
	return s[start:end]
}