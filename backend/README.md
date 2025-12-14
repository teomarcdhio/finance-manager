# Finance Manager - Backend

## 1. Tech Stack
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12+)
- **Package Manager:** [uv](https://github.com/astral-sh/uv)
- **Database:** [PostgreSQL](https://www.postgresql.org/)
- **ORM:** SQLModel (Integration of SQLAlchemy + Pydantic)
- **Authentication:** OAuth2 with JWT (JSON Web Tokens)

## 2. Data Models

### User
*   `id`: UUID
*   `username`: String (Unique)
*   `email`: String (Unique)
*   `permission`: Enum (`admin`, `editor`, `readonly`)

### Account
*   `id`: UUID
*   `name`: String
*   `initial_balance`: Decimal
*   `balance_date`: Date
*   `user_id`: UUID (Owner)

### Transaction
*   `id`: UUID
*   `name`: String
*   `type`: Enum (`payment`, `withdraw`, `deposit`, `interest`, `transfer`)
*   `amount`: Decimal
*   `target_account`: String
*   `account_id`: UUID
*   `date`: Date
*   `recurrency`: JSON (Optional)

## 3. API Endpoints

### Authentication
*   `POST /api/v1/login/access-token`: Get JWT access token.

### Users
*   `GET /api/v1/users/`: List users (Admin only).
*   `POST /api/v1/users/`: Create user (Admin only).
*   `GET /api/v1/users/me`: Get current user.
*   `PUT /api/v1/users/{user_id}`: Update user (Admin only).
*   `DELETE /api/v1/users/{user_id}`: Delete user (Admin only).

### Accounts
*   `GET /api/v1/accounts/`: List accounts.
*   `POST /api/v1/accounts/`: Create account.
*   `GET /api/v1/accounts/{account_id}`: Get account details.
*   `PUT /api/v1/accounts/{account_id}`: Update account.
*   `DELETE /api/v1/accounts/{account_id}`: Delete account.
*   `GET /api/v1/accounts/{account_id}/balance`: Get calculated balance at a specific date.
    *   Query Params: `target_date` (default: today).
*   `GET /api/v1/accounts/{account_id}/transactions/sum`: Get net total of all transactions in a date range.
    *   Query Params: `start_date`, `end_date`.
*   `GET /api/v1/accounts/{account_id}/transactions/type`: List transactions by type.
    *   Query Params: `type` (required), `start_date`, `end_date`.
*   `GET /api/v1/accounts/{account_id}/transactions/type/sum`: Get total amount for a specific transaction type.
    *   Query Params: `type` (required), `start_date`, `end_date`.
*   `GET /api/v1/accounts/{account_id}/transactions/target`: List transactions by target account (case-insensitive).
    *   Query Params: `target_account` (required), `start_date`, `end_date`.
*   `GET /api/v1/accounts/{account_id}/transactions/target/sum`: Get total amount for a specific target account.
    *   Query Params: `target_account` (required), `start_date`, `end_date`.

### Transactions
*   `GET /api/v1/transactions/`: List transactions.
    *   Query Params: `account_id`, `start_date`, `end_date`.
*   `POST /api/v1/transactions/`: Create transaction.
*   `POST /api/v1/transactions/import`: Bulk import from CSV.
*   `PUT /api/v1/transactions/{transaction_id}`: Update transaction.
*   `DELETE /api/v1/transactions/{transaction_id}`: Delete transaction.

## 4. Development

### Running Locally
The backend is containerized. Use Docker Compose from the root directory:
```bash
docker compose up --build backend
```

### Running Tests
(Add instructions for running tests if applicable)

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