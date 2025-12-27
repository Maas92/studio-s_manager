package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"golang.org/x/oauth2"

	"github.com/yourusername/google-contacts-service/internal/config"
	"github.com/yourusername/google-contacts-service/internal/crypto"
	"github.com/yourusername/google-contacts-service/internal/database"
	"github.com/yourusername/google-contacts-service/internal/models"
)

type SyncService struct {
	db             *database.Postgres
	googleService  *GoogleService
	backendService *BackendService
	encryptor      *crypto.Encryptor
	logger         *zap.Logger
}

func NewSyncService(db *database.Postgres, googleService *GoogleService, backendService *BackendService, logger *zap.Logger, cfg *config.Config) *SyncService {
	// Create encryptor for token decryption
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

// PerformSync executes bidirectional sync between Google Contacts and local clients
func (s *SyncService) PerformSync(ctx context.Context, userID uuid.UUID) (*models.SyncResult, error) {
	startTime := time.Now()
	result := &models.SyncResult{
		StartedAt:  startTime,
		Conflicts:  []models.ConflictItem{},
	}

	s.logger.Info("Starting sync",
		zap.String("user_id", userID.String()),
	)

	// 1. Get and validate OAuth token
	token, err := s.getValidToken(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get valid token: %w", err)
	}

	// 2. Fetch data from both sources
	googleContacts, err := s.googleService.FetchContacts(ctx, token)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch Google contacts: %w", err)
	}

	localClients, err := s.backendService.GetClients(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch local clients: %w", err)
	}

	s.logger.Info("Fetched data from both sources",
		zap.Int("google_contacts", len(googleContacts)),
		zap.Int("local_clients", len(localClients)),
	)

	// 3. Get existing sync metadata
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

	googleContactMap := make(map[string]*models.GoogleContact)
	for i := range googleContacts {
		contact := &googleContacts[i]
		googleContactMap[contact.ResourceName] = contact
	}

	// 4. Process sync in three phases
	result.TotalProcessed = len(googleContacts) + len(localClients)

	// Phase 1: Process Google contacts
	for _, googleContact := range googleContacts {
		if err := s.processGoogleContact(ctx, userID, token, &googleContact, metadataByGoogleID, localClientMap, result); err != nil {
			s.logger.Error("Failed to process Google contact",
				zap.String("resource_name", googleContact.ResourceName),
				zap.Error(err),
			)
			result.Errors++
		}
	}

	// Phase 2: Process local clients that aren't in Google yet
	for _, localClient := range localClients {
		meta, exists := metadataByClientID[localClient.ID]
		if !exists || meta.GoogleContactID == nil {
			// Client not synced to Google yet
			if err := s.createGoogleContact(ctx, userID, token, &localClient, result); err != nil {
				s.logger.Error("Failed to create Google contact",
					zap.String("client_id", localClient.ID.String()),
					zap.Error(err),
				)
				result.Errors++
			}
		}
	}

	// Phase 3: Handle deletions (contacts in Google but not in local)
	// This is optional - you might want to keep Google contacts even if deleted locally
	// Uncomment if you want to delete from Google when deleted locally
	/*
	for googleID, meta := range metadataByGoogleID {
		if _, exists := localClientMap[meta.ClientID]; !exists {
			// Client was deleted locally, delete from Google
			if err := s.googleService.DeleteContact(ctx, token, googleID); err != nil {
				s.logger.Error("Failed to delete Google contact", zap.Error(err))
				result.Errors++
			} else {
				s.db.DeleteSyncMetadata(ctx, meta.ClientID, userID)
			}
		}
	}
	*/

	result.CompletedAt = time.Now()
	result.Duration = result.CompletedAt.Sub(result.StartedAt)

	s.logger.Info("Sync completed",
		zap.String("user_id", userID.String()),
		zap.Duration("duration", result.Duration),
		zap.Int("created", result.Created),
		zap.Int("updated", result.Updated),
		zap.Int("skipped", result.Skipped),
		zap.Int("errors", result.Errors),
		zap.Int("conflicts", len(result.Conflicts)),
	)

	return result, nil
}

