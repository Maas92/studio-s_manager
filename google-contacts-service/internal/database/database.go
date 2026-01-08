package database

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/models"
)

type Postgres struct {
	pool *pgxpool.Pool
}

func NewPostgres(connectionString string) (*Postgres, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	config, err := pgxpool.ParseConfig(connectionString)
	if err != nil {
		return nil, fmt.Errorf("failed to parse connection string: %w", err)
	}

	// Configure connection pool
	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = 5 * time.Minute
	config.MaxConnIdleTime = 1 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Test connection
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &Postgres{pool: pool}, nil
}

func (p *Postgres) Close() {
	p.pool.Close()
}

func (p *Postgres) Ping(ctx context.Context) error {
	return p.pool.Ping(ctx)
}

// OAuth Token operations

func (p *Postgres) SaveOAuthToken(ctx context.Context, token *models.OAuthToken) error {
	query := `
		INSERT INTO oauth_tokens (user_id, access_token, refresh_token, token_type, expiry, scopes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		ON CONFLICT (user_id) 
		DO UPDATE SET 
			access_token = EXCLUDED.access_token,
			refresh_token = EXCLUDED.refresh_token,
			token_type = EXCLUDED.token_type,
			expiry = EXCLUDED.expiry,
			scopes = EXCLUDED.scopes,
			updated_at = NOW()
	`

	_, err := p.pool.Exec(ctx, query,
		token.UserID,        // STRING - MongoDB ObjectId
		token.AccessToken,
		token.RefreshToken,
		token.TokenType,
		token.Expiry,
		token.Scopes,
	)

	if err != nil {
		return fmt.Errorf("failed to save oauth token: %w", err)
	}

	return nil
}

func (p *Postgres) GetOAuthToken(ctx context.Context, userID string) (*models.OAuthToken, error) {
	query := `
		SELECT id, user_id, access_token, refresh_token, token_type, expiry, scopes, created_at, updated_at
		FROM oauth_tokens
		WHERE user_id = $1
	`

	var token models.OAuthToken

	err := p.pool.QueryRow(ctx, query, userID).Scan(
		&token.ID, 
		&token.UserID, 
		&token.AccessToken, 
		&token.RefreshToken,
		&token.TokenType, 
		&token.Expiry, 
		&token.Scopes,  // Scan directly into []string
		&token.CreatedAt, 
		&token.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get oauth token: %w", err)
	}

	return &token, nil
}

func (p *Postgres) DeleteOAuthToken(ctx context.Context, userID string) error {
	query := `DELETE FROM oauth_tokens WHERE user_id = $1`

	result, err := p.pool.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to delete oauth token: %w", err)
	}

	if result.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}

	return nil
}

// OAuth State operations (for CSRF protection)

func (p *Postgres) SaveOAuthState(ctx context.Context, state, userID string, expiresAt time.Time) (bool, error) {
	query := `
		INSERT INTO oauth_state (state, user_id, expires_at, created_at)
		VALUES ($1, $2, $3, NOW())
	`

	_, err := p.pool.Exec(ctx, query, state, userID, expiresAt)
	if err != nil {
		return false, fmt.Errorf("failed to save oauth state: %w", err)
	}

	return true, nil
}

