# DevSync — Preview / dev-server run doc

Workspace (same as main checkout): `C:\Users\NAKULSHARMA\Downloads\developmentsync-main`
Frontend lives in `frontend/`. Vite config (`frontend/vite.config.ts`) already proxies `/api` and
`/ws` to `http://localhost:8080` and runs with `hmr: false` (required by Freebuff preview).

## How to reproduce the uncommitted artifacts

A fresh checkout of this workspace needs nothing copied — there is no `.env.local`. The
environment files (`frontend/.env.development`, `frontend/.env.production`) are committed, and
`frontend/node_modules` is already installed (npm). If dependencies are missing:

    cd frontend && npm install

> Note: the **root** `package.json` `dev` script shells out to `bun run dev`, but **bun is not
> installed** on this machine. Do NOT use the root script — run the frontend's own npm script
> (plain `vite`) from the `frontend/` directory as shown below.

## How to run the server

Default Vite port 5173 is usually occupied by a long-running dev server on this machine, so the
preview uses **port 5199** (`--strictPort`). If 5199 is taken, pick another free port.

Start detached (Windows) — stdout and stderr MUST go to different files:

    powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev','--','--port','5199','--strictPort' -WorkingDirectory 'C:\Users\NAKULSHARMA\Downloads\developmentsync-main\frontend' -RedirectStandardOutput 'C:\Users\NAKULSHARMA\Downloads\developmentsync-main\.freebuff\preview.log' -RedirectStandardError 'C:\Users\NAKULSHARMA\Downloads\developmentsync-main\.freebuff\preview.log.err' -WindowStyle Hidden -PassThru).Id"

Then confirm it answers HTTP before registering:

    curl -s -o /dev/null -w "%{http_code}" http://localhost:5199/    # expect 200

Register the preview with `register_preview` using `http://localhost:5199/` and the PID of the
`node` process listening on 5199 (find it with `netstat -ano | findstr :5199`).

## Known dev-environment behavior

- The API base URL in dev points at `http://localhost:8080/api` (absolute, from `.env.development`),
  so the browser calls the backend directly and the Vite proxy is bypassed. The backend's CORS
  allowlist does not include the `:5199` dev origin, so public landing endpoints
  (`/api/public/stats`, `/reviews`, `/plans`) are blocked in this preview and the landing page
  degrades to its empty states. That is expected and non-fatal; the full stack works when the
  frontend is served from an allowed origin (e.g. `:5173` or via nginx in production).
