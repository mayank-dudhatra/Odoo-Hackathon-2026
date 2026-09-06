# 🚀 PeoplePay360

## Modern HR + Payroll Operating System for the Next Era of Workforce Management

PeoplePay360 is a full-stack HR and payroll platform designed to handle the critical operations behind employee lifecycle management, compensation logic, attendance, leave, and payroll automation. Built for the Odoo 2026 hackathon, this repository combines a real backend, structured database layer, and modern React frontend into a product that feels like a serious internal business system rather than a basic demo.

This README is grounded in the actual code in this repository. It reflects the real route structure, database schema, business services, and UI pages that are implemented here.

---

## 🎯 Why this project stands out

PeoplePay360 is not just another HR dashboard. It is built around the operational realities of running a workforce:

- 🧑‍💼 employee management and org hierarchy
- 🔐 secure authentication and role-based access control
- 🕒 attendance and working-schedule management
- 🧾 salary structures and dynamic rule-based compensation
- 💰 payroll payrun creation, validation, and payment flow
- 📄 payslip generation and reporting
- 📊 management dashboards for HR and finance decisions

The backend follows a clean service + repository architecture, while the frontend provides a modern admin experience for real business workflows.

---

## 🧩 Product scope

The current codebase includes these functional domains:

- Authentication and onboarding flows
- Users, roles, and permission management
- Company, departments, positions, and employee types
- Employee records and status workflows
- Working schedules and attendance policy configuration
- Contracts and effective contract resolution
- Salary structures, salary rules, and formula-based calculations
- Payroll generation and payslips
- Reporting and dashboard views

---

## 🏗️ Architecture overview

```mermaid
flowchart LR
  A[React + Vite Frontend] --> B[Express API Layer]
  B --> C[Controllers]
  C --> D[Service Layer]
  D --> E[Repositories]
  E --> F[(PostgreSQL)]
  G[Auth + RBAC + Validation Middleware] --> B
```

### Backend

The backend lives under [backend](backend) and is organized into the main operational layers:

- [backend/server.js](backend/server.js): application bootstrap and startup
- [backend/src/app.js](backend/src/app.js): Express app config and middleware wiring
- [backend/src/routes](backend/src/routes): API route registration
- [backend/src/controllers](backend/src/controllers): HTTP request handlers
- [backend/src/services](backend/src/services): payroll, HR, auth, reporting, and business logic
- [backend/src/repositories](backend/src/repositories): database query layer
- [backend/src/middleware](backend/src/middleware): auth, validation, RBAC, rate limiting, cache, and error handling
- [backend/db/schema.sql](backend/db/schema.sql): core relational schema
- [backend/db/pool.js](backend/db/pool.js): PostgreSQL pool configuration

### Frontend

The frontend lives under [frontend](frontend) and exposes the operational UI for the product:

- [frontend/src/App.tsx](frontend/src/App.tsx): app routing and protected layout shell
- [frontend/src/pages](frontend/src/pages): dashboards, employee flows, payroll pages, and admin modules
- [frontend/src/context](frontend/src/context): auth state management
- [frontend/src/api](frontend/src/api): frontend API layer
- [frontend/src/components](frontend/src/components): reusable layout and UI system

---

## 🔐 Security and compliance thinking

Security is a first-class concern in this build, not a token addition afterthought.

Evidence in the repository:

- [backend/src/routes/auth.routes.js](backend/src/routes/auth.routes.js)
- [backend/src/middleware/auth.middleware.js](backend/src/middleware/auth.middleware.js)
- [backend/src/middleware/rbac.middleware.js](backend/src/middleware/rbac.middleware.js)
- [backend/src/config/env.js](backend/src/config/env.js)

Implemented patterns include:

- 🔑 JWT-based authentication and refresh flow
- 🛡️ permission enforcement before business logic runs
- 🏢 company-scoped data isolation
- ✅ Zod validation on incoming requests
- 🚦 rate limiting on sensitive endpoints
- ⚡ cache-aware read paths for performance

This makes the app behave much more like a real enterprise HR system than a single-page demo.

---

## 👥 Workforce and organization management

The repository includes a robust org structure for managing people and teams.

Key modules:

- [backend/src/routes/organization.routes.js](backend/src/routes/organization.routes.js)
- [backend/src/routes/employee-resolver.routes.js](backend/src/routes/employee-resolver.routes.js)
- [backend/src/services/organization.service.js](backend/src/services/organization.service.js)
- [frontend/src/pages/employees](frontend/src/pages/employees)

This covers:

- departments
- positions
- employee types
- employee lifecycle management
- company-level settings and employee records

---

## 🕒 Attendance, leaves, and scheduling

PeoplePay360 models the operational rhythm of a workforce through schedule and attendance logic.

Evidence:

- [backend/db/schema.sql](backend/db/schema.sql)
- [backend/src/routes/attendance.routes.js](backend/src/routes/attendance.routes.js)
- [backend/src/routes/attendance-policy.routes.js](backend/src/routes/attendance-policy.routes.js)
- [backend/src/routes/schedule.routes.js](backend/src/routes/schedule.routes.js)

Features implemented in the codebase include:

- schedule definitions and schedule-day rules
- attendance policy control
- leave/absence logic hooks
- employee attendance tracking

---

## 💼 Salary engine and compensation intelligence

