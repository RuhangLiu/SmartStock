# Issue Diagnosis, Research, and Resolution

## 1. Troubleshooting Method

For each incident, the team used the same sequence:

1. Record expected and actual behavior.
2. Reproduce the issue in a controlled environment.
3. Identify the failing layer: browser, React, Express, authentication, SQLite, Azure storage, or Azure AI.
4. Inspect the nearest available evidence: response body, terminal output, test report, Deployment Center, Log Stream, or audit table.
5. Compare the implementation with official documentation.
6. Apply the smallest scoped correction.
7. Re-run the specific scenario and the complete automated suite.

AI assistance was used to organize hypotheses and documentation, but conclusions were verified against the application code, HTTP results, SQLite state, Azure configuration, and official product documentation.

## 2. Issue Record: API Connection Refused

### Description

- **Expected:** Postman sends a request to SmartStock and receives JSON.
- **Actual:** Postman displayed `ECONNREFUSED`, or the browser displayed `ERR_CONNECTION_REFUSED`.

### Environment

Local macOS development, Express expected on port 4000, Postman collection using `{{baseUrl}}`.

### Reproduction

1. Stop the Express process.
2. Send `POST {{baseUrl}}/api/auth/login`.
3. Observe that no process accepts the connection.

### Diagnosis and Root Cause

The failure occurred before HTTP reached Express. Either the backend was not running or `baseUrl` referenced the wrong host or port. This is different from an HTTP 4xx/5xx response because no server response exists.

### Research and Resources

- Express startup behavior and local terminal output.
- Postman request URL and collection variable inspection.
- Browser and operating-system connection error behavior.

### Resolution

1. Run `npm start` from the repository root.
2. Confirm `SmartStock backend listening on http://localhost:4000`.
3. Set local `baseUrl` to `http://localhost:4000`.
4. Set Azure `baseUrl` to `https://dyedwild-smartstock.azurewebsites.net`.

### Verification

The login endpoint returned HTTP 200 and a token. The automated test runner also opened an ephemeral HTTP port successfully when permitted by the local environment.

## 3. Issue Record: 401 Session Expired or Invalid

### Description

- **Expected:** An authenticated administrator creates or updates a business record.
- **Actual:** The API returned HTTP 401 with `Session expired or invalid`.

### Environment

Postman request with a previously saved bearer token.

### Reproduction

1. Log in and save a token.
2. Log out or wait until the session expires.
3. Reuse the old token on a protected endpoint.

### Diagnosis and Root Cause

`requireAuth` joins the submitted bearer token to the `sessions` and `users` tables and requires `expires_at` to be in the future. A logged-out, missing, malformed, or expired token fails this query.

### Research and Resources

- `server/src/middleware/auth.js`
- HTTP Authorization header format
- Postman collection variables and headers

### Resolution

1. Send a fresh login request.
2. Replace the collection bearer token.
3. Confirm the header contains exactly `Bearer <token>`.

### Verification

The protected request succeeded with the new token. TC-45 also verified that logout invalidates the previous token.

## 4. Issue Record: SQLite Persistence on Azure

### Description

- **Expected:** Products, sales, orders, customers, inventory movements, and uploaded images remain after an App Service restart.
- **Actual:** Data stored in a nonpersistent application folder could be lost during redeployment or restart.

### Environment

Azure App Service on Linux with file-backed SQLite.

### Reproduction

1. Configure the database inside a transient deployment directory.
2. Write demonstration data.
3. redeploy or replace the application container.
4. Observe that transient files are not a reliable persistence layer.

### Diagnosis and Root Cause

App Service application content and transient container storage are not equivalent to durable application data. SmartStock needed an explicit path under Azure `/home` and persistent App Service storage enabled.

### Research and Resources

