package services

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/option"
	"google.golang.org/api/people/v1"

	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/config"
	"github.com/Maas92/studio-s_manager/tree/main/google-contacts-service/internal/models"
)

type GoogleService struct {
	config       *config.Config
	oauthConfig  *oauth2.Config
	logger       *zap.Logger
}

func NewGoogleService(cfg *config.Config, logger *zap.Logger) *GoogleService {
	oauthConfig := &oauth2.Config{
		ClientID:     cfg.GoogleClientID,
		ClientSecret: cfg.GoogleClientSecret,
		RedirectURL:  cfg.GoogleRedirectURL,
		Scopes: []string{
			"https://www.googleapis.com/auth/contacts",
			"https://www.googleapis.com/auth/userinfo.email",
		},
		Endpoint: google.Endpoint,
	}

	return &GoogleService{
		config:      cfg,
		oauthConfig: oauthConfig,
		logger:      logger,
	}
}

// GetAuthURL generates the OAuth authorization URL
func (s *GoogleService) GetAuthURL(state string) string {
	return s.oauthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.ApprovalForce)
}

// ExchangeCode exchanges authorization code for tokens
func (s *GoogleService) ExchangeCode(ctx context.Context, code string) (*oauth2.Token, error) {
	token, err := s.oauthConfig.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code: %w", err)
	}

	s.logger.Info("Successfully exchanged OAuth code for tokens",
		zap.Time("expiry", token.Expiry),
	)

	return token, nil
}

// RefreshToken refreshes an expired access token
func (s *GoogleService) RefreshToken(ctx context.Context, refreshToken string) (*oauth2.Token, error) {
	token := &oauth2.Token{
		RefreshToken: refreshToken,
		Expiry:       time.Now().Add(-time.Hour), // Force refresh
	}

	tokenSource := s.oauthConfig.TokenSource(ctx, token)
	newToken, err := tokenSource.Token()
	if err != nil {
		return nil, fmt.Errorf("failed to refresh token: %w", err)
	}

	s.logger.Info("Successfully refreshed OAuth token",
		zap.Time("new_expiry", newToken.Expiry),
	)

	return newToken, nil
}

// GetPeopleService creates an authenticated Google People API client
func (s *GoogleService) GetPeopleService(ctx context.Context, token *oauth2.Token) (*people.Service, error) {
	client := s.oauthConfig.Client(ctx, token)

	service, err := people.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		return nil, fmt.Errorf("failed to create people service: %w", err)
	}

	return service, nil
}

// FetchContacts retrieves all contacts from Google
func (s *GoogleService) FetchContacts(ctx context.Context, token *oauth2.Token) ([]models.GoogleContact, error) {
	service, err := s.GetPeopleService(ctx, token)
	if err != nil {
		return nil, err
	}

	var allContacts []models.GoogleContact
	pageToken := ""

	for {
		call := service.People.Connections.List("people/me").
			PersonFields("names,emailAddresses,phoneNumbers,addresses,birthdays,biographies").
			PageSize(1000)

		if pageToken != "" {
			call = call.PageToken(pageToken)
		}

		resp, err := call.Do()
		if err != nil {
			return nil, fmt.Errorf("failed to fetch contacts: %w", err)
		}

		// Convert to our model
		for _, person := range resp.Connections {
			contact := s.convertToGoogleContact(person)
			allContacts = append(allContacts, contact)
		}

		pageToken = resp.NextPageToken
		if pageToken == "" {
			break
		}
	}

	s.logger.Info("Fetched contacts from Google",
		zap.Int("count", len(allContacts)),
	)

	return allContacts, nil
}

// CreateContact creates a new contact in Google
func (s *GoogleService) CreateContact(ctx context.Context, token *oauth2.Token, contact *models.Client) (string, error) {
	service, err := s.GetPeopleService(ctx, token)
	if err != nil {
		return "", err
	}

	person := s.convertClientToPerson(contact)

	created, err := service.People.CreateContact(person).Do()
	if err != nil {
		return "", fmt.Errorf("failed to create contact: %w", err)
	}

	s.logger.Info("Created contact in Google",
		zap.String("resource_name", created.ResourceName),
		zap.String("client_name", contact.Name),
	)

	return created.ResourceName, nil
}

// UpdateContact updates an existing contact in Google
func (s *GoogleService) UpdateContact(ctx context.Context, token *oauth2.Token, resourceName string, contact *models.Client) error {
	service, err := s.GetPeopleService(ctx, token)
	if err != nil {
		return err
	}

	person := s.convertClientToPerson(contact)

	_, err = service.People.UpdateContact(resourceName, person).
		UpdatePersonFields("names,emailAddresses,phoneNumbers,addresses,birthdays,biographies").
		Do()

	if err != nil {
		return fmt.Errorf("failed to update contact: %w", err)
	}

	s.logger.Info("Updated contact in Google",
		zap.String("resource_name", resourceName),
		zap.String("client_name", contact.Name),
	)

	return nil
}

// DeleteContact deletes a contact from Google
func (s *GoogleService) DeleteContact(ctx context.Context, token *oauth2.Token, resourceName string) error {
	service, err := s.GetPeopleService(ctx, token)
	if err != nil {
		return err
	}

	_, err = service.People.DeleteContact(resourceName).Do()
	if err != nil {
		return fmt.Errorf("failed to delete contact: %w", err)
	}

	s.logger.Info("Deleted contact from Google",
		zap.String("resource_name", resourceName),
	)

	return nil
}