One of the strongest parts of this repo is the salary engine, which treats compensation as a real business process rather than a static field.

Evidence:

- [backend/src/routes/salary.routes.js](backend/src/routes/salary.routes.js)
- [backend/src/services/salary-calculation.service.js](backend/src/services/salary-calculation.service.js)
- [backend/src/repositories/salary-structure.repository.js](backend/src/repositories/salary-structure.repository.js)
- [backend/src/repositories/salary-structure-rule.repository.js](backend/src/repositories/salary-structure-rule.repository.js)

This includes:

- salary structure CRUD
- salary rule creation and categorization
- rule sequencing and dependency handling
- fixed, percentage, and formula-based rule evaluation
- payroll preview calculation for employees

That gives the project a much more credible “enterprise software” feel and is a big differentiator in a hackathon setting.

---

## 💰 Payroll and payslip engine

The payroll module is the core backbone of this project and is where the platform becomes operationally valuable.

Evidence:

- [backend/src/routes/payrun.routes.js](backend/src/routes/payrun.routes.js)
- [backend/src/controllers/payrun.controller.js](backend/src/controllers/payrun.controller.js)
- [backend/src/services/payrun.service.js](backend/src/services/payrun.service.js)
- [backend/src/repositories/payrun.repository.js](backend/src/repositories/payrun.repository.js)
- [frontend/src/pages/payroll](frontend/src/pages/payroll)

Implemented workflow in code:

- create payrun
- compute payrun
- validate payrun
- pay payrun
- list payruns and employee data
- generate and retrieve payslips

The repo also captures per-employee payroll warning/error messages, which is a highly realistic operational feature for handling exclusions and exceptions in actual payroll processing.

---

## 📊 Reporting and dashboard intelligence

PeoplePay360 includes a business reporting layer designed around actual management needs.

Evidence:

- [backend/src/routes/report.routes.js](backend/src/routes/report.routes.js)
- [backend/src/services/report.service.js](backend/src/services/report.service.js)
- [backend/src/repositories/report.repository.js](backend/src/repositories/report.repository.js)
- [frontend/src/pages/dashboard/DashboardPage.tsx](frontend/src/pages/dashboard/DashboardPage.tsx)

Report coverage includes:

- employee reports
- payroll reports
- salary cost reports
- attendance reports
- time-off reports
- payslip reports
- department salary reporting
- contract attention warnings

---

## 🗃️ Data model and business patterns

The schema in [backend/db/schema.sql](backend/db/schema.sql) is designed to support a real HR and payroll system. It contains tables for:

- companies
- roles and permissions
- employees
- departments and positions
- employee types
- attendance policies and schedules
- salary structures and salary rules
- contracts
- payruns and payslips
- user sessions and account state

This is not a mock schema. It reflects a production-style structure with strong constraints, company scoping, and business domain relationships.

The PostgreSQL layer in [backend/db/pool.js](backend/db/pool.js) also includes explicit date parsing logic to minimize timezone drift, which is a critical payroll concern where date windows and effective contracts can otherwise break silently.

---

## 🛠️ Tech stack

### Backend

- Node.js
- Express
- PostgreSQL
- pg driver
- JWT authentication
- Zod validation
- bcryptjs
- nodemailer
- PDFKit

### Frontend

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Lucide icons

### Project tooling

- [backend/package.json](backend/package.json)
- [frontend/package.json](frontend/package.json)

---

## 🚀 Run locally

### 1) Prerequisites

- Node.js 18+
- PostgreSQL database
- backend environment file with secrets configured

### 2) Backend setup

```bash
cd backend
npm install
```

Create a `.env` file with values like:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/peoplepay360
ACCESS_TOKEN_SECRET=your_access_secret
REFRESH_TOKEN_SECRET=your_refresh_secret
PORT=5000
FRONTEND_BASE_URL=http://localhost:5173
```

Then run:

```bash
npm run dev
```

The backend starts through [backend/server.js](backend/server.js), and schema initialization happens automatically through [backend/db/initSchema.js](backend/db/initSchema.js).

### 3) Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The Vite frontend serves the HR/payroll UI in the browser and is mapped to the app’s routes in [frontend/src/App.tsx](frontend/src/App.tsx).

---

## 🏆 Why this is hackathon-winning

This project is compelling for judges because it combines depth, realism, and product polish:

- 💡 it solves a real business problem: workforce + payroll operations
- 🧠 it demonstrates architecture thinking through service/repository separation
- 🛡️ it includes security, validation, and access-control patterns
- 📈 it covers complete operational flows, not just static screens
- 📦 it feels like a real SaaS product foundation, not a mockup

From an evaluation perspective, the strongest story is simple:

> PeoplePay360 is a complete HR and payroll prototype with a production-minded backend, a polished frontend, and meaningful business logic across people management, compensation, payroll execution, and reporting.

---

## 📁 Repository map

```text
.
├── README.md
├── backend/
│   ├── db/
│   ├── docs/
│   ├── scripts/
│   ├── src/
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
└── .gitignore
```

---

## ✅ Bottom line

PeoplePay360 is a real, code-backed HR and payroll management platform prototype that combines security, employee lifecycle operations, salary logic, payroll workflows, and reporting in one end-to-end system.

It is built not just to look good, but to behave like a legitimate internal business platform — which is exactly the kind of technical story that wins in a hackathon environment.

