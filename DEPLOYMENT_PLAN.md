# Notes Game — Deployment & Quality Improvement Plan

This document provides a comprehensive plan to prepare the Passing Notes game for public deployment, addressing the README TODOs, quality improvements, hosting recommendations, and containerization strategies.

---

## Completed Items ✅

| Item | Status | Notes |
|------|--------|-------|
| **Kick bug fix** | Done | Fixed `delete socketClients[socket.gameId][socket.username]` → `kickedUser` in `server/src/index.ts` |
| **Environment-based config** | Done | Server uses `SESSION_SECRET`, `API_PORT`, `IO_PORT`, `CLIENT_URL`, etc. Client uses `REACT_APP_API_ROOT`, `REACT_APP_SOCKET_ROOT`. See `.env.example`. |

---

## Part 1: Notes-Specific TODO Items

### 1. Improve AI Logic (Not Just Random Moves) ✅

**Status:** Implemented. The AI has been rewritten to match the Notes game and uses heuristic-based logic instead of random moves.

**Implementation:**
- **Synced AI with game logic:** `ai/index.ts` now uses PHASE_SUBMITTING, PHASE_SELECTING, ACTION_SUBMIT, ACTION_SKIP, ACTION_SELECT.
- **Smart card selection (`ai/aiLogic.ts`):** In the submitting phase, the AI scores card combinations by: word count (3–8 words preferred), punctuation at end, filler words for structure, and keyword relevance to the prompt. Uses a greedy sampling approach to pick the best submission.
- **Smart answer selection:** In the selecting phase, the AI scores each answer by coherence, prompt relevance, and structure, then selects the highest-scoring one instead of random.
- **Login fix:** AI now uses `username` for login (matching the server's nickname-only auth).

---

### 2. Handle Kick Request Mid-Game ✅

**Status:** Fixed. The bug was in `server/src/index.ts`—when kicking a user, the code incorrectly deleted `socket.username` (the host) instead of `kickedUser` from `socketClients`. This is now corrected.

**Additional considerations:**
- When a player is kicked mid-game, the game state (`chairs`, `currentTurn`, etc.) must be updated correctly. `removePlayerFromGame` already handles chair removal and turn advancement.
- Ensure the kicked player's client receives the `kick` event and navigates away cleanly (already implemented in `Game.tsx`).
- Consider: Should the game end if the kicked player was the current turn? The current logic advances `currentTurn` when removing a chair—verify edge cases (e.g., last player kicked).

---

### 3. Change Inactive Game Logic to Include No Recent Actions on Sockets ✅

**Status:** Implemented. Games are now considered inactive when all players have disconnected **or** when there has been no socket activity for 30 minutes.

**Implementation:**
- Added `lastActivityAt` (timestamp) to `GameMeta` in shared.
- Added `inactiveActionTimeout` (30 minutes) to `Constants.ts`.
- Added `recordActivity(gameId)` helper that records `Date.now()` on each game action.
- `recordActivity` is called on: `message`, `set-color`, `set-ready`, `leave`, `begin-request`, `submit`, `skip`, `select`, `kick-request`, `back-to-lobby`, `restart`, and when a player connects.
- Cleanup loop now considers a game inactive if: (a) all players disconnected, OR (b) no activity for `inactiveActionTimeout` (30 min).
- Inactive games still use the existing `removeAfter` (5 min) grace period before removal.

---

## Part 2: General TODO Items

### 1. Add Captcha for Login After Several Incorrect Attempts ✅

**Status:** Implemented. After 5 failed login attempts from an IP, reCAPTCHA v2 is required. Captcha is disabled in development (`NODE_ENV !== 'production'`) or when `DISABLE_CAPTCHA=true`.

**Implementation:**
- Failed attempts tracked per IP (in-memory). After 5 failures within 15 minutes, captcha required.
- `GET /login-captcha-required` returns whether captcha is needed for the current IP.
- Login accepts `recaptchaResponse` when captcha is required; verified server-side via Google's siteverify API.
- Attempt count resets on successful login; window resets after 15 minutes of no attempts.

---

### 2. Add Captcha for Registering (Disable on Dev for AI Setup) ✅

**Status:** Implemented. Registration form requires reCAPTCHA v2 when captcha is enabled. Bypassed when `DISABLE_CAPTCHA=true` or `NODE_ENV !== 'production'` so the AI setup script works.

**Implementation:**
- `GET /register-captcha-required` returns whether captcha is needed for registration.
- Register endpoint verifies `recaptchaResponse` when captcha is enabled.
- AI setup continues to work with `SKIP_EMAIL_VERIFICATION` and `DISABLE_CAPTCHA` (or dev mode).

---

### 3. Add Message When Server Restart Is About to Occur

**Recommendations:**
- Use a process signal handler (`SIGTERM`, `SIGINT`) to:
  1. Set a flag `serverShuttingDown = true`.
  2. Emit a `server-restarting` event to all connected Socket.io clients with a countdown (e.g., "Server restarting in 60 seconds").
  3. Stop accepting new connections.
  4. After the delay, gracefully close sockets and exit.
- Optionally use `pm2` or similar for graceful shutdown in production.

---

### 4. Add Settings to Settings Page

**Current State:** `Settings.tsx` is a placeholder with only a heading.

**Recommendations:**
- **Nickname/username change** (if you add user accounts).
- **Sound toggle** (mute/unmute).
- **Theme** (light/dark) if supported.
- **Notifications** (browser notifications for turn alerts).
- **Accessibility** (font size, contrast).

---

## Part 3: Additional Quality Improvements

### Security & Hardening

| Item | Recommendation | Status |
|------|----------------|--------|
| **Session secret** | Use `process.env.SESSION_SECRET` in production; never hardcode. | ✅ Done |
| **CORS** | Use `CLIENT_URL` env var for allowed origin; no hardcoded production URLs. | ✅ Done |
| **Rate limiting** | Add `express-rate-limit` for login, register, and API endpoints. | Pending |
| **Input validation** | Validate `gameId`, `passphrase`, username length, and message length before processing. | Pending |
| **SQL injection** | Use parameterized queries (already done with `?` placeholders). | Done |
| **Password validation** | Re-enable `validate('password', ...)` in Shared.ts; currently bypassed. | Pending |

### Bug Fixes

- **Kick bug:** ✅ Fixed (see Part 1.2).
- **API response for login:** The login endpoint expects `FormData` but may receive JSON. Ensure `body-parser` handles both; the client sends FormData.
- **AI/login mismatch:** The AI uses `email`/`password` for login, but the current server login accepts `username` only. Align AI setup with the actual auth flow.

### UX Improvements

- **Reconnection:** Improve reconnection logic when socket drops (e.g., exponential backoff, retry limit).
- **Loading states:** Add skeleton loaders for game list and game canvas.
- **Error boundaries:** Wrap main routes in React error boundaries to prevent full white-screen on errors.
- **Mobile:** Improve touch targets and layout for small screens.

---

## Part 4: Hosting Recommendations

### Architecture Overview

The app uses:
- **Express API** (port 3001)
- **Socket.io** (port 3002)
- **React SPA** (static files served from server)
- **SQLite** (file-based persistence)

### Free Tier Options (with WebSocket support)

| Platform | Cost | WebSocket | Notes |
|----------|------|-----------|-------|
| **Render** | Free tier | ✅ Yes | 750 hrs/mo; spins down after 15 min idle; 5-min connection limit for WebSockets. |
| **Railway** | $5 trial, then $1/mo credit | ✅ Yes | Good for WebSockets; templates for game servers. |
| **Fly.io** | Free tier | ✅ Yes | Good for always-on apps; small free instances. |
| **Cyclic** | Free | ❌ Limited | Serverless; WebSockets may not persist. |
| **Heroku** | Paid only | ✅ Yes | No free tier since 2022. |

### Ad-Based / Monetization Hosting

**Note:** There is no mainstream "ad-supported free hosting" for Node.js backends. Most free tiers are usage-based. Options:

1. **Self-host on a VPS** (e.g., DigitalOcean $4–6/mo, or free Oracle Cloud tier) and monetize via:
   - In-game ads (e.g., Google AdSense on the client)
   - Optional premium features

2. **Game portals** (e.g., itch.io, Kongregate): Host the **static client** there; run the **server** elsewhere (Render, Railway, Fly.io). The client would connect to your external API/Socket.io URL.

3. **Replit** (free tier): Can run full-stack apps; may have WebSocket limits.

### Recommended Hosting Strategy

**For a free public deployment:**

1. **Render** (primary): Deploy the combined server (API + Socket.io + static files) as a single service. Accept the 15–minute spin-down delay for free tier.
2. **Alternative:** **Railway** or **Fly.io** if you need more reliable uptime and can afford a small monthly cost.

**For production with budget:**

1. **Fly.io** or **Railway** for the backend.
2. **Cloudflare Pages** or **Netlify** for the static client (optional; or keep serving from the same server).
3. **SQLite** is fine for single-instance; for multi-instance, consider **Turso** (SQLite-compatible, serverless) or **PostgreSQL** on Railway/Fly.

---

## Part 5: Containerization & Deployment

### Docker Setup

**Recommended structure:**

```
notes-game/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── client/
├── server/
└── shared/
```

**Dockerfile (multi-stage):**

```dockerfile
# Stage 1: Build client
FROM node:20-alpine AS client-build
WORKDIR /app
COPY client/package*.json ./client/
COPY shared/ ./shared/
RUN cd client && npm ci --omit=dev
COPY client/ ./client/
RUN cd client && npm run build

# Stage 2: Build server

FROM node:20-alpine AS server-build
WORKDIR /app
COPY server/package*.json ./server/
COPY shared/ ./shared/
RUN cd server && npm ci --omit=dev
COPY server/ ./server/
RUN cd server && npm run build  # if you have a build step

# Stage 3: Production image
FROM node:20-alpine
WORKDIR /app
COPY --from=server-build /app/server/ ./server/
COPY --from=client-build /app/client/build ./server/public
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
USER appuser
EXPOSE 3001 3002
```

**Note:** The server currently uses two ports (API + Socket.io). You may need to:
- Use a single port with Socket.io attaching to the same HTTP server, or
- Expose both ports in Docker and configure the reverse proxy accordingly.

**docker-compose.yml:**

```yaml
version: '3.8'
services:
  notes-game:
    build: .
    ports:
      - "3001:3001"
      - "3002:3002"
    volumes:
      - ./server/data:/app/server/data  # Persist SQLite DB
    environment:
      - NODE_ENV=production
      - SESSION_SECRET=${SESSION_SECRET}
```

### .dockerignore

```
node_modules
.git
client/build
*.log
.env
```

### Deployment Workflow

1. **CI/CD:** Use GitHub Actions to build and push to a registry (e.g., GitHub Container Registry) on push to `main`.
2. **Render:** Connect the repo; use the Dockerfile or build commands. Set environment variables in the dashboard.
3. **Railway:** Connect repo; auto-detect; add `SESSION_SECRET` and other env vars.
4. **Fly.io:** `fly launch` and `fly deploy`; configure `fly.toml` for ports and scaling.

---

## Part 6: Implementation Priority

| Priority | Item | Effort | Impact | Status |
|----------|------|--------|--------|--------|
| P0 | Fix kick bug (line 613) | Low | High | ✅ Done |
| P0 | Environment-based config (SESSION_SECRET, CORS) | Low | High | ✅ Done |
| P1 | Inactive game logic (last activity) | Medium | Medium | ✅ Done |
| P1 | Server restart message | Medium | Medium | Pending |
| P1 | Docker setup | Medium | High | Pending |
| P2 | Captcha for login/register | Medium | High | ✅ Done |
| P2 | AI logic improvements | High | Medium | ✅ Done |
| P2 | Settings page | Low | Low | Pending |
| P3 | Rate limiting, input validation | Medium | High | Pending |
| P3 | UX improvements | Medium | Medium | Pending |

---

## Environment Configuration

**Server:** Set variables in `.env` or your deployment environment. See `.env.example` for required and optional variables. In production, `SESSION_SECRET` is required and the server will fail to start if missing.

**Client:** For production builds, set `REACT_APP_API_ROOT`, `REACT_APP_SOCKET_ROOT`, and optionally `REACT_APP_RECAPTCHA_SITE_KEY` before running `npm run build`. For local development, defaults point to `localhost:3001` and `localhost:3002`.

---

## Summary

This plan addresses all README TODOs, provides hosting and containerization guidance, and documents completed work. P0 items (kick bug fix, environment-based config) are complete. Next steps: P1 items (inactive game logic, server restart message, Docker setup) and P2 (captcha, AI improvements).
