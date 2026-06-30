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
scripts/stage-installers.mjs  # prebuild step: copies install/ → public/
scripts/fetch-downloads.mjs   # prebuild step: fetches release assets from PhysiClaw → public/downloads/
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
| `/downloads/firmware/fluidnc_4_0_3.zip` | [`firmware_fluidNC`](https://github.com/physiclaw/PhysiClaw/releases/tag/firmware_fluidNC) — FluidNC firmware bundle |
| `/downloads/local_vision_model.zip.b64.00`–`.03` | [`local-vision-model`](https://github.com/physiclaw/PhysiClaw/releases/tag/local-vision-model) — OmniParser icon detector (ONNX) |

At build time, the `prebuild` step (`scripts/fetch-downloads.mjs`) fetches these into
`public/downloads/`. The fetched files are build artifacts and are gitignored — to publish a
new build, update the corresponding GitHub release.

The vision model is 64 MiB, over Cloudflare Pages' 25 MiB per-file limit, so it's base64-encoded
and split into four ~21 MiB parts. To reassemble:

```sh
cat local_vision_model.zip.b64.* | base64 -d > local_vision_model.zip
```

## Deployment

Pushes to `main` deploy automatically. The build runs on both hosts:

- **Cloudflare Pages** — serves the static `dist/` output (build output directory: `dist`).
- **Vercel** — uses the `@astrojs/vercel` adapter output (`.vercel/output`).

`physiclaw.ai` points at whichever host is primary; both build from the same `astro build`.

## License

MIT
