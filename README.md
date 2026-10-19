# Football Stories 101

One researched football story a day, a three-minute read, by email first and on
the web seven days later. Free and non-commercial. Players, clubs, eras and
moments, worldwide.

- **Live site:** https://immigrationlabsg.github.io/football-stories-101/
- **Owner's guide:** [docs/runbook.md](docs/runbook.md) (how to add a story, how
  the schedule works, how to change send times, how to set the secrets)
- **Editorial standards:** [docs/editorial-standards.md](docs/editorial-standards.md)
- **Build specification:** the hand-off document this repository was built from

## How it works

| Piece | Where |
|---|---|
| Stories (Markdown/MDX with front matter) | `src/content/stories/NNN-slug.mdx` |
| Front-matter schema and validation | `src/schema/story.ts`, `scripts/validate.ts` |
| Site (Astro, static) | `src/pages`, `src/components`, `src/layouts`, `src/styles` |
| Hero sizes, Open Graph image, Instagram carousel (generated at build) | `scripts/images.ts`, `scripts/lib/cards.ts` -> `public/images/derived/` |
| Search (Pagefind, built after each build) | `dist/pagefind/` |
| Editor for the owner (Pages CMS) | `.pages.yml` |
| Rebuild on push | `.github/workflows/build-deploy.yml` |
| Daily send: email, Telegram, social captions, archive fallback | `.github/workflows/publish-daily.yml`, `scripts/publish.ts` |
| Newsletter provider adapter (Buttondown; swap here) | `scripts/lib/providers/` |
| Idempotency record | `data/sent.json` |
| Social captions written each morning | `social/NNN.md` |
| On-this-day calendar, corrections log | `src/content/calendar/anniversaries.json`, `src/content/corrections.json` |
| Names, handles, send times, pillars | `src/site.config.ts` |

## Working locally

```bash
npm ci
npm run dev          # http://localhost:4321/football-stories-101/
npm run validate     # check every story against the schema
npm run images       # regenerate hero sizes and share cards
npm run build        # validate + images + astro build + pagefind
npm run preview
DRY_RUN=1 npm run publish:daily                      # rehearse today's send
DRY_RUN=1 PUBLISH_NOW=2027-01-04T00:05:00Z npm run publish:daily   # rehearse a given morning
```

Node 22 or newer. No secrets are needed to build the site; the publish script
runs as a dry run when `BUTTONDOWN_API_KEY` is missing.

## Deliberately not included

No monetisation, no paywall, no comment system, no third-party share SDKs, no
cookie banner (nothing sets a cookie), no club crests.
