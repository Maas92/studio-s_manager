package models

import (
	"time"
)

// OAuthToken stores encrypted Google OAuth tokens
type OAuthToken struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	AccessToken  string    `json:"access_token"`   // Encrypted
	RefreshToken string    `json:"refresh_token"`  // Encrypted
	TokenType    string    `json:"token_type"`
	Expiry       time.Time `json:"expiry"`
	Scopes       []string  `json:"scopes"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Client represents a client from your backend
type Client struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Email       *string    `json:"email"`
	Phone       string     `json:"phone"`
	WhatsApp    *string    `json:"whatsapp"`
	DateOfBirth *time.Time `json:"date_of_birth"`
	Address     *string    `json:"address"`
	Notes       *string    `json:"notes"`
	UserID      string     `json:"user_id"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// SyncMetadata tracks sync state for each client
type SyncMetadata struct {
	ID                 string                 `json:"id"`
	ClientID           string                 `json:"client_id"`
	GoogleContactID    *string                `json:"google_contact_id"`
	UserID             string                 `json:"user_id"`
	LastSyncedAt       *time.Time             `json:"last_synced_at"`
	LastModifiedSource string                 `json:"last_modified_source"` // "google" or "local"
	SyncStatus         string                 `json:"sync_status"`          // "synced", "conflict", "pending", "error"
	ConflictData       map[string]interface{} `json:"conflict_data"`
	CreatedAt          time.Time              `json:"created_at"`
	UpdatedAt          time.Time              `json:"updated_at"`
}

// GoogleContact represents a contact from Google People API
type GoogleContact struct {
	ResourceName string
	Names        []Name
	EmailAddresses []Email
	PhoneNumbers []Phone
	Addresses    []Address
	Birthdays    []Birthday
	Biographies  []Biography
	ETag         string
}

type Name struct {
	DisplayName string
	GivenName   string
	FamilyName  string
}

type Email struct {
	Value string
	Type  string
}

type Phone struct {
	Value string
	Type  string
}

type Address struct {
	FormattedValue string
	Type           string
}

type Birthday struct {
	Date Date
}

type Date struct {
	Year  int
	Month int
	Day   int
}

type Biography struct {
	Value string
}

// SyncResult represents the outcome of a sync operation
type SyncResult struct {
	TotalProcessed int                `json:"total_processed"`
	Created        int                `json:"created"`
	Updated        int                `json:"updated"`
	Skipped        int                `json:"skipped"`
	Errors         int                `json:"errors"`
	Conflicts      []ConflictItem     `json:"conflicts"`
	Duration       time.Duration      `json:"duration"`
	StartedAt      time.Time          `json:"started_at"`
	CompletedAt    time.Time          `json:"completed_at"`
}

type ConflictItem struct {
	ClientID        string                 `json:"client_id"`
	GoogleContactID string                 `json:"google_contact_id"`
	LocalData       map[string]interface{} `json:"local_data"`
	GoogleData      map[string]interface{} `json:"google_data"`
	ConflictFields  []string               `json:"conflict_fields"`
}

// UserContext extracted from gateway headers
type UserContext struct {
	UserID string
	Email  string
	Role   string
}