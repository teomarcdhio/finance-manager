# Nivetek Finance Manager

## 1. Project Overview
A lightweight personal finance management system featuring a FastAPI backend and a Next.js frontend. The goal is to track accounts, manage recurring transactions, and visualize spending patterns.

## 2. Tech Stack

### Backend
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12+)
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

## 3. Getting Started

### Prerequisites
- Docker and Docker Compose installed on your machine.

### Running the Application

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd finance-manager
    ```

2.  **Environment Setup:**
    The project uses a `.env` file for configuration. A sample file `.env.sample` is provided. Copy it to `.env` and fill in your values:
    ```bash
    cp .env.sample .env
    ```

    **Important:** You must generate a secure `JWT_SECRET` for authentication to work securely. You can generate one using:
    ```bash
    openssl rand -hex 32
    ```
    Copy the output string into your `.env` file as the value for `JWT_SECRET`. This key is used to sign and verify user session tokens.

3.  **Start the services:**
    ```bash
    docker compose up --build -d
    ```

4.  **Access the application:**
    *   **Backend API:** `http://localhost:8000`
    *   **API Documentation (Swagger UI):** `http://localhost:8000/docs`
    *   **Frontend:** `http://localhost:3000` (Once implemented)

### Default Credentials
*   **Username:** `admin`
*   **Password:** `admin`

## 4. Project Structure
*   `backend/`: FastAPI application code, models, and API endpoints.
*   `frontend/`: Next.js application code (Work in Progress).
*   `docker-compose.yml`: Orchestration for Backend, Frontend, and Database.
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


## 8. Dev environment

### Backend 
```bash
cd backend
uv run fastapi run app/main.py --port 8000
```
### Frontend
```bash
cd frontend
npm install 
npm run dev
```