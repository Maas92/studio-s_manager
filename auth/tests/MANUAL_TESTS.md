# Manual Testing Checklist

## Authentication Flow

- [ ] User can signup with valid credentials
- [ ] User receives access token and refresh token cookie
- [ ] User can login with correct credentials
- [ ] User cannot login with wrong password
- [ ] User cannot login with non-existent email
- [ ] Access token expires after configured time
- [ ] Refresh token can be used to get new access token
- [ ] Old refresh token is invalidated after use
- [ ] User can logout successfully
- [ ] Refresh token is cleared after logout

## Password Management

- [ ] User can change password with correct current password
- [ ] User cannot change password with wrong current password
- [ ] All sessions are invalidated after password change
- [ ] User can request password reset
- [ ] Reset token expires after configured time
- [ ] User can reset password with valid token
- [ ] Reset token cannot be reused
- [ ] Password must meet complexity requirements

## Authorization

- [ ] Protected endpoints reject requests without token
- [ ] Protected endpoints reject requests with invalid token
- [ ] Protected endpoints reject requests with expired token
- [ ] Role-based access control works correctly
- [ ] Admin can access admin-only endpoints
- [ ] Non-admin cannot access admin-only endpoints

## Security

- [ ] NoSQL injection attempts are blocked
- [ ] SQL injection attempts are blocked
- [ ] XSS attempts are sanitized
- [ ] CORS is properly configured
- [ ] Security headers are present (Helmet)
- [ ] Rate limiting works on sensitive endpoints
- [ ] Cookies are HttpOnly
- [ ] Cookies are Secure in production
- [ ] JWT uses RS256 algorithm
- [ ] Passwords are hashed with Argon2id

## Error Handling

- [ ] Appropriate error codes returned (400, 401, 403, 404, 500)
- [ ] Error messages don't leak sensitive information
- [ ] Stack traces not exposed in production
- [ ] Validation errors are clear and helpful
- [ ] Database errors are handled gracefully

## Performance

- [ ] Health check responds quickly (< 100ms)
- [ ] Login responds within acceptable time (< 500ms)
- [ ] Signup responds within acceptable time (< 1s)
- [ ] Token refresh is fast (< 200ms)
- [ ] Database queries are optimized
- [ ] No memory leaks during extended use

## Logging

- [ ] Authentication attempts are logged
- [ ] Failed login attempts are logged
- [ ] Password changes are logged
- [ ] Security events are logged
- [ ] Sensitive data (passwords, tokens) not logged
- [ ] Log levels work correctly (debug, info, warn, error)

## Edge Cases

- [ ] Empty request body handled
- [ ] Malformed JSON handled
- [ ] Very long inputs handled
- [ ] Special characters in inputs handled
- [ ] Unicode characters handled
- [ ] Concurrent requests handled
- [ ] Database connection loss handled
- [ ] Network timeouts handled
