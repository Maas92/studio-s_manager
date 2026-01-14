package services

import (
	"context"
	"fmt"
	"time"
	"net/http"
	"bytes"
	"encoding/json"
	"io"
	
	"go.uber.org/zap"
	"golang.org/x/oauth2"

	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/config"
	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/crypto"
	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/database"
	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/models"
	
	appErrors "github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/errors"
)

type SyncService struct {
	db             *database.Postgres
	googleService  *GoogleService
	backendService *BackendService
	encryptor      *crypto.Encryptor
	logger         *zap.Logger
}

func NewSyncService(
	db *database.Postgres,
	googleService *GoogleService,
	backendService *BackendService,
	logger *zap.Logger,
	cfg *config.Config,
) *SyncService {
	encryptor, err := crypto.NewEncryptor(cfg.EncryptionKey)
	if err != nil {
		logger.Fatal("Failed to create encryptor", zap.Error(err))
	}

	return &SyncService{
		db:             db,
		googleService:  googleService,
		backendService: backendService,
		encryptor:      encryptor,
		logger:         logger,
	}
}

// PerformSync executes full bidirectional sync
func (s *SyncService) PerformSync(ctx context.Context, userID string) (*models.SyncResult, error) {
	startTime := time.Now()
	result := &models.SyncResult{
		StartedAt: startTime,
		Conflicts: []models.ConflictItem{},
	}

	s.logger.Info("Starting bidirectional sync", zap.String("user_id", userID))

	// Get OAuth token
	token, err := s.getValidToken(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get valid token: %w", err)
	}

	// Fetch from Google
	googleContacts, err := s.googleService.FetchContacts(ctx, token)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch Google contacts: %w", err)
	}

	// Fetch from backend
	localClients, err := s.backendService.GetClients(ctx, userID)
	if err != nil {
		s.logger.Warn("Failed to fetch local clients, will only import from Google",
			zap.Error(err))
		// Import Google contacts only
		return s.importGoogleContactsOnly(ctx, userID, googleContacts, result)
	}

	s.logger.Info("Fetched data",
		zap.Int("google_contacts", len(googleContacts)),
		zap.Int("local_clients", len(localClients)),
	)

	// Get sync metadata
	syncMetadata, err := s.db.GetAllSyncMetadata(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get sync metadata: %w", err)
	}

	// Build lookup maps
	metadataByClientID := make(map[string]*models.SyncMetadata)
	metadataByGoogleID := make(map[string]*models.SyncMetadata)
	for i := range syncMetadata {
		meta := &syncMetadata[i]
		metadataByClientID[meta.ClientID] = meta
		if meta.GoogleContactID != nil {
			metadataByGoogleID[*meta.GoogleContactID] = meta
		}
	}

	localClientMap := make(map[string]*models.Client)
	for i := range localClients {
		client := &localClients[i]
		localClientMap[client.ID] = client
	}

	result.TotalProcessed = len(googleContacts) + len(localClients)

	// Phase 1: Import from Google → Backend
	s.logger.Info("Phase 1: Importing new contacts from Google to backend")
	for _, googleContact := range googleContacts {
		_, exists := metadataByGoogleID[googleContact.ResourceName]
		if !exists {
			// New contact in Google, not in backend - import it
			if err := s.createLocalClient(ctx, userID, &googleContact, result); err != nil {
				s.logger.Error("Failed to import Google contact",
					zap.String("resource_name", googleContact.ResourceName),
					zap.Error(err),
				)
				result.Errors++
			}
		} else {
			// Already synced
			result.Skipped++
		}
	}

	// Phase 2: Export from Backend → Google
	s.logger.Info("Phase 2: Exporting new clients from backend to Google")
	for _, localClient := range localClients {
		_, exists := metadataByClientID[localClient.ID]
		if !exists {
			// New client in backend, not in Google - export it
			if err := s.exportClientToGoogle(ctx, userID, token, &localClient, result); err != nil {
				s.logger.Error("Failed to export client to Google",
					zap.String("client_id", localClient.ID),
					zap.Error(err),
				)
				result.Errors++
			}
		}
		// If already synced, it's already counted in skipped from Phase 1
	}

	result.CompletedAt = time.Now()
	result.Duration = result.CompletedAt.Sub(result.StartedAt)

	s.logger.Info("Sync completed",
		zap.String("user_id", userID),
		zap.Duration("duration", result.Duration),
		zap.Int("created", result.Created),
		zap.Int("skipped", result.Skipped),
		zap.Int("errors", result.Errors),
	)

	return result, nil
}

