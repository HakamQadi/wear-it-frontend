# Wear It Frontend

Next.js storefront + `/admin` interface.

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Requires the API at `NEXT_PUBLIC_API_URL` (default `http://localhost:4000/api`).

The virtual fitting room sends the selected person photo, product garment reference, and optional prompt to the backend AI try-on endpoint. The backend must have `OPENAI_API_KEY` configured.
