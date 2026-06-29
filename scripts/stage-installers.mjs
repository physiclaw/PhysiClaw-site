// Stages the install scripts for the site.
//
// The PhysiClaw repo is the single source of truth for install.sh / install.ps1.
// A GitHub Action there syncs them into this repo's /install dir on every change.
// At build time we copy them into public/ so they're served from the site root:
//   curl -fsSL https://physiclaw.ai/install.sh | bash
//   powershell -ExecutionPolicy Bypass -c "irm https://physiclaw.ai/install.ps1 | iex"
// Runs automatically before `pnpm build` via the "prebuild" npm script.
import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const FILES = ['install.sh', 'install.ps1'];

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'install');
const publicDir = join(root, 'public');
await mkdir(publicDir, { recursive: true });

await Promise.all(
  FILES.map(async (file) => {
    try {
      await copyFile(join(srcDir, file), join(publicDir, file));
    } catch (err) {
      if (err.code === 'ENOENT') {
        // No source = the PhysiClaw Action hasn't synced /install yet. Fail loudly
        // rather than ship the site without a working installer.
        throw new Error(`Missing install/${file} — has the PhysiClaw sync Action run?`);
      }
      throw err;
    }
    console.log(`staged install/${file} → public/${file}`);
  }),
);
