# Letterbox — Frontend

A vibe-coded, cinema-journal frontend for **Letterbox**, a social movie-rating platform. Follow people whose taste you trust, rate films out of ten, and keep a record of every screening.

**Backend:** [github.com/ignacioDias/letterbox](https://github.com/ignacioDias/letterbox)

> This frontend was vibe coded. It favours a strong visual direction and quick iteration over enterprise-grade guardrails. It is functional and typechecked, but review it before shipping to production.

## What it does

- **Home** — reviews from the people you follow, with a lead review and a chronological feed.
- **Explore** — search the TMDB catalogue and Letterbox members by username, with separate films and members sections, and browse ranked daily trending films.
- **Film pages** — average score, rating count, sortable reviews, spoiler hiding, recommendations, and a 10-star IMDb-style rating flow.
- **Reviews** — create, edit, and delete your own review; like or dislike other reviews.
- **Profiles** — reviews, followers, and following for any member.
- **Settings** — update your profile, change your password, or delete your account.
- **Auth** — register and sign in with the backend's cookie-based sessions.

## Stack

- React 19 + TypeScript
- Vite
- React Router
- Lucide icons
- Custom CSS: Fraunces + Archivo, ink/amber palette, film-strip and projection-room details
- No UI component library

## Requirements

- Node.js 20+
- pnpm
- A running Letterbox backend with PostgreSQL and a TMDB API key

Backend setup lives in the [backend repository](https://github.com/ignacioDias/letterbox) and in [BACKEND_README.md](./BACKEND_README.md).

## Getting started

Start the backend:

```bash
git clone https://github.com/ignacioDias/letterbox.git
cd letterbox
cp .env.example .env
docker compose up -d
go run ./cmd/letterbox
```

Start the frontend in another terminal:

```bash
cd front-letterbox
pnpm install
pnpm dev
```

Open the frontend URL printed by Vite, usually <http://localhost:5173>.

## Environment

The dev ports live in `.env`:

```dotenv
VITE_PORT=5173
VITE_BACKEND_PORT=8080
VITE_API_BASE=/api/v1
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_PORT` | `5173` | Vite dev/preview port |
| `VITE_BACKEND_PORT` | `8080` | Backend port used by the Vite proxy |
| `VITE_API_BASE` | `/api/v1` | API path used by the browser |

Vite proxies both `/api` and `/static` to the backend. This keeps cookies same-site and avoids CORS during development. If you change the backend `PORT`, update `VITE_BACKEND_PORT` too.

## Scripts

```bash
pnpm dev        # start the dev server
pnpm build      # typecheck and build for production
pnpm preview    # preview the production build
pnpm typecheck  # TypeScript only
```

## Backend integration notes

- Authentication uses the backend's `HttpOnly` `session_id` cookie. Requests are sent with credentials included.
- Reviewer names on film pages are resolved with `GET /users/{user_id}` when available; otherwise the UI falls back to a member number.
- Lists are intentionally capped at 100 items in places (reviews, followers, following) because of the backend pagination limit.
- The following feed depends on `/reviews/following`; the reviewed backend copy includes a fix for its `follows` query. If you use an older backend revision, that feed may return an error.
- The frontend is an SPA. In production, configure your web server to serve `index.html` for unknown routes and proxy `/api` and `/static` to the backend.

## Project structure

```text
src/
  api/          typed API client and error handling
  components/   app shell, review cards, stars, movie grid, forms, states
  context/      auth session context
  hooks/        document title, movie/user lookup caches
  lib/          formatting and client-side caches
  pages/        home, explore, film, profile, auth, 404
  styles.css    design tokens, layout, components, responsive rules
```

## Verification

The frontend was smoke-tested with Playwright across sign-in, feed, search, film rating, profile updates, password change, logout, and account deletion.

```bash
pnpm typecheck
pnpm build
```
