package errors

type HTTPError struct {
	Status  int
	Message string
}

func (e *HTTPError) Error() string {
	return e.Message
}

func NewHTTPError(status int, message string) error {
	return &HTTPError{
		Status:  status,
		Message: message,
	}
}
