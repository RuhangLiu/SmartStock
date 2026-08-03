# SmartStock — Cross-Border Tie-Dye Inventory Platform

SmartStock is an English-language capstone application for managing the products, inventory, sales, orders, customers, and settings of a cross-border tie-dye retailer. It combines a React frontend with an Express REST API and a persistent SQLite database.

## Capstone deliverables

- 20 REST API endpoints: the 19 finalized capstone endpoints plus public employee signup
- Expected input, output, sample JSON, access rules, and error behavior
- SQLite database design with 7 tables and an entity relationship diagram
- Bearer-token authentication with administrator and employee roles
- Automated HTTP integration tests
- 27 of 27 tests passed
- Postman collection for manual API demonstration
- English sign-in and employee registration interface
- Image-enabled product catalog with eight original tie-dye product photographs
- Responsive, readability-focused typography for desktop and mobile

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

## Run the API test suite

```bash
cd server
npm test
```

Expected result:

```text
SmartStock API tests: 27/27 passed
```

The test runner uses an isolated temporary SQLite database and an ephemeral local HTTP port. It does not modify the demonstration database.

## API groups

| Group | Count | Capabilities |
|---|---:|---|
| Authentication | 5 | Public signup, login, current user, logout, administrator-managed staff registration |
| Products | 5 | Catalog, search, low stock, create, update, delete |
| Sales | 3 | Sales history, record sale, aggregated report |
| Orders | 3 | List, create, update status |
| Customers | 2 | List and create |
| Settings | 2 | Read and update |

All protected business endpoints require a bearer token. Administrative mutations are protected by role middleware. Public signup creates an employee account and immediately returns an authenticated session.

## Database behavior

- Passwords use salted scrypt hashes.
- Sessions expire after seven days.
- Product SKU values are unique.
- Products can store an image URL used by the frontend catalog and editor preview.
- The initial catalog contains eight curated tie-dye products; runtime demonstration data is not committed.
- Sale totals are calculated using the product price stored in SQLite.
- Recording a sale and reducing inventory occur in one transaction.
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
27 tests executed
27 tests passed
0 tests failed
100% pass rate
```
