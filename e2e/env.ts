import os from "node:os"
import path from "node:path"

// Fixed rather than randomized: the two webServer entries below and every
// spec file need to agree on the same values, and nothing here needs to
// avoid colliding with anything else on a CI runner or a dev machine.
export const API_PORT = 3000
export const WEB_PORT = 5173

export const API_BASE_URL = `http://127.0.0.1:${API_PORT}`
export const WEB_BASE_URL = `http://127.0.0.1:${WEB_PORT}`

// A scratch SQLite DB for the whole run, isolated from any DB a developer
// might have running locally. Migrations run automatically on API startup
// (see api/src/main.rs); global-teardown.ts deletes it afterwards.
export const DB_PATH = path.join(
  os.tmpdir(),
  `clockwork-e2e-${process.pid}.db`
)
