# BFF Architecture

## Overview

This ERP frontend uses an SPA + BFF architecture.

- Angular renders the authenticated UI.
- The BFF handles sessions, cookies, and API mediation.
- Backend services own authentication, tokens, and business logic.

SSR is not required for the ERP application because the content is private and not SEO-driven.

## Request Flow

1. The browser sends requests to the BFF.
2. The BFF reads the session from secure HttpOnly cookies.
3. The BFF forwards requests to backend APIs.
4. The BFF returns normalized responses to the frontend.

## Responsibilities

### Frontend

- Render UI
- Read language preference from cookie
- Call BFF endpoints to change language or other preferences
- Never store access or refresh tokens in browser storage

### BFF

- Login and logout
- Session and cookie management
- Proxy and aggregate backend APIs
- Refresh tokens when needed
- Apply security and transport rules

### Backend

- Validate credentials
- Issue and revoke tokens
- Enforce domain rules
- Expose business APIs

## Security Rules

- Use HttpOnly cookies for authentication state.
- Do not attach bearer tokens from the frontend.
- Store language preference in a cookie (name: `erp_app_language`) managed by BFF.
- Handle unauthorized responses centrally.

## Frontend Implications

- Components must call feature or core services, not backend APIs directly.
- Services should target BFF routes.
- Interceptors may handle errors, but not manual token injection.

## Typical Endpoints

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/user/language` - Set user language preference (stores in cookie)
- `GET /api/...` for ERP domain data through the BFF

## Summary

The frontend is responsible for UI and user interaction. The BFF is the only authentication-aware boundary between the browser and backend services.
