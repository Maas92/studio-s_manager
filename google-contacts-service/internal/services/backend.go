package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"go.uber.org/zap"

	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/config"
	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/crypto"
	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/models"
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
// Changed: userID is now string (MongoDB ObjectId)
func (s *BackendService) GetClients(ctx context.Context, userID string) ([]models.Client, error) {
	url := fmt.Sprintf("%s/clients", s.config.BackendServiceURL)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add user context headers
	req.Header.Set("x-user-id", userID) // Now string
	req.Header.Set("x-gateway-key", s.config.GatewaySecret)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch clients: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		s.logger.Error("Backend fetch clients failed",
			zap.Int("status", resp.StatusCode),
			zap.String("body", string(body)),
		)
		return nil, fmt.Errorf("backend returned status %d: %s", resp.StatusCode, string(body))
	}

	// Read response body
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Parse the actual backend response format: { data: { clients: [...] } }
	var response struct {
		Data struct {
			Clients []models.Client `json:"clients"`
		} `json:"data"`
	}

	if err := json.Unmarshal(bodyBytes, &response); err != nil {
		s.logger.Error("Failed to decode backend response",
			zap.String("raw_body", string(bodyBytes)),
			zap.Error(err),
		)
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	clients := response.Data.Clients

	s.logger.Info("Fetched clients from backend",
		zap.String("user_id", userID),
		zap.Int("count", len(clients)),
	)

	return clients, nil
}

// GetClient fetches a single client from the backend
// Changed: both IDs are now strings
func (s *BackendService) GetClient(ctx context.Context, userID, clientID string) (*models.Client, error) {
	url := fmt.Sprintf("%s/clients/%s", s.config.BackendServiceURL, clientID)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("x-user-id", userID)
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

	// Parse: { data: { id, name, ... } } (single client object in data)
	var result struct {
		Data models.Client `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result.Data, nil
}

// CreateClient creates a new client in the backend
// Changed: userID is now string
func (s *BackendService) CreateClient(ctx context.Context, userID string, client *models.Client) (*models.Client, error) {
	url := fmt.Sprintf("%s/clients", s.config.BackendServiceURL)

	body, err := json.Marshal(client)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal client: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("x-user-id", userID)
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

	// Parse: { data: { id, name, ... } }
	var result struct {
		Data models.Client `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	s.logger.Info("Created client in backend",
		zap.String("user_id", userID),
		zap.String("client_id", result.Data.ID),
		zap.String("client_name", result.Data.Name),
	)

	return &result.Data, nil
}

// UpdateClient updates an existing client in the backend
// Changed: both IDs are now strings
func (s *BackendService) UpdateClient(ctx context.Context, userID, clientID string, client *models.Client) error {
	url := fmt.Sprintf("%s/clients/%s", s.config.BackendServiceURL, clientID)

	body, err := json.Marshal(client)
	if err != nil {
		return fmt.Errorf("failed to marshal client: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "PATCH", url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("x-user-id", userID)
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
		zap.String("user_id", userID),
		zap.String("client_id", clientID),
	)

	return nil
}

// DeleteClient deletes a client from the backend
// Changed: both IDs are now strings
func (s *BackendService) DeleteClient(ctx context.Context, userID, clientID string) error {
	url := fmt.Sprintf("%s/clients/%s", s.config.BackendServiceURL, clientID)

	req, err := http.NewRequestWithContext(ctx, "DELETE", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("x-user-id", userID)
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
		zap.String("user_id", userID),
		zap.String("client_id", clientID),
	)

	return nil
}