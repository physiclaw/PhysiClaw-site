// Packages the official skills into a downloadable zip served from physiclaw.ai.
//
// Passive sync: the PhysiClaw GitHub Action pushes the skill tree (and its
// provenance) into this repo. This build only *consumes* them:
//
//   Inputs  (Action-owned, committed by the sync push):
//     skills/<name>/SKILL.md …   the skill tree (source of truth: PhysiClaw repo root skills/)
//     skills-source.json         provenance: { repo, subdir, commit, builtAt } — the PhysiClaw snapshot synced from
//
//   Outputs (build artifacts, gitignored — all under public/downloads/official-skills/):
//     physiclaw_official_skills.zip         source.json + skills/ (client extracts verbatim)
//     physiclaw_official_skills.zip.sha256  integrity checksum (sha256sum format)
//     latest.json                           freshness endpoint { schemaVersion, commit, builtAt, skillCount }
//
// The shipped source.json is generated here: provenance + a skills[] manifest
// derived from each SKILL.md's frontmatter, so the manifest can't drift from the
// files actually shipped. If skills/ is absent (Action hasn't synced yet) the
// build skips cleanly. Runs before `pnpm build` via the "prebuild" npm script.
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = join(root, 'skills');
const provenancePath = join(root, 'skills-source.json');
const publicDir = join(root, 'public');
// All official-skills artifacts share one namespace under /downloads/.
const outDir = join(publicDir, 'downloads', 'official-skills');

const PACKAGE = 'physiclaw-official-skills';
const ZIP_NAME = 'physiclaw_official_skills.zip';
// Fallbacks only — the sync Action ships `repo`/`subdir` in the provenance, which win.
const REPO = 'physiclaw/PhysiClaw';
const SUBDIR = 'skills';

const exists = (p) => stat(p).then(() => true, () => false);

// Minimal SKILL.md frontmatter reader: single-line `key: value` pairs from the
// leading --- … --- block (the convention skills are authored in).
function frontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const out = {};
  if (!m) return out;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^(".*"|'.*')$/.test(v)) v = v.slice(1, -1);
    out[kv[1]] = v;
  }
  return out;
}

// All files under `dir`, as '/'-joined paths relative to `base` (default `root`).
async function walk(dir, base = root) {
  const out = [];
  for (const e of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(full, base));
    else if (e.isFile()) out.push(relative(base, full).split(sep).join('/'));
  }
  return out;
}

// Content digest of one skill directory — sha256 over its files' paths + bytes,
// relative to the skill dir so it depends only on the skill's own contents.
// A change-detection id (which skills changed between syncs), not an integrity
// guarantee. Prefixed `sha256:` so the algorithm can migrate later.
async function hashSkill(dir) {
  const files = (await walk(dir, dir)).sort();
  const h = createHash('sha256');
  for (const rel of files) h.update(rel).update('\0').update(await readFile(join(dir, rel)));
  return `sha256:${h.digest('hex')}`;
}

// ── Dependency-free, deterministic ZIP writer (STORED / no compression).
// Skills are small text files, so storing uncompressed keeps zero extra deps and
// produces byte-stable output. ────────────────────────────────────────────────
const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
// DOS date/time in UTC so output doesn't depend on the build host's timezone.
function dosStamp(date) {
  const y = Math.max(1980, date.getUTCFullYear());
  return {
    time: ((date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | (date.getUTCSeconds() >> 1)) & 0xffff,
    day: (((y - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate()) & 0xffff,
  };
}
function makeZip(entries, date) {
  const { time, day } = dosStamp(date);
  const parts = [];
  const central = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);           // version needed
    local.writeUInt16LE(0x0800, 6);       // flag bit 11: UTF-8 filenames
    local.writeUInt16LE(0, 8);            // method: stored
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18); // compressed size
    local.writeUInt32LE(data.length, 22); // uncompressed size
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);           // extra length
    parts.push(local, nameBuf, data);

    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);             // version made by
    cen.writeUInt16LE(20, 6);             // version needed
    cen.writeUInt16LE(0x0800, 8);         // flag bit 11: UTF-8
    cen.writeUInt16LE(0, 10);             // method: stored
    cen.writeUInt16LE(time, 12);
    cen.writeUInt16LE(day, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(data.length, 20);
    cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28);
    cen.writeUInt32LE(0, 30);             // extra + comment length (2+2)
    cen.writeUInt16LE(0, 34);             // disk number start
    cen.writeUInt16LE(0, 36);             // internal attrs
    cen.writeUInt32LE(0, 38);             // external attrs
    cen.writeUInt32LE(offset, 42);        // local header offset
    central.push(cen, nameBuf);

    offset += local.length + nameBuf.length + data.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);   // entries on this disk
  end.writeUInt16LE(entries.length, 10);  // total entries
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);          // central dir offset
  return Buffer.concat([...parts, centralBuf, end]);
}

