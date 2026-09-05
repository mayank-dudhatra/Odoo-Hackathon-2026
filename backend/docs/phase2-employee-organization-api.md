# PeoplePay360 Phase 2 - Employee + Organization API

Base path: `/api`

## Auth
- `POST /auth/setup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/activate`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `GET /auth/me`
- `POST /auth/password`
- `POST /auth/invitations`
- `POST /auth/invitations/:id/resend`

## Users
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id/disable`
- `PATCH /users/:id/enable`
- `PATCH /users/:id/role`
- `PATCH /users/:id/link-employee`

## Company
- `GET /org/company/me`
- `PUT /org/company/me`

## Departments
- `GET /org/departments`
- `GET /org/departments/:id`
- `POST /org/departments`
- `PATCH /org/departments/:id`
- `PATCH /org/departments/:id/deactivate`

## Positions
- `GET /org/positions`
- `GET /org/positions/:id`
- `POST /org/positions`
- `PATCH /org/positions/:id`
- `PATCH /org/positions/:id/deactivate`

## Employee Types
- `GET /org/employee-types`
- `GET /org/employee-types/:id`
- `POST /org/employee-types`
- `PATCH /org/employee-types/:id`
- `PATCH /org/employee-types/:id/status`

## Employees
- `GET /org/employees`
- `GET /org/employees/me`
- `GET /org/employees/:id`
- `POST /org/employees`
- `PATCH /org/employees/:id`
- `PATCH /org/employees/:id/status`

## Security rules
- Company scope is derived from the authenticated user only.
- All queries are restricted to `company_id` from the token/session.
- Employee self-access is enforced for own-scoped reads.
- Permission checks are enforced on the backend before business logic runs.
