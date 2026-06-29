// Fetches the FluidNC firmware bundle from the PhysiClaw GitHub release and
// writes it into public/ so it's served at:
//   https://physiclaw.ai/downloads/firmware/fluidnc_4_0_3.zip
// Runs automatically before `pnpm build` via the "prebuild" npm script.
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SRC = 'https://github.com/physiclaw/PhysiClaw/releases/download/firmware_fluidNC/fluidnc_4_0_3.zip';
const DEST = 'downloads/firmware/fluidnc_4_0_3.zip';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const destPath = join(publicDir, DEST);
await mkdir(dirname(destPath), { recursive: true });

const res = await fetch(SRC); // follows GitHub's redirect to the asset CDN
if (!res.ok) {
  // Fail the build rather than ship a missing/HTML-404 download.
  throw new Error(`Failed to fetch firmware: ${res.status} ${res.statusText}`);
}
const buf = Buffer.from(await res.arrayBuffer());
await writeFile(destPath, buf);
console.log(`fetched firmware (${buf.length} bytes) → public/${DEST}`);
