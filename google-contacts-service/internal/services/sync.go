package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"golang.org/x/oauth2"

	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/config"
	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/crypto"
	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/database"
	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/models"
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

// ===============================
// PUBLIC SYNC METHODS
// ===============================

// PerformSync executes full bidirectional sync
func (s *SyncService) PerformSync(ctx context.Context, userID string) (*models.SyncResult, error) {
	startTime := time.Now()
	result := &models.SyncResult{
		StartedAt: startTime,
		Conflicts: []models.ConflictItem{},
	}

	s.logger.Info("Starting full sync", zap.String("user_id", userID))

	// Try to parse as UUID for backend calls
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		// If not UUID, backend might also use MongoDB ObjectId
		s.logger.Warn("UserID is not UUID, backend must support string IDs", 
			zap.String("user_id", userID))
		// For now, just fetch from Google to verify OAuth
		return s.performGoogleOnlySync(ctx, userID)
	}

	// Get and validate OAuth token
	token, err := s.getValidToken(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get valid token: %w", err)
	}

	// Fetch from both sources
	googleContacts, err := s.googleService.FetchContacts(ctx, token)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch Google contacts: %w", err)
	}

	localClients, err := s.backendService.GetClients(ctx, userUUID)
	if err != nil {
		s.logger.Error("Failed to fetch local clients, continuing with Google sync only", 
			zap.Error(err))
		return s.performGoogleOnlySync(ctx, userID)
	}

	s.logger.Info("Fetched data from both sources",
		zap.Int("google_contacts", len(googleContacts)),
		zap.Int("local_clients", len(localClients)),
	)

	// Get sync metadata
	syncMetadata, err := s.db.GetAllSyncMetadata(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get sync metadata: %w", err)
	}

	// Create lookup maps
	metadataByClientID := make(map[uuid.UUID]*models.SyncMetadata)
	metadataByGoogleID := make(map[string]*models.SyncMetadata)
	for i := range syncMetadata {
		meta := &syncMetadata[i]
		metadataByClientID[meta.ClientID] = meta
		if meta.GoogleContactID != nil {
			metadataByGoogleID[*meta.GoogleContactID] = meta
		}
	}

	localClientMap := make(map[uuid.UUID]*models.Client)
	for i := range localClients {
		client := &localClients[i]
		localClientMap[client.ID] = client
	}

	result.TotalProcessed = len(googleContacts) + len(localClients)

	// Phase 1: Process Google contacts → Local
	for _, googleContact := range googleContacts {
		if err := s.processGoogleContact(
			ctx, userID, userUUID, token,
			&googleContact, metadataByGoogleID, localClientMap, result,
		); err != nil {
			s.logger.Error("Failed to process Google contact",
				zap.String("resource_name", googleContact.ResourceName),
				zap.Error(err),
			)
			result.Errors++
		}
	}

	// Phase 2: Process Local clients → Google
	for _, localClient := range localClients {
		meta, exists := metadataByClientID[localClient.ID]
		if !exists || meta.GoogleContactID == nil {
			if err := s.createGoogleContact(ctx, userID, userUUID, token, &localClient, result); err != nil {
				s.logger.Error("Failed to create Google contact",
					zap.String("client_id", localClient.ID.String()),
					zap.Error(err),
				)
				result.Errors++
			}
		}
	}

	result.CompletedAt = time.Now()
	result.Duration = result.CompletedAt.Sub(result.StartedAt)

	s.logger.Info("Sync completed",
		zap.String("user_id", userID),
		zap.Duration("duration", result.Duration),
		zap.Int("created", result.Created),
		zap.Int("updated", result.Updated),
		zap.Int("skipped", result.Skipped),
		zap.Int("errors", result.Errors),
		zap.Int("conflicts", len(result.Conflicts)),
	)

	return result, nil
}

