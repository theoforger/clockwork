import { rmSync } from "node:fs"
import { DB_PATH } from "./env"

// Cleans up the scratch SQLite DB (and its WAL/journal sidecar files, if
// any) created for this run — see env.ts.
export default function globalTeardown(): void {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    rmSync(`${DB_PATH}${suffix}`, { force: true })
  }
}