// ── main ──
if (!(await exists(skillsDir))) {
  console.log('build-official-skills: no skills/ dir — skipping (nothing to publish yet)');
  process.exit(0);
}

const provenance = (await exists(provenancePath))
  ? JSON.parse(await readFile(provenancePath, 'utf8'))
  : {};

// `commit` (the PhysiClaw SHA the tree was synced from) is the version identity
// and freshness key — always a real git SHA, never a stand-in. Without it the
// sync is incomplete, so we don't publish a package we couldn't version; skip
// cleanly and let the rest of the site build.
if (!provenance.commit) {
  console.warn('build-official-skills: skills/ present but skills-source.json has no "commit" — skipping (sync incomplete)');
  process.exit(0);
}
const commit = provenance.commit;
const builtAt = provenance.builtAt || new Date().toISOString();

// Discover skills → manifest (sorted, deterministic).
const skillNames = (await readdir(skillsDir, { withFileTypes: true }))
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort((a, b) => a.localeCompare(b));

const skills = [];
for (const name of skillNames) {
  const md = join(skillsDir, name, 'SKILL.md');
  if (!(await exists(md))) {
    console.warn(`  skills/${name}: no SKILL.md — skipping`);
    continue;
  }
  const fm = frontmatter(await readFile(md, 'utf8'));
  if (fm.name && fm.name !== name) console.warn(`  skills/${name}: frontmatter name "${fm.name}" ≠ dir name`);
  skills.push({
    name,
    path: `skills/${name}`,
    description: (fm.description || '').trim(),
    hash: await hashSkill(join(skillsDir, name)),
  });
}
if (skills.length === 0) throw new Error('skills/ contains no <name>/SKILL.md — nothing to package');

const skillFiles = await walk(skillsDir);

// Generated manifest shipped inside the zip. Provenance (commit/repo/subdir/
// builtAt) says where the tree came from; skills[] is derived from the files so
// it can't drift. Each skill's `hash` is a content digest for change detection
// (which skills changed between syncs) — NOT package integrity: a hash shipped
// inside the zip can't prove the zip wasn't tampered, so integrity stays in the
// sibling .sha256 over the zip bytes.
const sourceJson = {
  schemaVersion: 1,
  package: PACKAGE,
  commit,
  repo: provenance.repo || REPO,
  subdir: provenance.subdir || SUBDIR,
  builtAt,
  skills,
};

// Zip = source.json (at root, outside skills/) + the whole skills/ tree.
const entries = [
  { name: 'source.json', data: Buffer.from(JSON.stringify(sourceJson, null, 2) + '\n', 'utf8') },
  ...await Promise.all(skillFiles.map(async (rel) => ({ name: rel, data: await readFile(join(root, rel)) }))),
];
const zip = makeZip(entries, new Date(builtAt));
const zipHash = createHash('sha256').update(zip).digest('hex');

await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, ZIP_NAME), zip);
await writeFile(join(outDir, `${ZIP_NAME}.sha256`), `${zipHash}  ${ZIP_NAME}\n`);
await writeFile(
  join(outDir, 'latest.json'),
  JSON.stringify({ schemaVersion: 1, commit, builtAt, skillCount: skills.length }) + '\n',
);

console.log(`built official-skills/${ZIP_NAME} — ${skills.length} skill(s), ${zip.length} bytes, sha256 ${zipHash.slice(0, 12)}…`);
