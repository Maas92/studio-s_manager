package crypto

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"os"
	"sync"
	"time"

	"go.uber.org/zap"
)

// CertManager handles automatic certificate loading and rotation
type CertManager struct {
	certFile string
	keyFile  string
	caFile   string
	logger   *zap.Logger

	mu          sync.RWMutex
	certificate *tls.Certificate
	caCertPool  *x509.CertPool
	lastLoaded  time.Time
}

// NewCertManager creates a new certificate manager with auto-rotation
func NewCertManager(certFile, keyFile, caFile string, logger *zap.Logger) (*CertManager, error) {
	cm := &CertManager{
		certFile: certFile,
		keyFile:  keyFile,
		caFile:   caFile,
		logger:   logger,
	}

	// Initial load
	if err := cm.loadCertificates(); err != nil {
		return nil, fmt.Errorf("failed to load certificates: %w", err)
	}

	// Start background rotation checker
	go cm.watchCertificates()

	return cm, nil
}

// loadCertificates loads certificates from disk
func (cm *CertManager) loadCertificates() error {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	// Load client certificate and key
	cert, err := tls.LoadX509KeyPair(cm.certFile, cm.keyFile)
	if err != nil {
		return fmt.Errorf("failed to load key pair: %w", err)
	}

	// Parse certificate to check expiry
	if len(cert.Certificate) > 0 {
		x509Cert, err := x509.ParseCertificate(cert.Certificate[0])
		if err == nil {
			daysUntilExpiry := time.Until(x509Cert.NotAfter).Hours() / 24
			cm.logger.Info("Certificate loaded",
				zap.String("subject", x509Cert.Subject.CommonName),
				zap.Time("not_before", x509Cert.NotBefore),
				zap.Time("not_after", x509Cert.NotAfter),
				zap.Float64("days_until_expiry", daysUntilExpiry),
			)

			// Warn if certificate expires soon
			if daysUntilExpiry < 30 {
				cm.logger.Warn("⚠️  Certificate expires soon!",
					zap.Float64("days_until_expiry", daysUntilExpiry),
					zap.String("cert_file", cm.certFile),
				)
			}

			// Error if already expired
			if time.Now().After(x509Cert.NotAfter) {
				cm.logger.Error("❌ Certificate has EXPIRED!",
					zap.Time("expired_at", x509Cert.NotAfter),
				)
				return fmt.Errorf("certificate has expired")
			}
		}
	}

	// Load CA certificate
	caCert, err := os.ReadFile(cm.caFile)
	if err != nil {
		return fmt.Errorf("failed to read CA certificate: %w", err)
	}

	caCertPool := x509.NewCertPool()
	if !caCertPool.AppendCertsFromPEM(caCert) {
		return fmt.Errorf("failed to parse CA certificate")
	}

	cm.certificate = &cert
	cm.caCertPool = caCertPool
	cm.lastLoaded = time.Now()

	cm.logger.Info("✅ Certificates loaded successfully",
		zap.Time("loaded_at", cm.lastLoaded),
	)

	return nil
}

// watchCertificates checks for certificate updates every hour
func (cm *CertManager) watchCertificates() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		cm.logger.Debug("Checking for certificate updates...")

		// Check if files have been modified
		certInfo, err := os.Stat(cm.certFile)
		if err != nil {
			cm.logger.Error("Failed to stat certificate file", zap.Error(err))
			continue
		}

		if certInfo.ModTime().After(cm.lastLoaded) {
			cm.logger.Info("Certificate file updated, reloading...",
				zap.Time("file_modified", certInfo.ModTime()),
			)

			if err := cm.loadCertificates(); err != nil {
				cm.logger.Error("Failed to reload certificates", zap.Error(err))
			} else {
				cm.logger.Info("✅ Certificates reloaded successfully")
			}
		}
	}
}

// GetTLSConfig returns a TLS config with current certificates
func (cm *CertManager) GetTLSConfig() *tls.Config {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	return &tls.Config{
		Certificates: []tls.Certificate{*cm.certificate},
		RootCAs:      cm.caCertPool,
		MinVersion:   tls.VersionTLS12,
	}
}

// GetClientCertificate returns the current client certificate (for dynamic loading)
func (cm *CertManager) GetClientCertificate(info *tls.CertificateRequestInfo) (*tls.Certificate, error) {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	return cm.certificate, nil
}