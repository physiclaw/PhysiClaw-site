// Fetches release assets from the PhysiClaw repo and writes them into public/
// so they're served from physiclaw.ai/downloads/:
//   /downloads/firmware/fluidnc_4_0_3.zip   — FluidNC firmware bundle
//   /downloads/local_vision_model.zip       — OmniParser icon detector (ONNX)
// Runs automatically before `pnpm build` via the "prebuild" npm script.
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RELEASES = 'https://github.com/physiclaw/PhysiClaw/releases/download';

// src = release asset URL (under RELEASES); dest = path under public/.
const DOWNLOADS = [
  {
    src: `${RELEASES}/firmware_fluidNC/fluidnc_4_0_3.zip`,
    dest: 'downloads/firmware/fluidnc_4_0_3.zip',
  },
  {
    src: `${RELEASES}/local-vision-model/local_vision_model.zip`,
    dest: 'downloads/local_vision_model.zip',
  },
];

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

// Retry transient network errors (connect timeouts, dropped sockets) — large
// assets occasionally fail mid-handshake on CI/build hosts.
async function fetchBuffer(url, dest, attempts = 4) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url); // follows GitHub's redirect to the asset CDN
      if (!res.ok) {
        // A bad status (e.g. 404) is not transient — fail immediately.
        throw new Error(`Failed to fetch ${dest}: ${res.status} ${res.statusText}`);
      }
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (i === attempts || err.message.startsWith('Failed to fetch')) throw err;
      console.warn(`  ${dest}: attempt ${i} failed (${err.cause?.code ?? err.message}), retrying…`);
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
}

await Promise.all(
  DOWNLOADS.map(async ({ src, dest }) => {
    const buf = await fetchBuffer(src, dest);
    const destPath = join(publicDir, dest);
    await mkdir(dirname(destPath), { recursive: true });
    await writeFile(destPath, buf);
    console.log(`fetched ${dest} (${buf.length} bytes)`);
  }),
);