// Helper method for Google-only import
func (s *SyncService) importGoogleContactsOnly(
	ctx context.Context,
	userID string,
	googleContacts []models.GoogleContact,
	result *models.SyncResult,
) (*models.SyncResult, error) {
	s.logger.Info("Importing Google contacts (backend unavailable)",
		zap.Int("count", len(googleContacts)),
	)
	
	syncMetadata, _ := s.db.GetAllSyncMetadata(ctx, userID)
	metadataByGoogleID := make(map[string]*models.SyncMetadata)
	for i := range syncMetadata {
		meta := &syncMetadata[i]
		if meta.GoogleContactID != nil {
			metadataByGoogleID[*meta.GoogleContactID] = meta
		}
	}
	
	for _, googleContact := range googleContacts {
		_, exists := metadataByGoogleID[googleContact.ResourceName]
		if !exists {
			if err := s.createLocalClient(ctx, userID, &googleContact, result); err != nil {
				s.logger.Error("Failed to import",
					zap.String("resource_name", googleContact.ResourceName),
					zap.Error(err),
				)
				result.Errors++
			}
		} else {
			result.Skipped++
		}
	}
	
	result.TotalProcessed = len(googleContacts)
	result.CompletedAt = time.Now()
	result.Duration = result.CompletedAt.Sub(result.StartedAt)
	
	return result, nil
}

// PerformIncrementalSync uses sync tokens for efficient syncing
func (s *SyncService) PerformIncrementalSync(ctx context.Context, userID string) (*models.SyncResult, error) {
	startTime := time.Now()
	result := &models.SyncResult{
		StartedAt: startTime,
		Conflicts: []models.ConflictItem{},
	}

	s.logger.Info("Starting incremental sync", zap.String("user_id", userID))

	// Get OAuth token
	token, err := s.getValidToken(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get valid token: %w", err)
	}

	// Get last sync token
	syncToken, err := s.db.GetSyncToken(ctx, userID)
	if err != nil {
		s.logger.Error("Failed to get sync token", zap.Error(err))
		// Fall back to full sync
		return s.PerformSync(ctx, userID)
	}

	// Fetch only changed contacts
	changedContacts, newSyncToken, err := s.googleService.GetContactChanges(ctx, token, syncToken)
	if err != nil {
		if syncToken != "" {
			s.logger.Warn("Sync token invalid, performing full sync")
			return s.PerformSync(ctx, userID)
		}
		return nil, fmt.Errorf("failed to get contact changes: %w", err)
	}

	s.logger.Info("Fetched changed contacts",
		zap.Int("count", len(changedContacts)),
		zap.Bool("is_full_sync", syncToken == ""),
	)

	result.TotalProcessed = len(changedContacts)
	result.Skipped = len(changedContacts)

	// Save new sync token
	if newSyncToken != "" {
		if err := s.db.SaveSyncToken(ctx, userID, newSyncToken); err != nil {
			s.logger.Error("Failed to save sync token", zap.Error(err))
		}
	}

	result.CompletedAt = time.Now()
	result.Duration = result.CompletedAt.Sub(result.StartedAt)

	return result, nil
}

