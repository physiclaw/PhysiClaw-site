# PhysiClaw Site

The landing page for [**PhysiClaw**](https://github.com/physiclaw/PhysiClaw) — a robotic arm that
gives AI agents a physical body to operate any phone.

**Live:** [physiclaw.ai](https://physiclaw.ai)

Built with [Astro](https://astro.build) + [Tailwind CSS](https://tailwindcss.com), deployed on
[Vercel](https://vercel.com).

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

```
src/
├── layouts/Layout.astro   # <head>, fonts, OG/Twitter meta, dark/light theme toggle
├── pages/index.astro      # the landing page
└── styles/global.css      # Tailwind import + @theme design tokens (dark + light)
public/                    # SVG mascot, illustrations, favicons
astro.config.mjs           # Tailwind (Vite plugin) + Vercel adapter
```

## Deployment

Pushes to `main` deploy automatically to **Vercel** (`@astrojs/vercel` adapter) at `physiclaw.ai`.

## License

MIT
