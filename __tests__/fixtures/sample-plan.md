---
created: 2026-03-01 10:00
modified: 2026-03-01 10:00
session_id: test1234
---

# Auth Module Refactoring Plan

## Overview

Refactor `src/auth/login.ts` to use JWT tokens instead of session cookies.

## Steps

1. Replace `express-session` with `jsonwebtoken` in `src/auth/login.ts`
2. Update `src/middleware/auth.ts` to verify JWT from Authorization header
3. Add token refresh endpoint at `src/auth/refresh.ts`
4. Update tests in `__tests__/auth.test.ts`

## Risk

- Breaking change for existing clients using cookie-based auth
- Need migration path for active sessions
