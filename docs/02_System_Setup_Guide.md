# System Setup Guide

## 1. Purpose

This guide allows a new developer to install, run, test, and deploy SmartStock from a clean environment. Commands assume macOS, Linux, or a terminal with equivalent Git and Node.js support.

## 2. Prerequisites

| Requirement | Version or setting | Validation command |
|---|---|---|
| Git | Current supported release | `git --version` |
| Node.js | 24.x | `node --version` |
| npm | Bundled with Node.js 24 | `npm --version` |
| Browser | Current Chrome, Edge, Safari, or Firefox | Open a local URL |
| Azure account | Required only for cloud deployment | Sign in to Azure Portal |
| Postman | Optional for manual API tests | Import the supplied collection |

SmartStock uses the built-in `node:sqlite` module. Node.js 24 is required; no separate SQLite npm driver is installed.

## 3. Obtain the Source

```bash
git clone https://github.com/RuhangLiu/SmartStock.git
cd SmartStock
```

Never commit `.env`, access tokens, production database copies, or real customer data.

## 4. Install Dependencies

Install root and workspace dependencies:

```bash
npm ci
npm ci --prefix client
npm ci --prefix server
```

The root application supplies the Azure entry point. `client` contains React/Vite. `server` contains Express, routes, SQLite integration, and tests.

## 5. Local Configuration

The application runs without a `.env` file by using safe local defaults.

| Variable | Local default | Purpose |
|---|---|---|
| `PORT` | `4000` | Express listening port |
| `SMARTSTOCK_DB_PATH` | `server/database/smartstock.db` | SQLite file location |
| `SMARTSTOCK_UPLOAD_DIR` | `server/uploads/products` | Uploaded product images |
| `AZURE_OPENAI_ENABLED` | `false` | Uses local read-only AI preview when false |
| `AZURE_OPENAI_ENDPOINT` | Empty | Azure AI resource endpoint |
| `AZURE_OPENAI_DEPLOYMENT` | `smartstock-ai-mini` | Azure model deployment name |
| `AZURE_OPENAI_TIMEOUT_MS` | `12000` | AI request timeout in milliseconds |

To override a value for one terminal session:

```bash
PORT=4000 SMARTSTOCK_DB_PATH=./server/database/smartstock.db npm start
```

## 6. Build and Run Locally

### 6.1 Production-style local run

```bash
npm run build
npm start
```

Open [http://localhost:4000](http://localhost:4000).

### 6.2 Frontend development mode

In terminal 1:

```bash
cd server
npm start
```

In terminal 2:

```bash
cd client
npm run dev
```

Open the URL printed by Vite. The frontend development configuration forwards API requests to the Express backend.

## 7. Database Initialization

On first start, `server/src/models/db.js`:

1. Creates the database folder and SQLite file.
2. Enables foreign keys and WAL journal mode.
3. Creates nine application tables.
4. Adds missing product columns for backward compatibility.
5. Creates indexes.
6. Seeds administrator, employee, product, order, customer, and settings demonstration data only when the relevant tables are empty.
7. Creates initial inventory movement records.

Local database path:

```text
server/database/smartstock.db
```

Do not commit runtime `smartstock.db`, `smartstock.db-wal`, or `smartstock.db-shm` files.

## 8. Validate the Local Setup

### 8.1 Browser validation

1. Open `http://localhost:4000`.
2. Sign in with the administrator demonstration account.
3. Confirm Dashboard metrics load.
4. Open Products and confirm eight seeded product images display.
5. Open Database and confirm nine approved tables display.
6. Generate the AI briefing. Local development should show a read-only local preview unless Azure variables and managed identity are available.

### 8.2 Automated validation

```bash
cd server
npm test
```

Expected: `45/45 passed`. The test runner uses a temporary SQLite database and does not modify local demonstration data.

### 8.3 API validation

The login request must go to the **backend API endpoint**, not to a UI page:

```http
POST http://localhost:4000/api/auth/login
Content-Type: application/json

{
  "email": "admin@smartstock.com",
  "password": "admin123"
}
```

Use the returned token as `Authorization: Bearer <token>` for protected requests.

## 9. Postman Setup

1. Import `docs/SmartStock_API.postman_collection.json`.
2. Set collection variable `baseUrl`:
   - Local: `http://localhost:4000`
   - Azure: `https://dyedwild-smartstock.azurewebsites.net`
3. Run `POST Log in` first.
4. Store the returned bearer token in the collection variable used by protected requests.
5. Use a new unique SKU for each create-product demonstration.

## 10. Azure App Service Deployment

### 10.1 Create or select resources

- Resource group: `smartstock-rg`
- Linux Web App: `dyedwild-smartstock`
- Runtime: Node.js 24
- App Service plan: Free F1 for the capstone demonstration
- Source: GitHub repository main branch through Deployment Center

### 10.2 Application settings

Configure the following under App Service > Settings > Environment variables:

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

Do not add an Azure AI API key. Production uses managed identity.

### 10.3 Enable Azure AI identity access

1. Open App Service > Identity.
2. Enable the system-assigned managed identity.
3. Open the Azure AI resource > Access control (IAM).
4. Add the `Cognitive Services OpenAI User` role.
5. Select the `dyedwild-smartstock` managed identity as the member.
6. Confirm the model deployment name matches `AZURE_OPENAI_DEPLOYMENT`.

### 10.4 Configure GitHub deployment

1. Open App Service > Deployment Center.
2. Select GitHub as the source.
3. Select the repository and `main` branch.
4. Save the deployment configuration.
5. Review the first build log.

The root build installs frontend dependencies, builds `client/dist`, and starts Express with `server/index.js`. Express serves both the compiled React interface and `/api` routes from one origin.

## 11. Validate the Azure Deployment

1. Open the production HTTPS URL.
2. Sign in as administrator.
3. Confirm Dashboard data loads from SQLite.
4. Open Database Viewer and confirm nine tables.
5. Generate the AI briefing and confirm the `AZURE AI` label.
6. Upload a small test image only when a mutation test is specifically required.
7. Review Deployment Center and Log Stream for errors.

## 12. Rollback

1. Open Deployment Center > deployment history.
2. Identify the last known-good main-branch deployment.
3. Redeploy that revision using the Azure-supported redeploy action or revert the faulty commit through a reviewed GitHub pull request.
4. Do not overwrite `/home/data/smartstock.db` during an application rollback.
5. Repeat the full post-deployment smoke test.

## 13. Setup Completion Checklist

- [ ] Node.js 24 and npm installed
- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] Frontend build succeeds
- [ ] Express starts on the expected port
- [ ] Login page and dashboard load
- [ ] Database contains nine tables
- [ ] Automated test suite reports 45/45 passed
- [ ] Azure `/home/data` persistence configured
- [ ] Managed identity and Azure AI role configured
- [ ] Production smoke test completed