// SyncSingleClient syncs a specific client to Google (for real-time webhook)
func (s *SyncService) SyncSingleClient(ctx context.Context, userID string, clientID string) error {
	s.logger.Info("Syncing single client",
		zap.String("user_id", userID),
		zap.String("client_id", clientID),
	)

	// Get OAuth token
	token, err := s.getValidToken(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get valid token: %w", err)
	}

	// Get the client from backend
	client, err := s.backendService.GetClient(ctx, userID, clientID)
	if err != nil {
		return fmt.Errorf("failed to get client: %w", err)
	}

	// Check if already synced
	meta, err := s.db.GetSyncMetadata(ctx, clientID, userID)
	if err != nil {
		return fmt.Errorf("failed to get sync metadata: %w", err)
	}

  if meta == nil || meta.GoogleContactID == nil {

	// 🔒 HARD VALIDATION — prevent Google 400
	if !hasGoogleContactData(client) {
		s.logger.Debug("Skipping Google contact creation — no usable contact data",
			zap.String("client_id", clientID),
			zap.String("user_id", userID),
		)
		return nil // graceful skip, NOT an error
	}

	// Create in Google
	resourceName, err := s.googleService.CreateContact(ctx, token, client)
	if err != nil {
		return fmt.Errorf("failed to create Google contact: %w", err)
	}

		// Save metadata
		now := time.Now()
		newMeta := &models.SyncMetadata{
			ClientID:           clientID,
			GoogleContactID:    &resourceName,
			UserID:             userID,
			LastSyncedAt:       &now,
			LastModifiedSource: "local",
			SyncStatus:         "synced",
		}
		return s.db.SaveSyncMetadata(ctx, newMeta)
	}

	// Update in Google
	if err := s.googleService.UpdateContact(ctx, token, *meta.GoogleContactID, client); err != nil {
		return fmt.Errorf("failed to update Google contact: %w", err)
	}

	// Update metadata
	now := time.Now()
	meta.LastSyncedAt = &now
	meta.LastModifiedSource = "local"
	meta.SyncStatus = "synced"
	return s.db.SaveSyncMetadata(ctx, meta)
}

// DeleteSyncedClient removes a client from Google and cleans up metadata
func (s *SyncService) DeleteSyncedClient(ctx context.Context, userID string, clientID string) error {
	s.logger.Info("Deleting synced client",
		zap.String("user_id", userID),
		zap.String("client_id", clientID),
	)

	// Get sync metadata
	meta, err := s.db.GetSyncMetadata(ctx, clientID, userID)
	if err != nil || meta == nil || meta.GoogleContactID == nil {
		// Not synced, nothing to do
		return nil
	}

	// Get OAuth token
	token, err := s.getValidToken(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get valid token: %w", err)
	}

	// Delete from Google
	if err := s.googleService.DeleteContact(ctx, token, *meta.GoogleContactID); err != nil {
		s.logger.Error("Failed to delete from Google", zap.Error(err))
		// Continue to delete metadata anyway
	}

	// Delete metadata
	return s.db.DeleteSyncMetadata(ctx, clientID, userID)
}

// Internal helper methods

func (s *SyncService) processGoogleContact(
	ctx context.Context,
	userID string,
	token *oauth2.Token,
	googleContact *models.GoogleContact,
	metadataByGoogleID map[string]*models.SyncMetadata,
	localClientMap map[string]*models.Client,
	result *models.SyncResult,
) error {
	meta, exists := metadataByGoogleID[googleContact.ResourceName]
	if !exists {
		return s.createLocalClient(ctx, userID, googleContact, result)
	}

	localClient, exists := localClientMap[meta.ClientID]
	if !exists {
		return s.createLocalClient(ctx, userID, googleContact, result)
	}

	if s.needsUpdate(googleContact, localClient) {
		return s.updateLocalClient(ctx, userID, googleContact, localClient, meta, result)
	}

	result.Skipped++
	return nil
}

func (s *SyncService) createGoogleContact(
	ctx context.Context,
	userID string,
	token *oauth2.Token,
	client *models.Client,
	result *models.SyncResult,
) error {
	
	if !hasGoogleContactData(client) {
	  s.logger.Warn("Skipping Google contact creation — no usable data",
			zap.String("client_id", client.ID),
			zap.String("user_id", userID),
		)
		result.Skipped++
		return nil
	}

	resourceName, err := s.googleService.CreateContact(ctx, token, client)
	if err != nil {
		return err
	}

	now := time.Now()
	meta := &models.SyncMetadata{
		ClientID:           client.ID,
		GoogleContactID:    &resourceName,
		UserID:             userID,
		LastSyncedAt:       &now,
		LastModifiedSource: "local",
		SyncStatus:         "synced",
	}

	if err := s.db.SaveSyncMetadata(ctx, meta); err != nil {
		return err
	}

	result.Created++
	return nil
}

