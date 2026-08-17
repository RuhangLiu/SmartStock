# SmartStock — Cross-Border Tie-Dye Inventory Platform

SmartStock is an English-language capstone application for managing the products, inventory, sales, orders, customers, and settings of a cross-border tie-dye retailer. It combines a React frontend with an Express REST API and a persistent SQLite database.

## Capstone deliverables

- 27 REST API endpoints, including public signup, local product-image upload, inventory movement history, protected customer deletion, the read-only database viewer, and an administrator-only AI operations briefing
- Expected input, output, sample JSON, access rules, and error behavior
- SQLite database design with 9 tables and an entity relationship diagram
- Bearer-token authentication with administrator and employee roles
- Automated HTTP integration tests
- 45 of 45 tests passed
- Postman collection for manual API demonstration
- English sign-in and employee registration interface
- Image-enabled product catalog with eight original tie-dye product photographs
- Responsive, readability-focused typography for desktop and mobile
- Administrator-only JPG, PNG, and WebP product-image upload with Azure persistent storage
- Administrator-only read-only database viewer with search and pagination
- Complete inventory movement history with before/after balances, operator, reason, filters, and pagination
- Administrator-only manual inventory adjustments with employee read-only access and negative-stock protection
- Administrator-only bilingual Azure AI operations briefing with managed identity, allowlisted aggregate data, audit logging, and a safe local fallback

## Technology

- React and Vite
- Node.js 24+
- Express
- SQLite through the built-in `node:sqlite` module
- REST and JSON

## Project structure

```text
.
├── client/                     # React frontend source
├── server/                     # Express API, SQLite integration, and tests
├── docs/                       # API, database, SQL, Postman, and test documents
├── evidence/
│   └── API_Test_Results.json   # Machine-readable test evidence
└── README.md
```

## Run locally

Node.js 24 or newer is required.

### 1. Install and build the frontend

```bash
cd client
npm install
npm run build
```

### 2. Install and start the backend

```bash
cd ../server
npm install
npm start
```

Open `http://localhost:4000`.

Demo accounts:

- Administrator: `admin@smartstock.com` / `admin123`
- Employee: `employee@smartstock.com` / `employee123`

## Azure App Service deployment

The repository root is configured as a single Node.js 24 application for Azure App Service. The Azure build installs both workspaces, builds the React client into `client/dist`, and starts Express from `server/index.js`. Express serves the built frontend and the `/api` routes from the same origin.

Use these App Service application settings:

```text
NODE_ENV=production
SMARTSTOCK_DB_PATH=/home/data/smartstock.db
SMARTSTOCK_UPLOAD_DIR=/home/data/uploads/products
WEBSITES_ENABLE_APP_SERVICE_STORAGE=true
SCM_DO_BUILD_DURING_DEPLOYMENT=true
AZURE_OPENAI_ENABLED=true
AZURE_OPENAI_ENDPOINT=https://dyedwild-smartstock-ai.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=smartstock-ai-mini
AZURE_OPENAI_TIMEOUT_MS=12000
```

The `/home/data` path keeps the SQLite database on App Service persistent storage. The Free F1 plan should remain at one instance because SQLite is intended for this capstone demonstration workload, not multi-instance production scaling.

The production AI integration uses the App Service system-assigned managed identity with the `Cognitive Services OpenAI User` role scoped only to the `dyedwild-smartstock-ai` resource. No Azure AI API key is stored in the browser, repository, or App Service settings. If Azure AI is unavailable, the endpoint returns a deterministic local read-only briefing instead.

## Run the API test suite

```bash
cd server
npm test
```

Expected result:

```text
SmartStock API tests: 45/45 passed
```

The test runner uses an isolated temporary SQLite database and an ephemeral local HTTP port. It does not modify the demonstration database.

## API groups

| Group | Count | Capabilities |
|---|---:|---|
| Authentication | 5 | Public signup, login, current user, logout, administrator-managed staff registration |
| Products | 6 | Catalog, search, low stock, local image upload, create, update, delete |
| Sales | 3 | Sales history, record sale, aggregated report |
| Orders | 3 | List, create, update status |
| Customers | 3 | List, create, and safely delete customers without purchase history |
| Settings | 2 | Read and update |
| Inventory | 2 | Read movement history and perform administrator-only documented stock adjustments |
| Database | 2 | List approved tables and view searched, paginated rows |
| AI | 1 | Generate an administrator-only bilingual, read-only operations briefing with Azure AI and local fallback |

All protected business endpoints require a bearer token. Administrative mutations are protected by role middleware. Public signup creates an employee account and immediately returns an authenticated session.

## Database behavior

- Passwords use salted scrypt hashes.
- Sessions expire after seven days.
- Product SKU values are unique.
- Products can use an external image URL or an uploaded JPG, PNG, or WebP file up to 5MB.
- Uploaded product images are stored under `/home/data/uploads/products` on Azure App Service.
- The initial catalog contains eight curated tie-dye products; runtime demonstration data is not committed.
- Sale totals are calculated using the product price stored in SQLite.
- Recording a sale and reducing inventory occur in one transaction.
- Product creation, quantity edits, sales, and manual adjustments automatically create immutable inventory movement records.
- Every movement stores its signed change, before/after balance, operator, reason, timestamp, and source reference.
- Inventory changes and their corresponding movement records are committed in the same transaction.
- AI requests read only predefined inventory, sales, and order aggregates, return at most four insights, and never execute SQL or modify business records.
- AI activity logging records provider, status, language, record count, duration, and user identity without storing prompts, access tokens, passwords, or session tokens.
- A product with sales history cannot be deleted.

## Documentation

- `docs/API_Documentation.pdf`
- `docs/Database_Design.pdf`
- `docs/Database_Schema.sql`
- `docs/API_Test_Cases_and_Results.xlsx`
- `docs/SmartStock_API.postman_collection.json`
- `docs/VIDEO_DEMO_CHECKLIST.md`
- `evidence/API_Test_Results.json`

## Test result

The finalized submission was executed against the exact backend source included in this repository:

```text
45 tests executed
45 tests passed
0 tests failed
100% pass rate
```
