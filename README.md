# CRM Backend (REST API)

Node.js · Express 5 · PostgreSQL (`pg`) · JWT · zod validation

## Setup

```bash
npm install
cp .env.example .env        # set DATABASE_URL and JWT_SECRET
npm start                   # tables are created automatically on first start
```

Need a quick Postgres? `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=crm postgres:16`
(or a free hosted one from Neon / Supabase – just paste its connection string into `DATABASE_URL`).

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | – | Register employee `{name, email, password}` → `{employee, token}` |
| POST | `/api/auth/login` | – | Login `{email, password}` → `{employee, token}` |
| GET | `/api/auth/me` | JWT | Current employee |
| POST | `/api/enquiries/public` | **none** | Public enquiry form `{name, email, courseInterest, phone?, message?}` |
| GET | `/api/enquiries/unclaimed` | JWT | All public (unclaimed) enquiries. `?page=1&limit=20` |
| POST | `/api/enquiries/:id/claim` | JWT | Claim an enquiry → becomes private to you |
| GET | `/api/enquiries/mine` | JWT | Enquiries claimed by the logged-in employee. `?page=1&limit=20` |

Send the token as `Authorization: Bearer <token>`.

### Claim responses
- `200` claimed · `404` no such enquiry · `409` already claimed (by you or someone else)

Claiming is one atomic SQL `UPDATE ... WHERE claimed_by IS NULL`, so if two counselors click at the
same moment exactly one wins and the other gets `409`.

## Example

```bash
curl -X POST localhost:4000/api/enquiries/public -H 'Content-Type: application/json' \
  -d '{"name":"Ravi","email":"ravi@mail.com","courseInterest":"Data Science"}'

TOKEN=$(curl -s -X POST localhost:4000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Asha","email":"asha@co.com","password":"password123"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')

curl localhost:4000/api/enquiries/unclaimed -H "Authorization: Bearer $TOKEN"
curl -X POST localhost:4000/api/enquiries/<id>/claim -H "Authorization: Bearer $TOKEN"
curl localhost:4000/api/enquiries/mine -H "Authorization: Bearer $TOKEN"
```

## Tests

`DATABASE_URL=<disposable test db> npm test` – end-to-end run of every endpoint. **It truncates tables.**

## Layout
```
src/
  app.js  server.js
  config/       env.js, db.js (pool + auto schema)
  middleware/   auth.js (JWT), validate.js, errorHandler.js
  controllers/  authController.js, enquiryController.js
  routes/       authRoutes.js, enquiryRoutes.js
test/e2e.js
```

## Notes
- Public form is rate-limited (30 / 15 min / IP) since it is unauthenticated.
- Passwords hashed with bcrypt; login errors don't reveal whether an email exists.
