// Fetches release assets from the PhysiClaw repo and writes them into public/
// so they're served from physiclaw.ai/downloads/:
//   /downloads/firmware/fluidnc_4_0_3.zip       — FluidNC firmware bundle
//   /downloads/local_vision_model.zip.b64.00..03 — OmniParser icon detector (ONNX)
// Runs automatically before `pnpm build` via the "prebuild" npm script.
//
// Cloudflare Pages caps individual files at 25 MiB, so the 64 MiB vision model
// is base64-encoded (+33%) and split into 4 parts of ~21 MiB each. To rebuild:
//   cat local_vision_model.zip.b64.* | base64 -d > local_vision_model.zip
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RELEASES = 'https://github.com/physiclaw/PhysiClaw/releases/download';

// src   = release asset URL (under RELEASES)
// dest  = path under public/
// parts = if set, base64-encode and split into N files named `${dest}.b64.NN`
//         (Cloudflare Pages' 25 MiB/file limit); otherwise write dest verbatim.
const DOWNLOADS = [
  {
    src: `${RELEASES}/firmware_fluidNC/fluidnc_4_0_3.zip`,
    dest: 'downloads/firmware/fluidnc_4_0_3.zip',
  },
  {
    src: `${RELEASES}/local-vision-model/local_vision_model.zip`,
    dest: 'downloads/local_vision_model.zip',
    parts: 4,
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

async function write(relPath, data) {
  const p = join(publicDir, relPath);
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, data);
  console.log(`wrote ${relPath} (${data.length} bytes)`);
}

await Promise.all(
  DOWNLOADS.map(async ({ src, dest, parts }) => {
    const buf = await fetchBuffer(src, dest);
    if (!parts) {
      await write(dest, buf);
      return;
    }
    // base64-encode, then split the text into `parts` equal chunks. Consumers
    // concatenate all parts in order and base64-decode to restore the file.
    const b64 = buf.toString('base64');
    const chunk = Math.ceil(b64.length / parts);
    for (let i = 0; i < parts; i++) {
      const part = `${dest}.b64.${String(i).padStart(2, '0')}`;
      await write(part, b64.slice(i * chunk, (i + 1) * chunk));
    }
  }),
);
