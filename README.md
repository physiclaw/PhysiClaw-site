# PhysiClaw Site

The landing page for [**PhysiClaw**](https://github.com/physiclaw/PhysiClaw) — a robotic arm that
gives AI agents a physical body to operate any phone.

**Live:** [physiclaw.ai](https://physiclaw.ai)

Built with [Astro](https://astro.build) + [Tailwind CSS](https://tailwindcss.com), deployed on
[Cloudflare Pages](https://pages.cloudflare.com) and [Vercel](https://vercel.com).

## Related repos

| Repo | Purpose |
| ---- | ------- |
| **physiclaw/PhysiClaw-site** (this repo) | the marketing landing page → `physiclaw.ai` |
| [physiclaw/docs-site](https://github.com/physiclaw/docs-site) | the documentation site → `docs.physiclaw.ai` |
| [physiclaw/PhysiClaw](https://github.com/physiclaw/PhysiClaw) | the hardware + MCP server code (and the docs *content*) |

The docs build is a **separate repo** — see [physiclaw/docs-site](https://github.com/physiclaw/docs-site).
This repo is just the landing page.

## Local development

Requires **Node ≥ 22.12.0** and **pnpm**.

```sh
git clone https://github.com/physiclaw/PhysiClaw-site.git
cd PhysiClaw-site
pnpm install
pnpm dev          # http://localhost:4321
```

| Command        | Action                                   |
| -------------- | ---------------------------------------- |
| `pnpm dev`     | Start the dev server at `localhost:4321` |
| `pnpm build`   | Build the production site to `./dist/`   |
| `pnpm preview` | Preview the production build locally     |

## Project structure

```text
src/
├── layouts/Layout.astro   # <head>, fonts, OG/Twitter meta, dark/light theme toggle
├── pages/index.astro      # the landing page
└── styles/global.css      # Tailwind import + @theme design tokens (dark + light)
public/                    # SVG mascot, illustrations, favicons
install/                   # install.sh + install.ps1, synced from the PhysiClaw repo (see below)
skills/                    # official skill tree, synced from the PhysiClaw repo (see below)
skills-source.json         # provenance for skills/ (commit, builtAt), written by the sync Action
scripts/stage-installers.mjs      # prebuild step: copies install/ → public/
scripts/fetch-downloads.mjs       # prebuild step: fetches release assets from PhysiClaw → public/downloads/
scripts/build-official-skills.mjs # prebuild step: packs skills/ → public/downloads/ zip + version endpoint
astro.config.mjs           # Tailwind (Vite plugin) + Vercel adapter (also emits dist/ for Cloudflare Pages)
```

## Install scripts

`physiclaw.ai/install.sh` and `physiclaw.ai/install.ps1` are served from this site so
users can run:

```sh
curl -fsSL https://physiclaw.ai/install.sh | bash
```

```powershell
powershell -ExecutionPolicy Bypass -c "irm https://physiclaw.ai/install.ps1 | iex"
```

The scripts' **single source of truth is the [PhysiClaw repo](https://github.com/physiclaw/PhysiClaw)**.
A GitHub Action there syncs them into this repo's `install/` directory on every change.
At build time, the `prebuild` step (`scripts/stage-installers.mjs`) copies `install/` into
`public/`, so they're served from the site root. The staged `public/install.*` copies are
build artifacts and are gitignored — edit the scripts in the PhysiClaw repo, never here.

## Downloads

Release assets from the [PhysiClaw repo](https://github.com/physiclaw/PhysiClaw) are served
under `physiclaw.ai/downloads/`:

| Path | Source release |
| ---- | -------------- |
| `/downloads/firmware/fluidnc.zip` | [`firmware_fluidNC`](https://github.com/physiclaw/PhysiClaw/releases/tag/firmware_fluidNC) — FluidNC firmware bundle (version-free name; the bundled `fluidnc_version.txt` records the FluidNC version) |
| `/downloads/local_vision_model.zip.b64.00`–`.03` | [`local-vision-model`](https://github.com/physiclaw/PhysiClaw/releases/tag/local-vision-model) — OmniParser icon detector (ONNX) |

At build time, the `prebuild` step (`scripts/fetch-downloads.mjs`) fetches these into
`public/downloads/`. The fetched files are build artifacts and are gitignored — to publish a
new build, update the corresponding GitHub release.

The vision model is 64 MiB, over Cloudflare Pages' 25 MiB per-file limit, so it's base64-encoded
and split into four ~21 MiB parts. To reassemble:

```sh
cat local_vision_model.zip.b64.* | base64 -d > local_vision_model.zip
```

## Official skills

The `physiclaw skills sync official` command downloads a zip of the official skills and
extracts it into `~/.physiclaw/official/`. This site builds and serves that package.

**Passive sync.** The skills' single source of truth is the PhysiClaw repo's `skills/`
directory. A GitHub Action there pushes the tree — plus a `skills-source.json` provenance
file (`{ repo, subdir, commit, builtAt }`) — into this repo. Both are Action-owned; don't hand-edit them.

**Build.** At build time, `scripts/build-official-skills.mjs` (a `prebuild` step) packages
`skills/` and emits three artifacts (all gitignored; regenerated each build):

All three share one namespace, `/downloads/official-skills/`:

| Path | What |
| ---- | ---- |
| `/downloads/official-skills/physiclaw_official_skills.zip` | `source.json` + the `skills/` tree, in the layout the client extracts verbatim |
| `/downloads/official-skills/physiclaw_official_skills.zip.sha256` | integrity checksum (`sha256sum` format) |
| `/downloads/official-skills/latest.json` | freshness signal (`application/json`) — `{ schemaVersion, commit, builtAt, skillCount }` |

The shipped `source.json` (inside the zip, alongside `skills/`) is **generated**, not
hand-authored — its `skills[]` manifest is derived from the files, so it can't drift:

| Field | Source | Meaning |
| ----- | ------ | ------- |
| `schemaVersion` | constant | Integer; bump on a breaking shape change. |
| `package` | constant | Package id (`physiclaw-official-skills`). |
| `commit` | provenance | Full PhysiClaw git SHA the tree was synced from — the **version identity & freshness key**. |
| `repo` / `subdir` | provenance | Where the tree was packed from (e.g. `physiclaw/PhysiClaw` · `skills`); falls back to constants if absent. |
| `builtAt` | provenance | ISO-8601 time (that commit's timestamp, in UTC). |
| `skills[]` | derived | One `{ name, path, description, hash }` per `skills/<name>/SKILL.md` — `name`/`description` from frontmatter, `path` zip-relative, `hash` = `sha256:` content digest of the skill directory. |

Each skill's `hash` is a **change-detection id** — a client compares it to what it has installed
to tell which skills changed between syncs and skip re-applying the rest. It is **not** package
integrity: a hash shipped inside the zip can't prove the zip wasn't tampered, so integrity stays
in the sibling `.sha256` computed over the downloaded zip bytes.

A client checks `/downloads/official-skills/latest.json` and only re-downloads when its stored
`commit` differs. If the Action hasn't synced `skills/` yet — or synced it without a `commit` in
`skills-source.json` (an incomplete sync) — the build skips this step cleanly and publishes no
package, rather than shipping one it can't version.

> **Publish note:** the version signal and the zip travel the same channel, so the checksum
> guards against corruption, not a coordinated MITM. Real tamper-proofing would need a signature.

## Deployment

Pushes to `main` deploy automatically. The build runs on both hosts:

- **Cloudflare Pages** — serves the static `dist/` output (build output directory: `dist`).
- **Vercel** — uses the `@astrojs/vercel` adapter output (`.vercel/output`).

`physiclaw.ai` points at whichever host is primary; both build from the same `astro build`.

## License

MIT
