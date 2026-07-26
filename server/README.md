# SmartStock Backend API

SmartStock is an English-language inventory, sales, order, customer, and settings platform for a cross-border tie-dye retailer. The backend is implemented with Node.js, Express, and SQLite and is fully integrated with the SmartStock frontend.

## Requirements

- Node.js 24 or newer (`node:sqlite` is used for the database)
- npm

## Run the application

```bash
npm install
npm start
```

The application runs at `http://localhost:4000`. API routes use the `/api` prefix.

Demo accounts:

- Administrator: `admin@smartstock.com` / `admin123`
- Employee: `employee@smartstock.com` / `employee123`

## Run the automated API tests

```bash
npm test
```

The test runner starts the Express application on an ephemeral local port and creates a separate temporary SQLite database. It does not change the demonstration database.

To save the machine-readable results to a specific location:

```bash
SMARTSTOCK_TEST_REPORT="./api-test-results.json" npm test
```

## Backend structure

```text
server/
├── index.js
├── package.json
├── database/
│   └── schema.sql
├── src/
│   ├── app.js
│   ├── index.js
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   └── routes/
└── tests/
    └── api-test-runner.js
```

The SQLite database is created automatically at `database/smartstock.db` on first start. Set `SMARTSTOCK_DB_PATH` to use another database location.

## Implementation notes

- Bearer-token sessions expire after seven days.
- Roles are limited to `admin` and `employee`.
- Passwords are stored as salted scrypt hashes.
- Product SKU values are unique.
- Sale totals are calculated from the database product price.
- Sale creation and inventory reduction use a single database transaction.
- Products with sales history cannot be deleted.

See `API_Documentation.pdf` and `Database_Design.pdf` in the submission package for the complete specification.
