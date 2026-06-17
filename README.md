# PhysiClaw Site

The **landing page** and the **docs renderer** for [**PhysiClaw**](https://github.com/physiclaw/PhysiClaw) — a robotic arm that gives AI agents a physical body to operate any phone.

| Surface | URL | Source |
| ------- | --- | ------ |
| Landing page | [physiclaw.ai](https://physiclaw.ai) | this repo |
| Documentation | [docs.physiclaw.ai](https://docs.physiclaw.ai) | docs **content** in [`physiclaw/PhysiClaw`](https://github.com/physiclaw/PhysiClaw) → rendered by this repo |

Built with [Astro](https://astro.build) + [Tailwind CSS](https://tailwindcss.com) for the landing page and [Starlight](https://starlight.astro.build) for the docs, deployed on [Vercel](https://vercel.com).

## What this repo is

This repo holds **presentation, not docs content**:

1. **Landing page** (`/`) — the marketing site, deployed to `physiclaw.ai`.
2. **Docs renderer / theme** — an Astro **Starlight** site that turns the Markdown in the PhysiClaw **code** repo into the static docs at `docs.physiclaw.ai`. The docs *content* does **not** live here.

Keeping docs content in the code repo means documentation ships in the **same pull request** as the code it describes, while this repo owns all presentation (theme, layout, navigation, search, i18n). The landing page and docs are themed to a **consistent brand** — see [Brand theming](#docs-renderer-stack).

## Architecture

Two repos, two Vercel deployments, one consistent brand.

```
┌──────────────────────────────┐                ┌───────────────────────────────────┐
│  physiclaw/PhysiClaw (code)   │                │  physiclaw/PhysiClaw-site (here)   │
│                               │   trigger on   │                                    │
│  docs/            ← source    │   docs/**      │  Landing page    (Astro+Tailwind)  │
│   ├─ intro.mdx       (en)     │  ───────────►  │  Docs site       (Starlight)       │
│   ├─ intro.zh.mdx    (zh)     │   dispatch     │  built-in search, sidebar, i18n    │
│   ├─ hardware.mdx    (en)     │                │  + Vercel deploy credentials       │
│   └─ hardware.zh.mdx (zh)     │                │                                    │
│                               │                │  build = renderer + docs content   │
└───────────────────────────────┘                └─────────────────┬──────────────────┘
                                                                    │
                                  ┌─────────────────────────────────┴─────────────────┐
                                  ▼                                                     ▼
                         physiclaw.ai                                       docs.physiclaw.ai
                    (landing — Vercel project)                          (docs — Vercel project)
```

### Responsibilities

| | `physiclaw/PhysiClaw` (code) | `physiclaw/PhysiClaw-site` (this repo) |
| --- | --- | --- |
| Owns | docs **content** (Markdown, bilingual) | landing page + docs **renderer/theme** |
| Holds secret | low-privilege **dispatch token** only | the **`VERCEL_TOKEN`** (build + deploy) |
| Deploys | nothing directly — only *triggers* | both Vercel projects |

This split follows OpenClaw's docs setup: the powerful deploy credential stays **out** of the large, many-contributor code repo, which carries only a narrow token that can do one thing — trigger a docs build.

## How docs publish

- **Edit the landing page** (here) → Vercel's native git integration redeploys `physiclaw.ai`.
- **Edit docs** (`docs/**` in the code repo) → a GitHub Action there fires a `repository_dispatch` at this repo. This repo's `deploy-docs` workflow then:
  1. checks out the code repo's `docs/` into `physiclaw-docs/`,
  2. runs `scripts/sync-docs.mjs` to produce `docs-site/content/docs/{en,zh}`,
  3. runs the docs build (`pnpm build:docs`),
  4. deploys the output to the `docs.physiclaw.ai` Vercel project.

The code repo never holds the `VERCEL_TOKEN` — it only sends the dispatch.

> **Trade-off:** this is auto-publish from the latest docs commit, not pinned/reproducible releases. For a small, hand-authored docs set that's the right call — docs go live the moment they merge.

## Docs content & conventions

### Where docs live

All documentation Markdown lives in the **code repo** at `docs/`. To edit docs, open a PR against
[`physiclaw/PhysiClaw`](https://github.com/physiclaw/PhysiClaw), not this repo.

### Internationalization (i18n)

**Authoring format** — translations are **co-located by filename suffix**. Each English file has a
matching Chinese sibling sitting right next to it in the code repo's `docs/`:

```
docs/
├── intro.mdx              ← English
├── intro.zh.mdx           ← 简体中文
├── guides/
│   ├── setup.mdx          ← English
│   └── setup.zh.mdx       ← 简体中文
```

- A file **without** `.zh` is **English**; a file with `.zh` before the extension is **Chinese**.
- Co-locating keeps a doc and its translation in the same directory and the same PR, so a reviewer
  sees both change together.

**Build format** — Starlight expects [directory-based locales](https://starlight.astro.build/guides/i18n/).
The original docs are checked out into the level-1 `physiclaw-docs/` folder, and `scripts/sync-docs.mjs`
splits them by locale into Starlight's content path `docs-site/content/docs/` (both gitignored),
stripping the `.zh` suffix and preserving subdirectories:

| Authored — `physiclaw-docs/` | → Split — `docs-site/content/docs/` | Route                          |
| ---------------------------- | ---------------------------------- | ------------------------------ |
| `intro.mdx`                  | `en/intro.mdx`          | `docs.physiclaw.ai/en/intro`   |
| `intro.zh.mdx`               | `zh/intro.mdx`          | `docs.physiclaw.ai/zh/intro`   |
| `guides/setup.mdx`           | `en/guides/setup.mdx`   | `.../en/guides/setup`          |
| `guides/setup.zh.mdx`        | `zh/guides/setup.mdx`   | `.../zh/guides/setup`          |

Because the relative path is identical under `en/` and `zh/`, Starlight automatically links the two
as translations and falls back to the default locale when a translation is missing.

Locales are configured in the docs build's `astro.config.docs.mjs`, and the default language is a
**single constant**:

```js
// astro.config.docs.mjs — the Starlight docs build
const DEFAULT_LOCALE = 'en';          // ← change this one value to switch the default language

const LOCALES = {
  en: { label: 'English',  lang: 'en'    },
  zh: { label: '简体中文', lang: 'zh-CN' },
};

export default defineConfig({
  integrations: [starlight({ title: 'PhysiClaw Docs', defaultLocale: DEFAULT_LOCALE, locales: LOCALES })],
  redirects: { '/': `/${DEFAULT_LOCALE}/` },   // bare docs.physiclaw.ai → default language
});
```

### Changing the default language

Set `DEFAULT_LOCALE` to `'zh'` and **everything follows from that one edit** — Starlight's fallback
locale and the `/` → `/{locale}/` redirect both update. No files are renamed and the build is
unchanged, because the **default language is independent of the filename suffix**:

- The `.zh` suffix only marks *which physical file is Chinese* — it is **not** tied to which locale is
  default. `scripts/sync-docs.mjs` maps `'' → en` and `'.zh' → zh` regardless of `DEFAULT_LOCALE`.
- So you can make Chinese the default site language while English files stay unsuffixed (and vice
  versa) — the two concerns never collide.

> To also flip the *authoring* convention (make Chinese the unsuffixed file), change the suffix map in
> `scripts/sync-docs.mjs` — but that's rarely needed; keep authoring stable and just switch the
> default served language.

## Docs renderer stack

The docs site is **[Starlight](https://starlight.astro.build)** (Astro's docs framework). It provides,
out of the box, what larger docs sites hand-roll:

- **Directory-based i18n** with a language picker (`en` / `zh`).
- **Built-in full-text search** (Pagefind, bundled) — no backend.
- **Shiki** syntax highlighting and **MDX** components.
- **Auto-generated**, per-locale **sidebar** with translated group labels (`astro.config.docs.mjs`),
  ordered by each doc's `sidebar.order` frontmatter — new docs appear without touching the config.

The only custom code is **one script**, `scripts/sync-docs.mjs`, that bridges the authoring convention
to Starlight's layout. It reads the original docs from `physiclaw-docs/`, then writes every `*.mdx`
into `docs-site/content/docs/en/` and every `*.zh.mdx` into `docs-site/content/docs/zh/` (`.zh` trimmed,
subdirectories preserved), cleaning that directory first so builds are idempotent. Because it writes
to Starlight's **default** content path, the stock `docsLoader()` (in `docs-site/content.config.ts`)
reads it and sidebar `autogenerate` works.

It runs automatically before the docs build (wired as `prebuild:docs`), and must be run manually
before previewing docs locally (the dev server does not trigger it).

> **Brand theming:** Starlight ships its own theme, so it doesn't share components with the landing
> page automatically — it's aligned by hand in `docs-site/styles/docs.css`, which maps the landing's
> design tokens onto Starlight's variables (orange accent `#e85d26`, Inter + JetBrains Mono, the
> near-black canvas, hairline rules, mono uppercase sidebar labels, and a coordinate-grid hero).

## Local development

Requires **Node ≥ 22.12.0** and **pnpm**. To work on the **landing page**:

```sh
git clone https://github.com/physiclaw/PhysiClaw-site.git
cd PhysiClaw-site
pnpm install
pnpm dev             # http://localhost:4321
```

To preview the **docs**, check out the code repo's `docs/` into `physiclaw-docs/`, then run the docs
dev server (it syncs `physiclaw-docs/` → `docs-site/content/docs/` first):

```sh
git clone --depth 1 https://github.com/physiclaw/PhysiClaw.git /tmp/physiclaw
cp -r /tmp/physiclaw/docs physiclaw-docs
pnpm dev:docs        # syncs, then serves the Starlight site
```

Re-run `pnpm sync:docs` after editing anything in `physiclaw-docs/`.

| Command            | Action                                                |
| ------------------ | ----------------------------------------------------- |
| `pnpm dev`         | Landing dev server at `localhost:4321`                |
| `pnpm dev:docs`    | Sync + serve the Starlight docs                       |
| `pnpm sync:docs`   | Split `physiclaw-docs/` → `docs-site/content/docs/{en,zh}` |
| `pnpm build`       | Build the **landing** to `./dist/`                    |
| `pnpm build:docs`  | Sync + build the **Starlight docs** to `./dist-docs/` |
| `pnpm test`        | Run the `sync-docs` unit tests                        |

## Project structure

```
physiclaw-docs/              # Original docs checked out from the code repo — gitignored
│                            #   co-located *.mdx / *.zh.mdx
src/                         # ── LANDING (astro.config.mjs) ──
├── layouts/Layout.astro     #   <head>, fonts, meta, dark/light theme toggle
├── pages/index.astro        #   landing page
└── styles/global.css        #   Tailwind import + @theme design tokens
docs-site/                    # ── DOCS (astro.config.docs.mjs) ──
├── content/docs/            #   Split output, Starlight reads this — gitignored
│   ├── en/                  #     ← from *.mdx
│   └── zh/                  #     ← from *.zh.mdx  (.zh trimmed)
├── content.config.ts        #   Starlight docs collection (stock docsLoader)
├── styles/docs.css          #   Starlight brand theme (mirrors the landing tokens)
└── assets/crab.svg          #   docs logo
scripts/
├── sync-docs.mjs            # split physiclaw-docs → docs-site/content/docs/{en,zh}
└── sync-docs.test.mjs       # unit tests (node:test)
public/                      # SVG mascot, illustrations, favicons (shared)
astro.config.mjs             # Landing build: Astro + Tailwind + Vercel adapter
astro.config.docs.mjs        # Docs build:    Starlight (locales, redirect)
```

The repo has **two build targets** with separate source roots: the landing (`src/` →
`astro.config.mjs` → `physiclaw.ai`) and the Starlight docs (`docs-site/` → `astro.config.docs.mjs` →
`docs.physiclaw.ai`). Separate roots are why the docs `/` → default-locale redirect never collides
with the landing page at `/`.

## Deployment

Two Vercel projects, each building a different target from this repo:

| Project | Domain | Build | Trigger |
| ------- | ------ | ----- | ------- |
| Landing | `physiclaw.ai` | `pnpm build` | push to this repo (native Vercel git integration) |
| Docs | `docs.physiclaw.ai` | `pnpm build:docs` | `repository_dispatch` from the code repo's `docs/**` changes |

**DNS** (Cloudflare): `docs.physiclaw.ai` is a `CNAME → cname.vercel-dns.com`, **DNS-only (grey cloud)** so Vercel issues and serves its own TLS — matching the existing `www` record.

**Secrets:** keep `VERCEL_TOKEN` in *this* repo's Actions secrets. Scope the docs Vercel project to a dedicated team (or use environment protection) to contain it. The code repo holds only the dispatch token.

## Status

- ✅ **Landing page** — live at `physiclaw.ai`.
- ✅ **Docs renderer** — Starlight site builds bilingual (en/zh) with brand theme, search, and i18n
  routing. `scripts/sync-docs.mjs` is implemented and unit-tested (`pnpm test`). Template docs live in
  `physiclaw-docs/` for local preview (gitignored — the real content ships in the code repo's `docs/`).
- 🚧 **Deploy wiring** — still to do: create the `docs.physiclaw.ai` Vercel project, the `deploy-docs`
  workflow, and the code-repo `repository_dispatch` Action.

## Contributing

- **Landing page / site presentation / docs theme** → edit this repo.
- **Documentation content** → edit `docs/` in [`physiclaw/PhysiClaw`](https://github.com/physiclaw/PhysiClaw),
  adding both the English file and its `.zh` sibling.

## License

MIT