func (p *Postgres) GetAndDeleteOAuthState(ctx context.Context, state string) (string, error) {
	// Use a transaction to get and delete atomically
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Get state
	var userID string
	var expiresAt time.Time
	query := `SELECT user_id, expires_at FROM oauth_state WHERE state = $1`
	
	err = tx.QueryRow(ctx, query, state).Scan(&userID, &expiresAt)
	if err == pgx.ErrNoRows {
		return "", fmt.Errorf("state not found")
	}
	if err != nil {
		return "", fmt.Errorf("failed to get oauth state: %w", err)
	}

	// Check if expired
	if time.Now().After(expiresAt) {
		// Delete expired state
		tx.Exec(ctx, `DELETE FROM oauth_state WHERE state = $1`, state)
		tx.Commit(ctx)
		return "", fmt.Errorf("state expired")
	}

	// Delete state
	_, err = tx.Exec(ctx, `DELETE FROM oauth_state WHERE state = $1`, state)
	if err != nil {
		return "", fmt.Errorf("failed to delete oauth state: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return "", fmt.Errorf("failed to commit transaction: %w", err)
	}

	return userID, nil
}

// Sync Metadata operations

func (p *Postgres) SaveSyncMetadata(ctx context.Context, meta *models.SyncMetadata) error {
	query := `
		INSERT INTO sync_metadata 
		(client_id, google_contact_id, user_id, last_synced_at, last_modified_source, sync_status, conflict_data, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
		ON CONFLICT (client_id, user_id)
		DO UPDATE SET
			google_contact_id = EXCLUDED.google_contact_id,
			last_synced_at = EXCLUDED.last_synced_at,
			last_modified_source = EXCLUDED.last_modified_source,
			sync_status = EXCLUDED.sync_status,
			conflict_data = EXCLUDED.conflict_data,
			updated_at = NOW()
	`

	conflictJSON, err := json.Marshal(meta.ConflictData)
	if err != nil {
		return fmt.Errorf("failed to marshal conflict data: %w", err)
	}

	_, err = p.pool.Exec(ctx, query,
		meta.ClientID,
		meta.GoogleContactID,
		meta.UserID,           // STRING - MongoDB ObjectId
		meta.LastSyncedAt,
		meta.LastModifiedSource,
		meta.SyncStatus,
		conflictJSON,
	)

	if err != nil {
		return fmt.Errorf("failed to save sync metadata: %w", err)
	}

	return nil
}

func (p *Postgres) GetSyncMetadata(ctx context.Context, clientID, userID string) (*models.SyncMetadata, error) {
	query := `
		SELECT id, client_id, google_contact_id, user_id, last_synced_at, 
		       last_modified_source, sync_status, conflict_data, created_at, updated_at
		FROM sync_metadata
		WHERE client_id = $1 AND user_id = $2
	`

	var meta models.SyncMetadata
	var conflictJSON []byte

	err := p.pool.QueryRow(ctx, query, clientID, userID).Scan(
		&meta.ID, &meta.ClientID, &meta.GoogleContactID, &meta.UserID,
		&meta.LastSyncedAt, &meta.LastModifiedSource, &meta.SyncStatus,
		&conflictJSON, &meta.CreatedAt, &meta.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get sync metadata: %w", err)
	}

	// Parse conflict data
	if len(conflictJSON) > 0 && string(conflictJSON) != "null" {
		if err := json.Unmarshal(conflictJSON, &meta.ConflictData); err != nil {
			return nil, fmt.Errorf("failed to parse conflict data: %w", err)
		}
	}

	return &meta, nil
}

func (p *Postgres) GetAllSyncMetadata(ctx context.Context, userID string) ([]models.SyncMetadata, error) {
	query := `
		SELECT id, client_id, google_contact_id, user_id, last_synced_at,
		       last_modified_source, sync_status, conflict_data, created_at, updated_at
		FROM sync_metadata
		WHERE user_id = $1
		ORDER BY updated_at DESC
	`

	rows, err := p.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query sync metadata: %w", err)
	}
	defer rows.Close()

	var metadataList []models.SyncMetadata
	for rows.Next() {
		var meta models.SyncMetadata
		var conflictJSON []byte

		err := rows.Scan(
			&meta.ID, &meta.ClientID, &meta.GoogleContactID, &meta.UserID,
			&meta.LastSyncedAt, &meta.LastModifiedSource, &meta.SyncStatus,
			&conflictJSON, &meta.CreatedAt, &meta.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan sync metadata: %w", err)
		}

		// Parse conflict data
		if len(conflictJSON) > 0 && string(conflictJSON) != "null" {
			if err := json.Unmarshal(conflictJSON, &meta.ConflictData); err != nil {
				return nil, fmt.Errorf("failed to parse conflict data: %w", err)
			}
		}

		metadataList = append(metadataList, meta)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating sync metadata: %w", err)
	}

	return metadataList, nil
}

func (p *Postgres) DeleteSyncMetadata(ctx context.Context, clientID, userID string) error {
	query := `DELETE FROM sync_metadata WHERE client_id = $1 AND user_id = $2`

	_, err := p.pool.Exec(ctx, query, clientID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete sync metadata: %w", err)
	}

	return nil
}

// SaveSyncToken stores the sync token for incremental changes
func (p *Postgres) SaveSyncToken(ctx context.Context, userID, syncToken string) error {
	query := `
		INSERT INTO sync_tokens (user_id, sync_token, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (user_id)
		DO UPDATE SET sync_token = EXCLUDED.sync_token, updated_at = NOW()
	`
	
	_, err := p.pool.Exec(ctx, query, userID, syncToken)
	if err != nil {
		return fmt.Errorf("failed to save sync token: %w", err)
	}
	
	return nil
}

// GetSyncToken retrieves the sync token for a user
func (p *Postgres) GetSyncToken(ctx context.Context, userID string) (string, error) {
	query := `SELECT sync_token FROM sync_tokens WHERE user_id = $1`
	
	var syncToken string
	err := p.pool.QueryRow(ctx, query, userID).Scan(&syncToken)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", nil // No token yet, first sync
		}
		return "", fmt.Errorf("failed to get sync token: %w", err)
	}
	
	return syncToken, nil
}