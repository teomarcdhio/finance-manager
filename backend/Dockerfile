FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen

COPY . .
CMD ["uv", "run", "fastapi", "run", "app/main.py", "--port", "8000"]
