package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/yourusername/google-contacts-service/internal/config"
	"github.com/yourusername/google-contacts-service/internal/crypto"
	"github.com/yourusername/google-contacts-service/internal/models"
)

type BackendService struct {
	config      *config.Config
	client      *http.Client
	certManager *crypto.CertManager
	logger      *zap.Logger
}

func NewBackendService(cfg *config.Config, logger *zap.Logger) *BackendService {
	// Initialize certificate manager for mTLS
	certManager, err := crypto.NewCertManager(
		cfg.BackendMTLSCert,
		cfg.BackendMTLSKey,
		cfg.BackendCACert,
		logger,
	)
	if err != nil {
		logger.Fatal("Failed to initialize certificate manager", zap.Error(err))
	}

	// Create HTTP client with mTLS
	client := &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig:     certManager.GetTLSConfig(),
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 10,
			IdleConnTimeout:     90 * time.Second,
		},
	}

	return &BackendService{
		config:      cfg,
		client:      client,
		certManager: certManager,
		logger:      logger,
	}
}

// GetClients fetches all clients for a user from the backend
func (s *BackendService) GetClients(ctx context.Context, userID uuid.UUID) ([]models.Client, error) {
	url := fmt.Sprintf("%s/api/v1/clients", s.config.BackendServiceURL)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add user context headers (simulating what gateway would send)
	req.Header.Set("x-user-id", userID.String())
	req.Header.Set("x-gateway-key", s.config.GatewaySecret)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch clients: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("backend returned status %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Status string           `json:"status"`
		Data   []models.Client  `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	s.logger.Info("Fetched clients from backend",
		zap.String("user_id", userID.String()),
		zap.Int("count", len(result.Data)),
	)

	return result.Data, nil
}

// CreateClient creates a new client in the backend
func (s *BackendService) CreateClient(ctx context.Context, userID uuid.UUID, client *models.Client) (*models.Client, error) {
	url := fmt.Sprintf("%s/api/v1/clients", s.config.BackendServiceURL)

	// Set user ID for the client
	client.UserID = userID

	body, err := json.Marshal(client)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal client: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("x-user-id", userID.String())
	req.Header.Set("x-gateway-key", s.config.GatewaySecret)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to create client: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("backend returned status %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Status string         `json:"status"`
		Data   models.Client  `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	s.logger.Info("Created client in backend",
		zap.String("user_id", userID.String()),
		zap.String("client_id", result.Data.ID.String()),
		zap.String("client_name", result.Data.Name),
	)

	return &result.Data, nil
}

// UpdateClient updates an existing client in the backend
func (s *BackendService) UpdateClient(ctx context.Context, userID, clientID uuid.UUID, client *models.Client) error {
	url := fmt.Sprintf("%s/api/v1/clients/%s", s.config.BackendServiceURL, clientID.String())

	body, err := json.Marshal(client)
	if err != nil {
		return fmt.Errorf("failed to marshal client: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "PATCH", url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("x-user-id", userID.String())
	req.Header.Set("x-gateway-key", s.config.GatewaySecret)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to update client: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("backend returned status %d: %s", resp.StatusCode, string(body))
	}

	s.logger.Info("Updated client in backend",
		zap.String("user_id", userID.String()),
		zap.String("client_id", clientID.String()),
	)

	return nil
}

// DeleteClient deletes a client from the backend
func (s *BackendService) DeleteClient(ctx context.Context, userID, clientID uuid.UUID) error {
	url := fmt.Sprintf("%s/api/v1/clients/%s", s.config.BackendServiceURL, clientID.String())

	req, err := http.NewRequestWithContext(ctx, "DELETE", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("x-user-id", userID.String())
	req.Header.Set("x-gateway-key", s.config.GatewaySecret)

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to delete client: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("backend returned status %d: %s", resp.StatusCode, string(body))
	}

	s.logger.Info("Deleted client from backend",
		zap.String("user_id", userID.String()),
		zap.String("client_id", clientID.String()),
	)

	return nil
}

// GetClient fetches a single client from the backend
func (s *BackendService) GetClient(ctx context.Context, userID, clientID uuid.UUID) (*models.Client, error) {
	url := fmt.Sprintf("%s/api/v1/clients/%s", s.config.BackendServiceURL, clientID.String())

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("x-user-id", userID.String())
	req.Header.Set("x-gateway-key", s.config.GatewaySecret)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch client: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("backend returned status %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Status string        `json:"status"`
		Data   models.Client `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result.Data, nil
}