// Helper functions

func (s *GoogleService) convertToGoogleContact(person *people.Person) models.GoogleContact {
	contact := models.GoogleContact{
		ResourceName: person.ResourceName,
		ETag:         person.Etag,
	}

	// Names
	if len(person.Names) > 0 {
		for _, name := range person.Names {
			contact.Names = append(contact.Names, models.Name{
				DisplayName: name.DisplayName,
				GivenName:   name.GivenName,
				FamilyName:  name.FamilyName,
			})
		}
	}

	// Emails
	if len(person.EmailAddresses) > 0 {
		for _, email := range person.EmailAddresses {
			contact.EmailAddresses = append(contact.EmailAddresses, models.Email{
				Value: email.Value,
				Type:  email.Type,
			})
		}
	}

	// Phones
	if len(person.PhoneNumbers) > 0 {
		for _, phone := range person.PhoneNumbers {
			contact.PhoneNumbers = append(contact.PhoneNumbers, models.Phone{
				Value: phone.Value,
				Type:  phone.Type,
			})
		}
	}

	// Addresses
	if len(person.Addresses) > 0 {
		for _, addr := range person.Addresses {
			contact.Addresses = append(contact.Addresses, models.Address{
				FormattedValue: addr.FormattedValue,
				Type:           addr.Type,
			})
		}
	}

	// Birthdays
	if len(person.Birthdays) > 0 {
		for _, birthday := range person.Birthdays {
			if birthday.Date != nil {
				contact.Birthdays = append(contact.Birthdays, models.Birthday{
					Date: models.Date{
						Year:  int(birthday.Date.Year),
						Month: int(birthday.Date.Month),
						Day:   int(birthday.Date.Day),
					},
				})
			}
		}
	}

	// Biographies
	if len(person.Biographies) > 0 {
		for _, bio := range person.Biographies {
			contact.Biographies = append(contact.Biographies, models.Biography{
				Value: bio.Value,
			})
		}
	}

	return contact
}

func (s *GoogleService) convertClientToPerson(client *models.Client) *people.Person {
	person := &people.Person{
		Names: []*people.Name{
			{
				DisplayName: client.Name,
			},
		},
	}

	// Email
	if client.Email != nil && *client.Email != "" {
		person.EmailAddresses = []*people.EmailAddress{
			{
				Value: *client.Email,
				Type:  "home",
			},
		}
	}

	// Phone
	if client.Phone != "" {
		person.PhoneNumbers = []*people.PhoneNumber{
			{
				Value: client.Phone,
				Type:  "mobile",
			},
		}
	}

	// WhatsApp (as additional phone)
	if client.WhatsApp != nil && *client.WhatsApp != "" {
		person.PhoneNumbers = append(person.PhoneNumbers, &people.PhoneNumber{
			Value: *client.WhatsApp,
			Type:  "other",
		})
	}

	// Address
	if client.Address != nil && *client.Address != "" {
		person.Addresses = []*people.Address{
			{
				FormattedValue: *client.Address,
				Type:           "home",
			},
		}
	}

	// Birthday
	if client.DateOfBirth != nil {
		person.Birthdays = []*people.Birthday{
			{
				Date: &people.Date{
					Year:  int64(client.DateOfBirth.Year()),
					Month: int64(client.DateOfBirth.Month()),
					Day:   int64(client.DateOfBirth.Day()),
				},
			},
		}
	}

	// Notes
	if client.Notes != nil && *client.Notes != "" {
		person.Biographies = []*people.Biography{
			{
				Value: *client.Notes,
			},
		}
	}

	return person
}

// GetContactChanges fetches only contacts that changed since last sync
func (s *GoogleService) GetContactChanges(ctx context.Context, token *oauth2.Token, syncToken string) ([]models.GoogleContact, string, error) {
	service, err := s.GetPeopleService(ctx, token)
	if err != nil {
		return nil, "", fmt.Errorf("failed to get people service: %w", err)
	}

	call := service.People.Connections.List("people/me").
		PersonFields("names,emailAddresses,phoneNumbers,addresses,birthdays,biographies").
		PageSize(1000)

	// If we have a sync token, use it to get only changes
	if syncToken != "" {
		call = call.SyncToken(syncToken)
	}

	var allContacts []models.GoogleContact
	var newSyncToken string

	for {
		resp, err := call.Do()
		if err != nil {
			return nil, "", fmt.Errorf("failed to fetch contacts: %w", err)
		}

		// Convert contacts
		for _, person := range resp.Connections {
			contact := s.convertToGoogleContact(person)
			allContacts = append(allContacts, contact)
		}

		// Save the new sync token for next time
		if resp.NextSyncToken != "" {
			newSyncToken = resp.NextSyncToken
		}
		
		// Check if there are more pages
		if resp.NextPageToken == "" {
			break
		}
		call = call.PageToken(resp.NextPageToken)
	}

	s.logger.Info("Fetched contact changes",
		zap.Int("count", len(allContacts)),
		zap.String("new_sync_token", newSyncToken),
	)

	return allContacts, newSyncToken, nil
}