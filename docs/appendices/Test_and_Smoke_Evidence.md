# Test and Smoke Evidence

## Automated Test Summary

| Metric | Result |
|---|---:|
| Executed | 45 |
| Passed | 45 |
| Failed | 0 |
| Pass rate | 100% |
| Runtime | Node.js 24 |
| Database | Isolated temporary SQLite database |
| Transport | Real HTTP on an ephemeral local port |

Machine-readable report: [`../../evidence/API_Test_Results.json`](../../evidence/API_Test_Results.json)

Spreadsheet report: [`../API_Test_Cases_and_Results.xlsx`](../API_Test_Cases_and_Results.xlsx)

## Coverage Categories

- Authentication and session invalidation
- Role-based access control
- Product CRUD and duplicate SKU validation
- Image upload permissions, type validation, and persistence
- Sales transaction and stock reduction
- Insufficient-stock rejection
- Order and customer operations
- Protected deletion rules
- Settings access
- Read-only Database Viewer and safe-field filtering
- Inventory movement history and manual adjustments
- Negative-stock protection
- AI role restriction, bilingual preview, and safe audit logging

## Production Smoke Evidence

Date: **August 24, 2026**  
URL: **https://dyedwild-smartstock.azurewebsites.net**

| Step | Result |
|---|---|
| Load production root over HTTPS | Pass |
| Sign in as administrator | Pass |
| Load Dashboard aggregates | Pass |
| Open Database Viewer | Pass |
| Confirm approved SQLite tables | Pass |
| Generate Azure AI briefing | Pass; `AZURE AI` and four read-only insights displayed |
| Confirm no business mutation during smoke test | Pass |

## Evidence Handling

Screenshots in `docs/screenshots` use demonstration data. No password field contents, bearer tokens, Azure access tokens, or customer-sensitive production records are included.