func (s *SyncService) createLocalClient(
	ctx context.Context,
	userID string,
	googleContact *models.GoogleContact,
	result *models.SyncResult,
) error {
	// Extract data from Google contact
	var name, phone, email, whatsapp string
	
	// Get name
	if len(googleContact.Names) > 0 {
		name = googleContact.Names[0].DisplayName
	}
	
	// Get primary phone
	if len(googleContact.PhoneNumbers) > 0 {
		phone = googleContact.PhoneNumbers[0].Value
		
		// Check if there's a second phone number (for WhatsApp)
		if len(googleContact.PhoneNumbers) > 1 {
			whatsapp = googleContact.PhoneNumbers[1].Value
		}
	}
	
	// Get email
	if len(googleContact.EmailAddresses) > 0 {
		email = googleContact.EmailAddresses[0].Value
	}
	
	// Create client in backend with proper format
	clientData := map[string]interface{}{
		"name":  name,
		"phone": phone,
	}
	
	if email != "" {
		clientData["email"] = email
	}
	
	if whatsapp != "" && whatsapp != phone {
		clientData["whatsapp"] = whatsapp
	}
	
	// Marshal to JSON
	jsonData, err := json.Marshal(clientData)
	if err != nil {
		return fmt.Errorf("failed to marshal client data: %w", err)
	}
	
	// Call backend API
	url := fmt.Sprintf("%s/clients", s.backendService.config.BackendServiceURL)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(jsonData))
	if err != nil {
		return err
	}
	
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-user-id", userID)
	req.Header.Set("x-gateway-key", s.backendService.config.GatewaySecret)
	
	resp, err := s.backendService.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to create client: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("backend returned status %d: %s", resp.StatusCode, string(body))
	}
	
	var response struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return fmt.Errorf("failed to decode response: %w", err)
	}
	
	// Save sync metadata
	now := time.Now()
	meta := &models.SyncMetadata{
		ClientID:           response.Data.ID,
		GoogleContactID:    &googleContact.ResourceName,
		UserID:             userID,
		LastSyncedAt:       &now,
		LastModifiedSource: "google",
		SyncStatus:         "synced",
	}
	
	if err := s.db.SaveSyncMetadata(ctx, meta); err != nil {
		return err
	}
	
	s.logger.Info("Created client from Google contact",
		zap.String("client_id", response.Data.ID),
		zap.String("name", name),
	)
	
	result.Created++
	return nil
}

func (s *SyncService) updateLocalClient(
	ctx context.Context,
	userID string,
	googleContact *models.GoogleContact,
	localClient *models.Client,
	meta *models.SyncMetadata,
	result *models.SyncResult,
) error {
	updatedClient := s.convertGoogleContactToClient(googleContact, userID)
	updatedClient.ID = localClient.ID

	if err := s.backendService.UpdateClient(ctx, userID, localClient.ID, updatedClient); err != nil {
		return err
	}

	now := time.Now()
	meta.LastSyncedAt = &now
	meta.LastModifiedSource = "google"
	meta.SyncStatus = "synced"

	if err := s.db.SaveSyncMetadata(ctx, meta); err != nil {
		return err
	}

	result.Updated++
	return nil
}

// hasGoogleContactData ensures we never send an empty contact to Google
func hasGoogleContactData(client *models.Client) bool {
	if client == nil {
		return false
	}

	// Name alone is valid for Google
	if client.Name != "" && client.Name != "Unknown" {
		return true
	}

	if client.Phone != "" {
		return true
	}

	if client.Email != nil && *client.Email != "" {
		return true
	}

	if client.Address != nil && *client.Address != "" {
		return true
	}

	if client.Notes != nil && *client.Notes != "" {
		return true
	}

	return false
}

