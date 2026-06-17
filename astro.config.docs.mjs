// @ts-check
// Docs build → docs.physiclaw.ai (Starlight). Separate from the landing build
// (astro.config.mjs) so the `/` → default-locale redirect never collides with
// the landing page at `/`. Content comes from `docs-site/content/docs/`, produced
// by `scripts/sync-docs.mjs` from the bilingual sources in `physiclaw-docs/`.
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const DEFAULT_LOCALE = 'en'; // ← change this one value to switch the default language

const LOCALES = {
  en: { label: 'English', lang: 'en' },
  zh: { label: '简体中文', lang: 'zh-CN' },
};

export default defineConfig({
  site: 'https://docs.physiclaw.ai',
  srcDir: './docs-site',
  outDir: './dist-docs',
  redirects: { '/': `/${DEFAULT_LOCALE}/` },
  integrations: [
    starlight({
      title: 'PhysiClaw',
      tagline: 'The AI that physically uses your phone.',
      logo: { src: './docs-site/assets/crab.svg', alt: 'PhysiClaw' },
      defaultLocale: DEFAULT_LOCALE,
      locales: LOCALES,
      customCss: ['./docs-site/styles/docs.css'],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/physiclaw/PhysiClaw' },
      ],
      editLink: {
        baseUrl: 'https://github.com/physiclaw/PhysiClaw/edit/main/docs/',
      },
      head: [
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true } },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap',
          },
        },
      ],
      // Auto-generated from the docs tree. Works because sync-docs.mjs writes
      // into Starlight's default content path; new docs appear without editing
      // this config. Group labels are translated per locale.
      sidebar: [
        { label: 'Start', translations: { 'zh-CN': '开始' }, items: [{ autogenerate: { directory: 'start' } }] },
        { label: 'Concepts', translations: { 'zh-CN': '原理' }, items: [{ autogenerate: { directory: 'concepts' } }] },
        { label: 'Hardware', translations: { 'zh-CN': '硬件' }, items: [{ autogenerate: { directory: 'hardware' } }] },
        { label: 'Reference', translations: { 'zh-CN': '参考' }, items: [{ autogenerate: { directory: 'reference' } }] },
      ],

    }),
  ],
});
