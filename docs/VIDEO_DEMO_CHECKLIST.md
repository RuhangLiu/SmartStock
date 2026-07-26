# SmartStock Backend Demonstration Checklist

Target duration: 6–10 minutes.

## Recording sequence

1. Introduce SmartStock and its React, Express, and SQLite architecture.
2. Show the route, controller, middleware, and database modules.
3. Show all seven SQLite tables and the entity relationship diagram.
4. Log in and show the new row in the `sessions` table.
5. Create a product with `POST /api/products`, then query `products`.
6. Update it with `PUT /api/products/:id`, then query the same row again.
7. Record a sale with `POST /api/sales`, then show:
   - the new row in `sales`;
   - the reduced `products.quantity`.
8. Create and update an order, showing the corresponding `orders` row after each mutation.
9. Delete a product without sales history and show that its row no longer exists.
10. Run `npm test` and show `27/27 passed`.
11. Discuss implementation issues and resolutions.

## Database evidence requirement

After every `POST`, `PUT`, or `DELETE` demonstrated in Postman, immediately show a SQLite query proving that the REST API operation changed the expected database object.

Suggested queries:

```sql
SELECT token, user_id, expires_at FROM sessions ORDER BY expires_at DESC;

SELECT id, sku, name, price, quantity
FROM products
WHERE sku = 'DEMO-SCF-001';

SELECT id, product_id, quantity_sold, total_price, sale_date
FROM sales
ORDER BY id DESC
LIMIT 5;

SELECT id, supplier, product_name, quantity, status
FROM orders
ORDER BY id DESC
LIMIT 5;
```

## Final recording check

- GitHub repository URL is visible.
- API requests and responses are readable.
- Database rows are readable.
- The final automated test result is visible.
- The recording is between 6 and 10 minutes.
