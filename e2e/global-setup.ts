import fs from "node:fs";
import path from "node:path";

const DIST_INDEX = path.join(__dirname, "..", "dist", "index.html");

/**
 * Fail fast before Playwright boots the browser when the static export is missing.
 */
export default function globalSetup(): void {
  if (!fs.existsSync(DIST_INDEX)) {
    throw new Error(
      [
        "E2E requires a web export in dist/.",
        "Run: npm run e2e:build",
        "Then: npm run e2e"
      ].join("\n")
    );
  }
}
