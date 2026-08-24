# SmartStock Capstone Project Documentation

**System:** SmartStock - Cross-Border Tie-Dye Inventory Platform  
**Production application:** [https://dyedwild-smartstock.azurewebsites.net](https://dyedwild-smartstock.azurewebsites.net)  
**Repository:** [https://github.com/RuhangLiu/SmartStock](https://github.com/RuhangLiu/SmartStock)  
**Documentation version:** August 24, 2026

SmartStock is a staff-facing inventory and operations platform for a small cross-border tie-dye business. The application centralizes product records, stock levels, inventory movements, sales, orders, customers, configuration, read-only database inspection, and an administrator-only AI operations briefing.

## Table of Contents

1. [Production Support and Testing](01_Production_Support_and_Testing.md)
2. [System Setup Guide](02_System_Setup_Guide.md)
3. [Issue Diagnosis and Resolution](03_Issue_Diagnosis_and_Resolution.md)
4. [System Usage Guide](04_System_Usage_Guide.md)
5. [System Architecture](05_System_Architecture.md)
6. [Deployment and Security](06_Deployment_and_Security.md)
7. [API Endpoint Inventory](appendices/API_Endpoint_Inventory.md)
8. [Test and Smoke Evidence](appendices/Test_and_Smoke_Evidence.md)

## Existing Technical Artifacts

- [Combined Capstone Project Documentation](SmartStock_Capstone_Project_Documentation.pdf)
- [API Documentation](API_Documentation.pdf)
- [Database Design](Database_Design.pdf)
- [Database Schema](Database_Schema.sql)
- [Final API Test Cases, Results, and Endpoint Coverage](API_Test_Cases_and_Results.xlsx)
- [Postman Collection](SmartStock_API.postman_collection.json)
- [Automated Test Evidence](../evidence/API_Test_Results.json)
- [Video Demonstration Checklist](VIDEO_DEMO_CHECKLIST.md)

## Verified Project Facts

| Item | Final value |
|---|---:|
| REST API endpoints | 27 |
| Automated integration test cases | 45 |
| Passing automated tests | 45 |
| SQLite application tables | 9 |
| Frontend | React 18 + Vite 5 |
| Backend | Node.js 24 + Express 4 |
| Cloud hosting | Azure App Service on Linux |
| Production database path | `/home/data/smartstock.db` |
| AI mode | Azure AI with managed identity and local read-only fallback |

## Intended Readers

- **Operators and staff:** begin with the [System Usage Guide](04_System_Usage_Guide.md).
- **Developers:** begin with the [System Setup Guide](02_System_Setup_Guide.md) and [System Architecture](05_System_Architecture.md).
- **Support personnel:** begin with [Production Support and Testing](01_Production_Support_and_Testing.md) and [Issue Diagnosis and Resolution](03_Issue_Diagnosis_and_Resolution.md).

> Security note: the repository contains demonstration credentials only. Never commit Azure keys, production passwords, bearer tokens, or database copies containing real customer information.