// SyncSingleClient syncs a specific client to Google (for real-time webhook)
func (s *SyncService) SyncSingleClient(ctx context.Context, userID string, clientID uuid.UUID) error {
	s.logger.Info("Syncing single client", 
		zap.String("user_id", userID),
		zap.String("client_id", clientID.String()),
	)

	// Parse userID to UUID if needed
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID format: %w", err)
	}

	// Get OAuth token
	token, err := s.getValidToken(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get valid token: %w", err)
	}

	// Get the client from backend
	client, err := s.backendService.GetClient(ctx, userUUID, clientID)
	if err != nil {
		return fmt.Errorf("failed to get client: %w", err)
	}

	// Check if already synced
	meta, err := s.db.GetSyncMetadata(ctx, clientID.String(), userID)
	if err != nil {
		return fmt.Errorf("failed to get sync metadata: %w", err)
	}

	if meta == nil || meta.GoogleContactID == nil {
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
func (s *SyncService) DeleteSyncedClient(ctx context.Context, userID string, clientID uuid.UUID) error {
	s.logger.Info("Deleting synced client",
		zap.String("user_id", userID),
		zap.String("client_id", clientID.String()),
	)

	// Get sync metadata
	meta, err := s.db.GetSyncMetadata(ctx, clientID.String(), userID)
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
	return s.db.DeleteSyncMetadata(ctx, clientID.String(), userID)
}

// ===============================
// INTERNAL METHODS
// ===============================

func (s *SyncService) performGoogleOnlySync(ctx context.Context, userID string) (*models.SyncResult, error) {
	startTime := time.Now()
	result := &models.SyncResult{
		StartedAt: startTime,
		Conflicts: []models.ConflictItem{},
	}

	token, err := s.getValidToken(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get valid token: %w", err)
	}

	googleContacts, err := s.googleService.FetchContacts(ctx, token)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch Google contacts: %w", err)
	}

	result.TotalProcessed = len(googleContacts)
	result.Skipped = len(googleContacts)
	result.CompletedAt = time.Now()
	result.Duration = result.CompletedAt.Sub(result.StartedAt)

	s.logger.Info("Google-only sync completed",
		zap.String("user_id", userID),
		zap.Int("contacts_fetched", len(googleContacts)),
	)

	return result, nil
}

func (s *SyncService) processGoogleContact(
	ctx context.Context,
	userID string,
	userUUID uuid.UUID,
	token *oauth2.Token,
	googleContact *models.GoogleContact,
	metadataByGoogleID map[string]*models.SyncMetadata,
	localClientMap map[uuid.UUID]*models.Client,
	result *models.SyncResult,
) error {
	meta, exists := metadataByGoogleID[googleContact.ResourceName]
	if !exists {
		return s.createLocalClient(ctx, userID, userUUID, googleContact, result)
	}

	localClient, exists := localClientMap[meta.ClientID]
	if !exists {
		return s.createLocalClient(ctx, userID, userUUID, googleContact, result)
	}

	if s.needsUpdate(googleContact, localClient) {
		return s.updateLocalClient(ctx, userID, userUUID, googleContact, localClient, meta, result)
	}

	result.Skipped++
	return nil
}

func (s *SyncService) createGoogleContact(
	ctx context.Context,
	userID string,
	userUUID uuid.UUID,
	token *oauth2.Token,
	client *models.Client,
	result *models.SyncResult,
) error {
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
	userUUID uuid.UUID,
	googleContact *models.GoogleContact,
	result *models.SyncResult,
) error {
	client := s.convertGoogleContactToClient(googleContact, userUUID)

	createdClient, err := s.backendService.CreateClient(ctx, userUUID, client)
	if err != nil {
		return err
	}

	now := time.Now()
	meta := &models.SyncMetadata{
		ClientID:           createdClient.ID,
		GoogleContactID:    &googleContact.ResourceName,
		UserID:             userID,
		LastSyncedAt:       &now,
		LastModifiedSource: "google",
		SyncStatus:         "synced",
	}

	if err := s.db.SaveSyncMetadata(ctx, meta); err != nil {
		return err
	}

	result.Created++
	return nil
}

func (s *SyncService) updateLocalClient(
	ctx context.Context,
	userID string,
	userUUID uuid.UUID,
	googleContact *models.GoogleContact,
	localClient *models.Client,
	meta *models.SyncMetadata,
	result *models.SyncResult,
) error {
	updatedClient := s.convertGoogleContactToClient(googleContact, userUUID)
	updatedClient.ID = localClient.ID

	if err := s.backendService.UpdateClient(ctx, userUUID, localClient.ID, updatedClient); err != nil {
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

// ===============================
// HELPERS
// ===============================

func (s *SyncService) getValidToken(ctx context.Context, userID string) (*oauth2.Token, error) {
	oauthToken, err := s.db.GetOAuthToken(ctx, userID)
	if err != nil {
		return nil, err
	}

	if oauthToken == nil {
		return nil, fmt.Errorf("no OAuth token found for user")
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
	userID uuid.UUID,
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