- [Azure App Service Linux storage FAQ](https://learn.microsoft.com/en-us/troubleshoot/azure/app-service/faqs-app-service-linux-new)
- [Azure custom container and `/home` persistence](https://learn.microsoft.com/en-us/azure/app-service/configure-custom-container)
- [Node.js `node:sqlite` documentation](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)

### Resolution

```text
SMARTSTOCK_DB_PATH=/home/data/smartstock.db
SMARTSTOCK_UPLOAD_DIR=/home/data/uploads/products
WEBSITES_ENABLE_APP_SERVICE_STORAGE=true
```

The application creates required folders and uses WAL mode. Azure remains limited to one App Service instance because this capstone SQLite design is not intended for concurrent multi-instance writes.

### Verification

Azure SSH showed `smartstock.db`, `smartstock.db-wal`, and `smartstock.db-shm` under `/home/data`. Production data remained available after deployment and the Database Viewer returned nine tables.

## 5. Issue Record: Local Product Image Upload

### Description

- **Expected:** An administrator chooses a local image and the product record displays it.
- **Actual:** The original form accepted only an external image URL.

### Environment

React product form, Express API, Azure App Service persistent storage.

### Reproduction

1. Open Add Product.
2. Observe that only `Product Image URL` is available.
3. Attempt to reference a local file path, which a remote browser cannot serve as a public image.

### Diagnosis and Root Cause

A local filesystem path is not a server-hosted URL. The application needed a multipart upload endpoint, server-side validation, persistent file storage, and a returned public application path.

### Research and Resources

- Multer multipart upload behavior.
- Azure `/home` persistence documentation.
- Browser file-input and MIME type behavior.

### Resolution

1. Added `POST /api/products/image`.
2. Restricted upload to administrators.
3. Accepted JPG, PNG, and WebP up to 5 MB.
4. Generated a UUID filename.
5. Stored files under the configured upload directory.
6. Returned `/uploads/products/<filename>` for product records.
7. Added file selection and image preview to React.

### Verification

TC-31 confirmed employee denial, TC-32 confirmed unsupported-type rejection, and TC-33 confirmed a valid file was persisted and publicly addressable.

## 6. Issue Record: Azure AI Model Access and Safe Fallback

### Description

- **Expected:** An administrator receives four current operations insights without exposing secrets or allowing database changes.
- **Actual:** Azure AI could be unavailable because of an incorrect endpoint, deployment name, managed identity, regional model access, or role assignment.

### Environment

Azure App Service connected to an Azure AI Foundry resource.

### Reproduction

1. Enable Azure AI with an invalid deployment or without identity permission.
2. Generate a briefing.
3. Observe a managed-identity or Azure AI request warning in application logs.

### Diagnosis and Root Cause

Azure AI access requires both a valid model deployment and authorization for the App Service identity. Storing an API key in React would expose the credential, so authentication had to remain server-side.

### Research and Resources

- [Microsoft guidance for App Service and Azure OpenAI with managed identity](https://learn.microsoft.com/en-us/azure/app-service/tutorial-ai-openai-chatbot-dotnet)
- [Microsoft Foundry managed identity guidance](https://learn.microsoft.com/en-ie/azure/ai-services/openai/how-to/managed-identity?view=azureml-api-2)
- Application controller and AI activity audit records

### Resolution

1. Enabled App Service system-assigned identity.
2. Assigned `Cognitive Services OpenAI User` on the AI resource.
3. Stored only endpoint, deployment name, enable flag, and timeout in App Service settings.
4. Allowed only predefined aggregate inventory, order, and sales data.
5. Limited detailed rows and output length.
6. Parsed Azure output into a strict four-insight JSON structure.
7. Added a deterministic local read-only fallback.
8. Logged provider, status, duration, row count, language, and user without prompts or tokens.

### Verification

Production displayed the `AZURE AI` badge and four read-only insights on August 24, 2026. TC-41 through TC-44 verified role restrictions, English and Chinese local previews, and safe audit logging.

## 7. Issue Record: Incorrect Explanation of Postman Request Flow

### Description

- **Expected explanation:** Postman sends HTTP requests directly to Express REST API endpoints.
- **Incorrect explanation:** Postman sends requests to the web UI.

### Diagnosis

The UI and API share one Azure host, but they are separate application layers. React is a client of the API. Postman is another client of the same API and does not need to operate through React.

### Correct Flow

```text
Postman -> HTTPS -> Express /api endpoint -> authentication/validation -> SQLite -> JSON response
```

### Verification

Postman requests use URLs such as `/api/auth/login` and `/api/products`. The Express route definitions and returned JSON confirm the request reaches the backend API layer.

## 8. Knowledge Sharing

Resolved issues are shared through:

- this troubleshooting document;
- GitHub pull requests with scoped commit history;
- machine-readable test evidence;
- Postman collection examples;
- architecture and deployment diagrams;
- presentation and demonstration notes.
