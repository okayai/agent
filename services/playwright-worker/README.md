# Okay Playwright Worker

Isolated physical browser execution service for Okay. The React control plane never receives cookies, storage state, or credential values.

## Run locally

```bash
cd services/playwright-worker
npm install
npx playwright install chromium
OKAY_WORKER_TOKEN=development-secret npm start
```

The service exposes a small versioned API:

- `GET /health`
- `POST /v1/contexts`
- `POST /v1/contexts/:id/navigate`
- `GET /v1/contexts/:id/snapshot`
- `POST /v1/contexts/:id/actions`
- `DELETE /v1/contexts/:id`

Production deployments must set `NODE_ENV=production` and `OKAY_WORKER_TOKEN`, terminate TLS in front of the worker, restrict ingress to the Okay control plane, and use a sandboxed non-root container.
