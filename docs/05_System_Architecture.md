# System Architecture

## 1. Architecture Overview

SmartStock is a single Azure-hosted full-stack application. React and Express share one App Service origin. Express owns all database access, authentication, authorization, validation, image persistence, and Azure AI communication.

![SmartStock system architecture](diagrams/system-architecture.svg)

## 2. Component Responsibilities

| Component | Technology | Responsibility |
|---|---|---|
| Browser client | Current web browser | Renders UI, submits HTTPS requests, stores the active bearer token in application memory |
| Frontend | React 18 + Vite 5 | Staff workflows, bilingual labels, validation feedback, charts, forms, and read-only views |
| Backend/API | Node.js 24 + Express 4 | 27 REST endpoints, authentication, role checks, input validation, transactions, static file delivery |
| Database | Node `DatabaseSync` + SQLite | Nine application tables, foreign keys, WAL, inventory and sales records |
| Image storage | Azure App Service `/home/data` | Uploaded product JPG, PNG, and WebP files |
| AI service | Azure AI Foundry | Generates four read-only operations insights from allowlisted aggregates |
| Identity | Azure managed identity | Obtains an Azure AI access token without storing an API key |
| Source and release | GitHub + Azure Deployment Center | Branch review, main-branch deployment, build and release history |

## 3. Request Flow

### 3.1 Browser workflow

```text
User action
  -> React event handler
  -> HTTPS request to /api/...
  -> Express authentication and role middleware
  -> Controller validation and business logic
  -> SQLite transaction or query
  -> JSON response
  -> React state update and user feedback
```

### 3.2 Postman workflow

```text
Postman
  -> HTTPS request directly to Express /api endpoint
  -> authentication and validation
  -> SQLite
  -> JSON response directly to Postman
```

Postman does **not** send the request through the React web UI. React and Postman are separate API clients.

### 3.3 AI workflow

```text
Administrator
  -> POST /api/ai/briefing
  -> Express verifies admin role
  -> allowlisted aggregate SQLite queries
  -> App Service managed identity token
  -> Azure AI model deployment
  -> strict JSON parsing and output limits
  -> ai_activity_logs audit row
  -> four read-only insights
```

If Azure AI fails, the controller creates a deterministic local briefing from the same aggregate object and records the fallback provider.

## 4. API Layer

| API group | Endpoint count | Access summary |
|---|---:|---|
| Authentication | 5 | Login/signup public; profile/logout authenticated; staff registration admin |
| Products | 6 | Read authenticated; mutations and image upload admin |
| Sales | 3 | Authenticated operations |
| Orders | 3 | Read authenticated; create/update admin |
| Customers | 3 | Read authenticated; create/delete admin |
| Settings | 2 | Read authenticated; update admin |
| Inventory | 2 | History authenticated; manual adjustment admin |
| Database | 2 | Admin-only read-only viewer |
| AI | 1 | Admin-only read-only briefing |
| **Total** | **27** | Bearer-token authentication and role-based access |

The exact route list is in [API Endpoint Inventory](appendices/API_Endpoint_Inventory.md).

## 5. Data Layer

| Table | Primary purpose |
|---|---|
| `products` | Catalog, price, cost, stock, threshold, image |
| `sales` | Completed sales and server-calculated totals |
| `users` | Staff identity, password hash, role |
| `sessions` | Expiring bearer-token sessions |
| `orders` | Purchase and international-order tracking |
| `customers` | Customer directory and region |
| `settings` | Single store configuration row |
| `inventory_movements` | Immutable stock change history |
| `ai_activity_logs` | Safe AI provider and performance audit |

The detailed entity relationships are available in [Database Design](Database_Design.pdf).

## 6. Hosting Environments

| Environment | Frontend/API | Database and files | AI mode |
|---|---|---|---|
| Automated test | Ephemeral local HTTP server | Temporary SQLite and upload folder | Local preview |
| Local development | Vite + Express or combined Express build | Repository-local SQLite and uploads | Local preview by default |
| Production | Azure App Service, one origin | `/home/data` persistent storage | Azure AI with local fallback |

SmartStock currently has no separate staging environment. Reviewed pull requests and automated tests reduce risk before main-branch deployment; a staging slot is a future improvement.

## 7. Deployment Architecture

![SmartStock deployment pipeline](diagrams/deployment-pipeline.svg)

The release path is feature branch -> automated tests -> pull request -> main -> Azure build -> App Service -> smoke test. Application rollback does not replace the persistent database.

## 8. Security Boundaries

- Passwords use salted scrypt hashes.
- Sessions expire after seven days and are deleted on logout.
- Every protected business route requires a bearer token.
- Administrative mutations use role middleware.
- SQL uses prepared statements and server-defined queries.
- The Database Viewer uses an allowlist and removes sensitive fields.
- Image upload validates role, MIME type, file count, size, and server-generated filename.
- Azure AI receives approved aggregate data only.
- Managed identity avoids an Azure AI key in React, GitHub, or App Service settings.
- AI output is parsed into a strict structure and cannot execute SQL.

## 9. Architecture Constraints

- SQLite file access is synchronous and appropriate for a small single-instance operational workload.
- Multi-instance horizontal scaling would require migration to a managed network database.
- Azure Free F1 is a demonstration plan and may cold-start.
- No external customer checkout, payment, shipping, or tax service is connected.
- Monitoring is based on logs, smoke tests, and audit tables rather than a dedicated observability platform.
