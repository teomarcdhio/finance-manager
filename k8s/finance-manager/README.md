# Finance Manager Helm Chart

A Helm chart for deploying the Finance Manager application (Frontend & Backend) on Kubernetes.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.2.0+
- A running PostgreSQL database

## Installation

### 1. Database Prerequisite

This chart expects a PostgreSQL database to be available. By default, it looks for a service named `postgres` in the same namespace.

If you are using an external database or a cloud-managed PostgreSQL (like RDS or Cloud SQL), you need to update the `backend.env` values in `values.yaml`:

- `POSTGRES_SERVER`: The hostname of your database
- `POSTGRES_USER`: The database user
- `POSTGRES_DB`: The database name

### 2. Create the Database Secret

Security best practices require sensitive information like passwords to be managed via Kubernetes Secrets. Before installing the chart, verify the namespace you are deploying to and create the secret:

```bash
# Replace 'your-password' with your actual database password
kubectl create secret generic finance-db-secret \
  --from-literal=postgres-password='your-password'
```

If you wish to use a different secret name or key, update the `backend.secret` section in `values.yaml`.

### 3. Install the Chart

Install the chart using Helm:

```bash
# Install from the local directory
helm install finance-manager .
```

To install into a specific namespace:

```bash
helm install finance-manager . --namespace finance-ns --create-namespace
```

## Configuration

The following table lists the configurable parameters and their default values.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `backend.replicaCount` | Number of backend replicas | `1` |
| `backend.image.repository` | Backend image repository | `ghcr.io/teomarcdhio/finance-manager-backend` |
| `backend.image.tag` | Backend image tag | `latest` |
| `backend.service.port` | Backend service port | `8000` |
| `backend.env.POSTGRES_SERVER` | DB Hostname | `postgres` |
| `backend.env.POSTGRES_USER` | DB Username | `admin` |
| `backend.env.POSTGRES_DB` | DB Name | `finance_manager` |
| `frontend.replicaCount` | Number of frontend replicas | `1` |
| `frontend.image.repository` | Frontend image repository | `ghcr.io/teomarcdhio/finance-manager-frontend` |
| `frontend.image.tag` | Frontend image tag | `latest` |
| `frontend.service.port` | Frontend service port | `3000` |
| `frontend.ingress.enabled` | Enable Ingress for frontend | `true` |
| `frontend.ingress.hosts` | Frontend Ingress hosts | `finance.local` |

Refer to `values.yaml` for the complete list of variables.

## Accessing the Application

If Ingress is enabled and configured, you can access the application via the configured host (e.g., `http://finance.local`). Ensure your DNS or `/etc/hosts` file resolves to the Ingress Controller IP.

If Ingress is disabled, you can port-forward the frontend service:

```bash
kubectl port-forward svc/finance-manager-frontend 3000:3000
```
Then visit `http://localhost:3000`.
