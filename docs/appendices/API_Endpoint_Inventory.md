# API Endpoint Inventory

All business endpoints return JSON and use the `/api` prefix. Except for login and signup, requests require `Authorization: Bearer <token>`. `Admin` means an authenticated administrator; `Staff` means either administrator or employee.

| # | Method | Endpoint | Access | Purpose |
|---:|---|---|---|---|
| 1 | POST | `/api/auth/login` | Public | Authenticate staff and create a session |
| 2 | POST | `/api/auth/signup` | Public | Create an employee account and session |
| 3 | GET | `/api/auth/me` | Staff | Return current user profile |
| 4 | POST | `/api/auth/logout` | Staff | Invalidate current session |
| 5 | POST | `/api/auth/register` | Admin | Create another staff account |
| 6 | GET | `/api/products` | Staff | List and search products |
| 7 | GET | `/api/products/low-stock` | Staff | List products at or below threshold |
| 8 | POST | `/api/products/image` | Admin | Upload a validated product image |
| 9 | POST | `/api/products` | Admin | Create product |
| 10 | PUT | `/api/products/:id` | Admin | Update product |
| 11 | DELETE | `/api/products/:id` | Admin | Delete product without sales history |
| 12 | GET | `/api/sales` | Staff | List sales |
| 13 | POST | `/api/sales` | Staff | Record sale and reduce inventory |
| 14 | GET | `/api/sales/report` | Staff | Return dashboard aggregates |
| 15 | GET | `/api/orders` | Staff | List orders |
| 16 | POST | `/api/orders` | Admin | Create order |
| 17 | PUT | `/api/orders/:id` | Admin | Update order status |
| 18 | GET | `/api/customers` | Staff | List customers |
| 19 | POST | `/api/customers` | Admin | Create customer |
| 20 | DELETE | `/api/customers/:id` | Admin | Delete customer without purchase history |
| 21 | GET | `/api/settings` | Staff | Read store settings |
| 22 | PUT | `/api/settings` | Admin | Update store settings |
| 23 | GET | `/api/inventory/movements` | Staff | Search and paginate movement history |
| 24 | POST | `/api/inventory/adjustments` | Admin | Apply documented stock adjustment |
| 25 | GET | `/api/database/tables` | Admin | List approved database tables |
| 26 | GET | `/api/database/:table` | Admin | Search and paginate safe table rows |
| 27 | POST | `/api/ai/briefing` | Admin | Generate bilingual read-only operations briefing |

## Endpoint Count Reconciliation

Postman collection counts and automated test counts measure different things:

- **27 endpoints** are distinct method-and-path API operations.
- **45 test cases** cover those endpoints under multiple conditions, including success, invalid input, insufficient stock, forbidden roles, expired sessions, safe field filtering, file validation, and database change verification.
