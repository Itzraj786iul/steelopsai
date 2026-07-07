import { rmSync } from "node:fs";
import { join } from "node:path";

const nextDir = join(process.cwd(), ".next");

for (let attempt = 1; attempt <= 5; attempt += 1) {
  try {
    rmSync(nextDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
    console.log("Removed .next cache");
    process.exit(0);
  } catch (error) {
    if (attempt === 5) {
      console.warn("Could not fully remove .next (stop dev server first):", error.message);
      process.exit(0);
    }
    // brief sync pause between attempts on Windows file locks
    const end = Date.now() + 400 * attempt;
    while (Date.now() < end) {
      /* wait */
    }
  }
}