// processGoogleContact handles syncing a Google contact to local
func (s *SyncService) processGoogleContact(
	ctx context.Context,
	userID uuid.UUID,
	token *oauth2.Token,
	googleContact *models.GoogleContact,
	metadataByGoogleID map[string]*models.SyncMetadata,
	localClientMap map[uuid.UUID]*models.Client,
	result *models.SyncResult,
) error {
	meta, exists := metadataByGoogleID[googleContact.ResourceName]

	if !exists {
		// New contact from Google, create in local
		return s.createLocalClient(ctx, userID, googleContact, result)
	}

	// Contact exists, check if update needed
	localClient, localExists := localClientMap[meta.ClientID]
	if !localExists {
		// Metadata exists but client was deleted locally
		// Recreate the client
		return s.createLocalClient(ctx, userID, googleContact, result)
	}

	// Check for conflicts or updates
	if s.needsUpdate(googleContact, localClient, meta) {
		return s.updateLocalClient(ctx, userID, googleContact, localClient, meta, result)
	}

	result.Skipped++
	return nil
}

// createGoogleContact creates a new contact in Google from local client
func (s *SyncService) createGoogleContact(
	ctx context.Context,
	userID uuid.UUID,
	token *oauth2.Token,
	client *models.Client,
	result *models.SyncResult,
) error {
	resourceName, err := s.googleService.CreateContact(ctx, token, client)
	if err != nil {
		return err
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

	result.Created++
	return nil
}

// createLocalClient creates a new client locally from Google contact
func (s *SyncService) createLocalClient(
	ctx context.Context,
	userID uuid.UUID,
	googleContact *models.GoogleContact,
	result *models.SyncResult,
) error {
	client := s.convertGoogleContactToClient(googleContact, userID)

	createdClient, err := s.backendService.CreateClient(ctx, userID, client)
	if err != nil {
		return err
	}

	// Save sync metadata
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

// updateLocalClient updates local client from Google contact
func (s *SyncService) updateLocalClient(
	ctx context.Context,
	userID uuid.UUID,
	googleContact *models.GoogleContact,
	localClient *models.Client,
	meta *models.SyncMetadata,
	result *models.SyncResult,
) error {
	// Check for conflicts (both modified since last sync)
	if meta.LastModifiedSource == "local" && s.wasModifiedRecently(localClient.UpdatedAt, meta.LastSyncedAt) {
		// Conflict: both sides modified
		conflict := models.ConflictItem{
			ClientID:        localClient.ID,
			GoogleContactID: googleContact.ResourceName,
			LocalData:       s.clientToMap(localClient),
			GoogleData:      s.googleContactToMap(googleContact),
			ConflictFields:  s.detectConflictFields(googleContact, localClient),
		}
		result.Conflicts = append(result.Conflicts, conflict)

		// Mark as conflict in metadata
		meta.SyncStatus = "conflict"
		meta.ConflictData = map[string]interface{}{
			"local":  s.clientToMap(localClient),
			"google": s.googleContactToMap(googleContact),
		}
		s.db.SaveSyncMetadata(ctx, meta)

		return nil
	}

	// No conflict, update local from Google
	updatedClient := s.convertGoogleContactToClient(googleContact, userID)
	updatedClient.ID = localClient.ID // Keep same ID

	if err := s.backendService.UpdateClient(ctx, userID, localClient.ID, updatedClient); err != nil {
		return err
	}

	// Update metadata
	now := time.Now()
	meta.LastSyncedAt = &now
	meta.LastModifiedSource = "google"
	meta.SyncStatus = "synced"
	meta.ConflictData = nil

	if err := s.db.SaveSyncMetadata(ctx, meta); err != nil {
		return err
	}

	result.Updated++
	return nil
}

// Helper functions

func (s *SyncService) getValidToken(ctx context.Context, userID uuid.UUID) (*oauth2.Token, error) {
	oauthToken, err := s.db.GetOAuthToken(ctx, userID)
	if err != nil {
		return nil, err
	}
	if oauthToken == nil {
		return nil, fmt.Errorf("no OAuth token found for user")
	}

	// Decrypt tokens
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

	// Refresh if expired
	if time.Now().After(token.Expiry) {
		newToken, err := s.googleService.RefreshToken(ctx, token.RefreshToken)
		if err != nil {
			return nil, fmt.Errorf("failed to refresh token: %w", err)
		}

		// Update stored token
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

func (s *SyncService) convertGoogleContactToClient(googleContact *models.GoogleContact, userID uuid.UUID) *models.Client {
	client := &models.Client{
		UserID: userID,
		Name:   "Unknown",
	}

	// Name
	if len(googleContact.Names) > 0 {
		client.Name = googleContact.Names[0].DisplayName
	}

	// Email
	if len(googleContact.EmailAddresses) > 0 {
		email := googleContact.EmailAddresses[0].Value
		client.Email = &email
	}

	// Phone
	if len(googleContact.PhoneNumbers) > 0 {
		client.Phone = googleContact.PhoneNumbers[0].Value
	}

	// Address
	if len(googleContact.Addresses) > 0 {
		addr := googleContact.Addresses[0].FormattedValue
		client.Address = &addr
	}

	// Birthday
	if len(googleContact.Birthdays) > 0 {
		date := googleContact.Birthdays[0].Date
		if date.Year > 0 {
			dob := time.Date(date.Year, time.Month(date.Month), date.Day, 0, 0, 0, 0, time.UTC)
			client.DateOfBirth = &dob
		}
	}

	// Notes
	if len(googleContact.Biographies) > 0 {
		notes := googleContact.Biographies[0].Value
		client.Notes = &notes
	}

	return client
}

func (s *SyncService) needsUpdate(googleContact *models.GoogleContact, localClient *models.Client, meta *models.SyncMetadata) bool {
	// Simple heuristic: check if name or phone differs
	googleName := ""
	if len(googleContact.Names) > 0 {
		googleName = googleContact.Names[0].DisplayName
	}

	googlePhone := ""
	if len(googleContact.PhoneNumbers) > 0 {
		googlePhone = googleContact.PhoneNumbers[0].Value
	}

	return googleName != localClient.Name || googlePhone != localClient.Phone
}

func (s *SyncService) wasModifiedRecently(updatedAt time.Time, lastSyncedAt *time.Time) bool {
	if lastSyncedAt == nil {
		return false
	}
	return updatedAt.After(*lastSyncedAt)
}

func (s *SyncService) detectConflictFields(googleContact *models.GoogleContact, localClient *models.Client) []string {
	var conflicts []string

	googleName := ""
	if len(googleContact.Names) > 0 {
		googleName = googleContact.Names[0].DisplayName
	}
	if googleName != localClient.Name {
		conflicts = append(conflicts, "name")
	}

	googlePhone := ""
	if len(googleContact.PhoneNumbers) > 0 {
		googlePhone = googleContact.PhoneNumbers[0].Value
	}
	if googlePhone != localClient.Phone {
		conflicts = append(conflicts, "phone")
	}

	return conflicts
}

func (s *SyncService) clientToMap(client *models.Client) map[string]interface{} {
	m := map[string]interface{}{
		"id":    client.ID.String(),
		"name":  client.Name,
		"phone": client.Phone,
	}
	if client.Email != nil {
		m["email"] = *client.Email
	}
	return m
}

func (s *SyncService) googleContactToMap(contact *models.GoogleContact) map[string]interface{} {
	m := map[string]interface{}{
		"resource_name": contact.ResourceName,
	}
	if len(contact.Names) > 0 {
		m["name"] = contact.Names[0].DisplayName
	}
	if len(contact.PhoneNumbers) > 0 {
		m["phone"] = contact.PhoneNumbers[0].Value
	}
	return m
}