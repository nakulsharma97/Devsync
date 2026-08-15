# DevSync Frontend

React 19 + TypeScript single-page application for the DevSync developer
collaboration platform. Served by Vite in development and nginx (unprivileged
container) in production; the API and WebSocket are reached same-origin through
a reverse proxy.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19, TypeScript 5.9 |
| Build | Vite 7 (`tsc -b && vite build`) |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`), shadcn/ui primitives (Radix UI), CSS variables + `next-themes` for dark/light |
| Routing | React Router v7 (imports from `react-router`) |
| HTTP | axios (interceptor attaches the Bearer access token, handles refresh via HttpOnly cookie, redirects to `/auth` on failure) |
| Realtime | STOMP over WebSocket (`@stomp/stompjs` + SockJS fallback) |
| Forms | react-hook-form + zod |
| Icons | lucide-react |
| Charts | recharts |
| Toasts | sonner |
| Testing | Vitest + Testing Library (jsdom) |
| Error tracking | `@sentry/react` + `@sentry/vite-plugin` (optional, `VITE_SENTRY_DSN`) |

## Scripts

```bash
npm run dev        # Vite dev server (see .env.development for API/WS URLs)
npm run build      # tsc -b && vite build (production bundle)
npm run lint       # eslint .
npm test           # vitest run (92 tests across routes, pages, auth, hooks)
npm run preview    # serve the production build locally
```

Either `npm` or `bun` works — both `package-lock.json` and `bun.lock` are
maintained.

## Project layout

```
src/
├── components/      # shared UI (ui/ = shadcn primitives) + feature components
├── contexts/        # AuthContext, ThemeContext, ToastNotificationProvider, etc.
├── hooks/           # custom hooks (typing, websocket, presence, …)
├── pages/           # one file per route (Landing, Auth, Dashboard, Projects,
│                    #   Board, Chat, Messages, Files, Docs, Members, Activity,
│                    #   Notifications, Profile, Settings, Analytics, Admin/*, Billing)
├── services/        # typed API clients (authService, projectService,
│                    #   notificationService, conversationService, …)
├── lib/             # utilities, websocket client, routing helpers
├── main.tsx         # router definition + providers
└── index.css        # Tailwind theme (CSS variables for light/dark)
```

## Authentication & routing

- Access tokens (15 min default) are stored client-side and attached by the
  axios interceptor; refresh tokens live in an HttpOnly, SameSite=Lax cookie
  scoped to `/api/auth` and rotate on every refresh.
- `AuthContext` hydrates the session on boot, exposes `login`/`logout`/
  `refreshUser`, and publishes auth state to the whole tree.
- Protected routes are wrapped so unauthenticated users are redirected to
  `/auth`; `AdminRoute` additionally gates `/admin/*` (UX-only — the backend
  enforces `ROLE_ADMIN` on `/api/admin/**`).

## Real-time (WebSocket/STOMP)

- Connect to `/ws` (same-origin, JWT-authenticated), subscribe to
  `/user/queue/messages`, `/user/queue/notifications`, `/topic/room/{id}`,
  and `/topic/presence`.
- The typing hook fires on the first keystroke, auto-stops after 3s, stops on
  send and on unmount — all timers are cleaned up.
- Incoming notifications update the bell badge and refresh the notifications
  page via a `devsync:notifications-changed` window event.

## Environment variables (frontend)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | API base URL (same-origin in production; `http://localhost:8080/api` in `.env.development`) |
| `VITE_WS_URL` | `/ws` | WebSocket URL (same-origin in production) |
| `VITE_SENTRY_DSN` | – | Sentry DSN for client-side error reporting |

Production is built with the same-origin defaults and proxied by nginx, so no
hostname is baked into the bundle and `ws`/`wss` derives from the page protocol.

## Conventions

- Pages live in `src/pages`, shared components in `src/components`, UI
  primitives in `src/components/ui` — reuse them instead of hand-rolling.
- Theme via CSS variables in `src/index.css`; components must render correctly
  in both light and dark mode (no hardcoded white/black where a variable exists).
- All pages are mobile-responsive and centered with a max-width container —
  no horizontal overflow.
- Use `sonner` for toasts, keep buttons keyboard-accessible with visible focus
  states, and use loading/empty/error states (never a blank screen).
