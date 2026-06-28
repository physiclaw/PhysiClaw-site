// Fetches the canonical install scripts from the PhysiClaw repo root and writes
// them into public/ so they're served from the site root:
//   curl -fsSL https://physiclaw.ai/install.sh | bash
//   powershell -ExecutionPolicy Bypass -c "irm https://physiclaw.ai/install.ps1 | iex"
// Runs automatically before `pnpm build` via the "prebuild" npm script.
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO_RAW = 'https://raw.githubusercontent.com/physiclaw/PhysiClaw/main';
const FILES = ['install.sh', 'install.ps1'];

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
await mkdir(publicDir, { recursive: true });

await Promise.all(
  FILES.map(async (file) => {
    const res = await fetch(`${REPO_RAW}/${file}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${file}: ${res.status} ${res.statusText}`);
    }
    const body = await res.text();
    await writeFile(join(publicDir, file), body);
    console.log(`fetched ${file} (${body.length} bytes) → public/${file}`);
  }),
);