// exportClientToGoogle creates a Google contact from a backend client
func (s *SyncService) exportClientToGoogle(
	ctx context.Context,
	userID string,
	token *oauth2.Token,
	client *models.Client,
	result *models.SyncResult,
) error {
	
	// 🔒 HARD VALIDATION — prevent empty Google contacts
  if !hasGoogleContactData(client) {
	  s.logger.Warn("Skipping Google export — client has no contact data",
		zap.String("client_id", client.ID),
		zap.String("user_id", userID),
	)
	result.Skipped++
	return nil
 }

resourceName, err := s.googleService.CreateContact(ctx, token, client)
if err != nil {
	return fmt.Errorf("failed to create Google contact: %w", err)
}

	// Save sync metadata
	now := time.Now()
	meta := &models.SyncMetadata{
		ClientID:           client.ID,
		GoogleContactID:    &resourceName,
		UserID:             userID,
		LastSyncedAt:       &now,
		LastModifiedSource: "local",
		SyncStatus:         "synced",
	}

	if err := s.db.SaveSyncMetadata(ctx, meta); err != nil {
		return err
	}

	s.logger.Info("Exported client to Google",
		zap.String("client_id", client.ID),
		zap.String("client_name", client.Name),
	)

	result.Created++
	return nil
}

func (s *SyncService) getValidToken(ctx context.Context, userID string) (*oauth2.Token, error) {
	oauthToken, err := s.db.GetOAuthToken(ctx, userID)
	if err != nil {
		return nil, err
	}

	if oauthToken == nil {
		return nil, appErrors.NewHTTPError(
			http.StatusPreconditionRequired,
			"Google account not connected",
		)
	}

	accessToken, err := s.encryptor.Decrypt(oauthToken.AccessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt access token: %w", err)
	}

	refreshToken, err := s.encryptor.Decrypt(oauthToken.RefreshToken)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt refresh token: %w", err)
	}

	token := &oauth2.Token{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    oauthToken.TokenType,
		Expiry:       oauthToken.Expiry,
	}

	if time.Now().After(token.Expiry) {
		newToken, err := s.googleService.RefreshToken(ctx, token.RefreshToken)
		if err != nil {
			return nil, fmt.Errorf("failed to refresh token: %w", err)
		}

		encryptedAccess, _ := s.encryptor.Encrypt(newToken.AccessToken)
		encryptedRefresh, _ := s.encryptor.Encrypt(newToken.RefreshToken)

		oauthToken.AccessToken = encryptedAccess
		oauthToken.RefreshToken = encryptedRefresh
		oauthToken.Expiry = newToken.Expiry

		s.db.SaveOAuthToken(ctx, oauthToken)

		return newToken, nil
	}

	return token, nil
}

func (s *SyncService) convertGoogleContactToClient(
	googleContact *models.GoogleContact,
	userID string,
) *models.Client {
	client := &models.Client{
		UserID: userID,
		Name:   "Unknown",
	}

	if len(googleContact.Names) > 0 {
		client.Name = googleContact.Names[0].DisplayName
	}

	if len(googleContact.EmailAddresses) > 0 {
		email := googleContact.EmailAddresses[0].Value
		client.Email = &email
	}

	if len(googleContact.PhoneNumbers) > 0 {
		client.Phone = googleContact.PhoneNumbers[0].Value
	}

	if len(googleContact.Addresses) > 0 {
		addr := googleContact.Addresses[0].FormattedValue
		client.Address = &addr
	}

	if len(googleContact.Birthdays) > 0 {
		date := googleContact.Birthdays[0].Date
		if date.Year > 0 {
			dob := time.Date(date.Year, time.Month(date.Month), date.Day, 0, 0, 0, 0, time.UTC)
			client.DateOfBirth = &dob
		}
	}

	if len(googleContact.Biographies) > 0 {
		notes := googleContact.Biographies[0].Value
		client.Notes = &notes
	}

	return client
}

func (s *SyncService) needsUpdate(googleContact *models.GoogleContact, localClient *models.Client) bool {
	var googleName, googlePhone string

	if len(googleContact.Names) > 0 {
		googleName = googleContact.Names[0].DisplayName
	}

	if len(googleContact.PhoneNumbers) > 0 {
		googlePhone = googleContact.PhoneNumbers[0].Value
	}

	return googleName != localClient.Name || googlePhone != localClient.Phone
}