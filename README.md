# Nivetek Finance Manager - Technical Specification

## 1. Project Overview
A lightweight personal finance management system featuring a FastAPI backend and a Next.js frontend. The goal is to track accounts, manage recurring transactions, and visualize spending patterns.

---

## 2. Tech Stack

### Backend
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+)
- **Package Manager:** [uv](https://github.com/astral-sh/uv)
- **Database:** [PostgreSQL](https://www.postgresql.org/)
- **ORM:** SQLModel (Integration of SQLAlchemy + Pydantic)
- **Authentication:** OAuth2 with JWT (JSON Web Tokens)

### Frontend
- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [Shadcn/UI](https://ui.shadcn.com/)
- **Data Visualization:** [Tremor](https://www.tremor.so/)
- **Icons:** Lucide-react

---

## 3. Data Models & Validation

### User Model
| Field | Type | Constraints |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `username` | String | Unique, Required |
| `email` | String | Unique, Email Format |
| `password` | String | Hashed, Min 7 chars, 1 number, 1 special char |
| `permission` | Enum | `admin`, `editor`, `readonly` |
| `label` | String | Optional metadata |

### Account Model
| Field | Type | Constraints |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `name` | String | Required |
| `account_number` | String | Optional |
| `bank_name` | String | Required |
| `initial_balance` | Decimal | Required |
| `balance_date` | Date | Required |
| `user_id` | UUID | Foreign Key (Owner) |

### Transaction Model
| Field | Type | Constraints |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `name` | String | Required |
| `type` | Enum | `payment`, `withdraw`, `deposit`, `interest`, etc. |
| `amount` | Decimal | Required |
| `target_account` | String | Required (Vendor/Entity name) |
| `account_id` | UUID | Foreign Key (Linked Bank Account) |
| `date` | Date | Required |
| `recurrency` | JSON/Object | Optional: `{frequency: string, occurrences: int, end_date: date}` |

---

## 4. Backend Logic Requirements

### Authentication & Permissions
- **RBAC (Role Based Access Control):** - `admin`: Full system access.
    - `editor`: Can modify Accounts/Transactions but cannot manage Users.
    - `readonly`: Can only perform GET requests.
- Standardized API responses:
    - Success: `{ "status": "success", "message": "...", "data": {} }`
    - Error: `{ "status": "error", "message": "Reason for denial/failure" }`

### Transaction Recurrence
- If a transaction has a `recurrency` object, the system must calculate future instances.
- Implementation: A background task or service layer that projects these transactions into the database based on the `end_date` or `repetitions` limit.

### Bulk Import
- **Endpoint:** `POST /api/v1/transactions/import`
- **Logic:** Accepts CSV file. Headers must match Transaction model fields. 
- Validation: If one row fails (e.g., invalid date format), the entire batch should roll back and return a list of specific row errors.

---

## 5. Frontend Requirements

### Layout & Navigation
- **Persistent Shell:** - **Top Bar:** App Name (Left), Global Date Range Picker (Center), User Profile/Menu (Right).
    - **Sidebar:** - Dashboard Link
        - Accounts (Collapsible list of all active accounts)
        - Users (Admin only)
        - Settings (Backup/Export)

### Dashboard Components
- **Global Filter:** Changing the date range in the Top Bar refreshes all child components via React Context.
- **Charts:** - Tremor `AreaChart` for balance trends over the selected period.
    - Tremor `DonutChart` for categorical spending.
- **Tables:** Shadcn `DataTable` with sorting, filtering, and pagination for transactions.

### Pages
1. **Login:** Username/Password form + "Forgot Password" placeholder.
2. **Dashboard:** Overview of total net worth and recent activity.
3. **Account Detail:** Specific analytics for one account + its transaction history.
4. **User Management:** CRUD table for Admins to manage staff/family access.

---

## 6. Security & Standards
- Use **Environment Variables** for all secrets (Postgres URI, JWT Secret).
- Passwords must be hashed using **Bcrypt**.
- Frontend forms must include **Client-side validation** (Zod/React Hook Form) to match Pydantic constraints.

---

## 7. Getting Started

### Start the services

```bash
docker-compose up -d
```

### Access your tools

- **Backend:** http://localhost:8000/docs (FastAPI Swagger UI)
- **Frontend:** http://localhost:3000
- **Database UI:** http://localhost:5050 (Login with `admin@nivetek.local` / `admin`)