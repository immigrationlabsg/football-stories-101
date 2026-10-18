# Runbook for the owner

This is the only document you need day to day. No coding is involved in any of
it. Where a step needs a developer, it says so.

Contents

1. [How the whole thing works](#1-how-the-whole-thing-works)
2. [Adding a story in Pages CMS](#2-adding-a-story-in-pages-cms)
3. [Writing the body: the little Markdown you need](#3-writing-the-body-the-little-markdown-you-need)
4. [How scheduling works](#4-how-scheduling-works)
5. [Changing the send times](#5-changing-the-send-times)
6. [Setting and rotating the secrets](#6-setting-and-rotating-the-secrets)
7. [One-time setup checklist](#7-one-time-setup-checklist)
8. [The daily ten minutes](#8-the-daily-ten-minutes)
9. [When something goes wrong](#9-when-something-goes-wrong)
10. [Corrections, the calendar and site settings](#10-corrections-the-calendar-and-site-settings)
11. [Moving to your own domain](#11-moving-to-your-own-domain)

---

## 1. How the whole thing works

Everything lives in one GitHub repository, `immigrationlabsg/football-stories-101`.

- **A story is one file.** You create it through a web form (Pages CMS). Saving the form saves the file into the repository.
- **Saving triggers a rebuild of the website** within a couple of minutes (the "Build and deploy" workflow).
- **Every morning at the send time**, a second workflow ("Publish daily") runs. It rebuilds the site, picks the story whose date is today, emails it to the subscriber list through Buttondown, posts it to the Telegram channel, writes the Facebook, Instagram and Threads captions into the `social/` folder, and records the send in `data/sent.json` so it can never send the same story twice.
- **The web page for a story appears seven days after the email.** The site is the archive; the email is the product.
- **If no story is due**, the morning run sends a story from the archive instead, chosen by nearest anniversary, with "From the archive" in the subject. The rhythm never breaks.

You can watch every run under the repository's **Actions** tab. Green tick: fine. Red cross: see section 9.

## 2. Adding a story in Pages CMS

Pages CMS is a free, hosted editor that reads and writes this repository. It
needs no installation.

1. Go to **https://app.pagescms.org** and sign in with the GitHub account that owns the repository.
2. Choose **football-stories-101** (the first time, Pages CMS asks for permission to access it; grant it for this repository only).
3. In the left menu click **Stories**, then **Add an entry**.
4. Fill in the form. Every field has a short description. The ones that matter most:

   | Field | What to put |
   |---|---|
   | Story No. | The next number in sequence. Must be unique. Shown as "Story No. 007". |
   | Headline | `Subject / angle`, with a space, a slash and a space in the middle. The subject is the person, club or era; the angle is the hook. |
   | Dek | One sentence, 160 characters at most. The form will refuse longer. |
   | URL slug | Lower-case words with hyphens, e.g. `garrincha-1962-world-cup`. Becomes the web address. Do not change it once the story has been sent. |
   | Send date and time (UTC) | The morning it should go out, in UTC. **Weekdays: `T00:00:00Z` (8:00 am Singapore). Weekends: `T02:00:00Z` (10:00 am Singapore).** See section 4. |
   | Pillar | Players, Clubs, Eras & Dynasties or Moments. |
   | Players, Clubs, Countries, Competitions, Decades, Themes | Tags. One per entry, full names. These build the index pages and the "related stories" box. |
   | Series, Part number | Only for multi-part runs. Same series name on every part. |
   | Hero illustration | Upload the image (square or 4:3, at least 1,200 pixels wide). Write the alt text; the form will not save without it. |
   | Sources | One per line. At least one; in practice five or more. Books as "Author, Title (Publisher, year)"; websites as full links. |
   | Question to the reader | One line. It ends the story, the email and the Facebook post. |
   | Facts for social | Three to six short standalone facts. They become the Threads post and the Instagram carousel slides, so each must make sense on its own. |
   | Draft | Tick while you are still working on it. **Untick to schedule.** A draft is never sent and never published. |
   | Story | The body. See section 3. |

5. Click **Save**. Pages CMS commits the file to the repository. The site rebuilds; if the story's date is in the future nothing visible happens yet, which is correct.

Tips

- You can save a draft and come back to it. Drafts are invisible to readers.
- To schedule a month ahead, create the stories with their future dates and Draft unticked. The pipeline sends each one on its morning.
- If the form refuses to save, the red message under the field says why (dek too long, headline missing the slash, slug with capitals, missing alt text or sources).
- Behind the scenes a stricter check runs on every build. If a story fails it, the build goes red and the Actions log names the file and the field. Fix it in Pages CMS and save again.

## 3. Writing the body: the little Markdown you need

The story box is plain text with a handful of conventions. Paste from your
writing app; it works.

```
Paragraphs are separated by a blank line.

## A section heading

*italic* and **bold**.

> A quotation drawn from a sourced interview or contemporary report.
> — Who said it, where, when

## What it tells us

Two to four sentences in the present tense.
```

- A quotation block (`>` lines) becomes a styled pull quote automatically. Put the attribution on the last line, starting with an em dash (—) or two hyphens (--).
- The heading `## What it tells us` is recognised and gets its own tinted box at the end of the story. Keep it as the last heading.
- Do not type the question to the reader into the body; it goes in the "Question to the reader" field so that the email and the Facebook caption can use it too.
- Do not put the sources in the body; they go in the Sources field.
- Optional, for club histories and careers, a timeline:

  ```
  <Timeline title="From the Second Division to two European Cups" items={[
    { when: '6 January 1975', what: 'Brian Clough appointed manager.' },
    { when: '30 May 1979', what: 'European Cup final, Munich: Forest 1 Malmö 0.' },
  ]} />
  ```

  Keep the single quotes; if a line needs an apostrophe, write it as a curly one (’). The email version turns this into a bulleted list.
- Optional, a captioned picture inside the body (after uploading it through the Hero field's media library, so it lands in `public/images/stories/`):

  ```
  <Figure src="/images/stories/007-detail.jpg" alt="…" caption="…" credit="Wikimedia Commons, CC BY-SA 4.0, Author Name" />
  ```

The three sample stories (`src/content/stories/001…003`) show all of this in use. Open one in Pages CMS and read it before writing your first.

## 4. How scheduling works

Two clocks matter: the story's **date** and the **workflow schedule**.

**The story date** is written in UTC. Singapore is UTC+8, so:

| You want the email at | Put in the date field |
|---|---|
| 8:00 am Singapore (weekdays) | `YYYY-MM-DDT00:00:00Z` |
| 10:00 am Singapore (weekends) | `YYYY-MM-DDT02:00:00Z` |

**The workflow schedule** is in `.github/workflows/publish-daily.yml`:

```
- cron: "0 0 * * 1-5"   # 00:00 UTC Monday to Friday  = 08:00 Singapore
- cron: "0 2 * * 0,6"   # 02:00 UTC Saturday and Sunday = 10:00 Singapore
```

Each run does this, in order:

1. **Build** the website including only stories with Draft unticked whose date is at least `WEB_LAG_DAYS` (7) days ago. So a story emailed on the 4th appears on the web on the 11th.
2. **Deploy** it to GitHub Pages.
3. **Select** today's story: the one whose date falls in the last 24 hours and is not yet in `data/sent.json`. If two qualify, the earlier one goes.
4. **Send** the email through Buttondown. Subject: `Story No. 007 · Subject / angle`. Body: the hero image, the story, the question, the sources, a link to the web page (with the date it will be live), a subscribe link and the unsubscribe link.
5. **Post to Telegram**: hero image, headline, dek and link (to the web page if it is live, otherwise to the Subscribe page).
6. **Write `social/007.md`** with the Facebook caption and first comment, the Instagram caption with hashtags and alt text, the Threads post and reply, and copy the 1080x1350 carousel cards into `social/cards/`.
7. **Record** the send in `data/sent.json` and commit both back to the repository. A re-run of the same morning finds the record and does nothing.
8. **Fallback**: if no story was due, pick the past story whose anniversary (month and day) is nearest to today, preferring ones that have been re-sent least, and send it as "From the archive: Story No. …". It is recorded with today's date so it cannot go twice in one day.

Notes

- GitHub's scheduler can run a few minutes late under load. That is normal for a newsletter.
- Nothing is sent until the secrets in section 6 exist. Without them the run completes as a dry run and the log says so.
- The web lag is a repository variable, `WEB_LAG_DAYS`. Change it under Settings → Secrets and variables → Actions → Variables. `0` would publish to the web on the same morning.
- The "Build and deploy" workflow (every save) never sends anything. Only "Publish daily" sends.

## 5. Changing the send times

Two edits, both in GitHub's web editor, no tools needed.

1. **The schedule.** Open `.github/workflows/publish-daily.yml`, click the pencil, change the two `cron` lines, and commit. The format is `minute hour * * days` in UTC, days 0 to 6 with Sunday = 0. Subtract 8 hours from Singapore time (if that goes below zero, add 24 and shift the day back). Examples:

   | Singapore time | cron |
   |---|---|
   | 7:00 am every day | `0 23 * * *` (the previous evening in UTC) |
   | 8:00 am Mon–Fri | `0 0 * * 1-5` |
   | 9:30 am Sat–Sun | `30 1 * * 0,6` |
   | 6:00 pm every day | `0 10 * * *` |

2. **The story dates.** New stories need the matching UTC time in their date field (section 4). Stories already scheduled keep their old time; the selector picks any story dated within the last 24 hours, so a story dated 00:00Z is still sent by a 02:00Z run.

Also update the wording readers see: in `src/site.config.ts`, the `sendTimes` lines, which appear on the Subscribe page and in the subscribe box. Pages CMS shows this file under **Site settings (advanced)**.

## 6. Setting and rotating the secrets

Secrets are stored by GitHub, never in the repository. Only repository admins can see that they exist; nobody can read them back.

**Where:** repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Name exactly as below.

| Secret | How to get it |
|---|---|
| `BUTTONDOWN_API_KEY` | Log in to Buttondown → Settings → API (buttondown.com/settings/api). Copy the key. |
| `TELEGRAM_BOT_TOKEN` | In Telegram, message **@BotFather**, send `/newbot`, follow the prompts. BotFather replies with a token like `123456789:AAH…`. Then add the bot to your channel as an administrator with permission to post. |
| `TELEGRAM_CHAT_ID` | For a public channel, the handle with the @, e.g. `@footballstories101`. For a private channel, the numeric id (starts with `-100…`); the simplest way to find it is to forward a channel post to **@userinfobot** or **@getidsbot**. |

**To rotate a key** (if it leaks, or once a year as hygiene): generate a new one at the source (Buttondown settings, or `/revoke` then `/token` with BotFather), open the secret in GitHub, click **Update**, paste the new value. The next run uses it. Old values stop working the moment you revoke them at the source, so do the two steps together.

**To test** without sending: Actions → **Publish daily** → **Run workflow** → leave "Dry run" ticked → Run. Read the log of the "Send today's story" step; it prints the subject, the Telegram caption and where it wrote the social file. Untick "Dry run" to send for real.

**Variables** (not secret, same page, "Variables" tab) you may want to set:

| Variable | Purpose | Default |
|---|---|---|
| `WEB_LAG_DAYS` | Days between email and web publication | `7` |
| `PUBLIC_BUTTONDOWN_USERNAME` | Your Buttondown username; powers the subscribe form | `footballstories101` |
| `PUBLIC_TELEGRAM_CHANNEL`, `PUBLIC_FACEBOOK_URL`, `PUBLIC_INSTAGRAM_URL`, `PUBLIC_THREADS_URL` | Links in the footer, Subscribe and Links pages | placeholders |
| `SITE_URL`, `SITE_BASE` | Only when moving to a custom domain (section 11) | github.io address |
| `PUBLIC_UMAMI_SCRIPT`, `PUBLIC_UMAMI_WEBSITE_ID` | Optional cookieless analytics (Umami Cloud); nothing loads if empty | empty |

After changing a variable, trigger a rebuild: Actions → Build and deploy → Run workflow.

## 7. One-time setup checklist

Things only you can do, because they need your accounts:

- [ ] **GitHub Pages**: Settings → **Pages** → under "Build and deployment", set **Source** to **GitHub Actions**. (The workflow tries to do this itself; if the first deploy failed with a Pages error, this is why.) Then Actions → Build and deploy → Run workflow. The site appears at https://immigrationlabsg.github.io/football-stories-101/.
- [ ] **Buttondown account** at buttondown.com. Choose the username; set `PUBLIC_BUTTONDOWN_USERNAME` if it is not `footballstories101`. In Buttondown settings, switch on double opt-in (confirmation email) and set the "from" name to `The Editor, Football Stories 101`. Copy the API key into the `BUTTONDOWN_API_KEY` secret.
- [ ] **Telegram channel**: create it, create the bot with BotFather, add the bot as an administrator, set both Telegram secrets, set `PUBLIC_TELEGRAM_CHANNEL` to the channel link.
- [ ] **Facebook page, Instagram and Threads accounts**, and set their links in the variables. Put the Links page (`…/football-stories-101/links/`) in the Instagram bio.
- [ ] **Pages CMS**: sign in once at app.pagescms.org and authorise the repository.
- [ ] **Contact address**: `editor@footballstories101.com` is a placeholder in `src/site.config.ts` (Pages CMS → Site settings). Change it to a mailbox you read; it is on the About, Privacy and every story page.
- [ ] **Domain** (optional; section 11).
- [ ] **Illustrations**: the three sample heroes are placeholders. Replace them by uploading new images in Pages CMS and updating each story's Hero field. The SVG sources are in `design/placeholders/` if an illustrator wants the compositions.
- [ ] **A first dry run** (section 6) to see the whole pipeline in the log.

## 8. The daily ten minutes

After the morning run (check the Actions tab, or just wait for your own copy of the email):

1. Open the repository → `social/` → today's `NNN.md`. GitHub shows it formatted.
2. **Facebook**: paste the "Facebook" text as a post with the hero image attached (the hero is in `public/images/stories/`). Post the "First comment" line as the first comment.
3. **Instagram**: download the cards listed under "Cards" (`social/cards/NNN-ig-01.png` onwards; click a file, then "Download raw file") and post them as a carousel in order, with the "Instagram" caption. Add the alt text.
4. **Threads**: post the "Threads" text, then the "Reply" line as a reply.
5. Reply to comments and to email replies.

The same files are attached to the workflow run as a downloadable zip ("social-…") for 14 days, which is handy on a phone.

## 9. When something goes wrong

**A build is red after you saved a story.** Open Actions → the red run → the "Validate stories…" step. The message names the file and the problem (for example `003-….mdx: dek: dek must be 160 characters or fewer`). Fix it in Pages CMS. Word-count warnings (outside 1,100 to 1,900) do not stop the build.

**The morning email did not go out.** Actions → Publish daily → latest run:
- *Red at "Send today's story", message mentions Buttondown 401/403*: the API key is wrong or revoked. Rotate it (section 6), then Run workflow with Dry run unticked.
- *Red, message mentions Telegram*: the email went out and was recorded; only Telegram failed. Check the bot is still an administrator of the channel and the chat id is right. Post today's manually; nothing else to do.
- *Green but the log says "not configured; running as a dry run"*: the secrets are missing.
- *Green and the log says "No story due"*: no story had Draft unticked with today's date. The archive fallback should have sent one; if the log says "nothing in the archive", there are no past stories yet.

**You need to send a specific story now** (for example yesterday's, after fixing a problem): Actions → Publish daily → Run workflow → Dry run unticked → "Force a specific story number": type the number → Run. Tick "Allow re-sending" only if it was already sent and you really want subscribers to get it again.

**A story went out with a mistake.** Correct the story in Pages CMS (the web version updates on the next build), add an entry to the Corrections log (section 10), and if it is serious, send a short correction by email from Buttondown's own dashboard.

**Two runs at once.** Cannot happen; deployments queue behind each other.

**Asking the assistant for help**: paste the red step's log text. Everything in this repository is plain files, so any coding assistant can read it.

## 10. Corrections, the calendar and site settings

All three are in Pages CMS, in the left menu.

- **Corrections log**: add an entry with the date, the story's slug and what changed. It appears on the Corrections page, linked from About and from the foot of every story.
- **On this day**: anniversaries (month, day, year, one sentence, optional story slug). The home page shows the entries matching the day of the latest build; because the site rebuilds every morning, it stays current. Add the key dates from each new story as you publish it.
- **Site settings (advanced)**: `src/site.config.ts`. Names, the byline, the contact email, send-time wording, pillar blurbs, social handles. It is code, so change only the text between quotes.

## 11. Moving to your own domain

When `footballstories101.com` (or .co or .net) is bought:

1. At the registrar, add a `CNAME` record for `www` pointing to `immigrationlabsg.github.io`, and the four GitHub Pages `A` records for the bare domain (GitHub's documentation "Managing a custom domain for your GitHub Pages site" lists them).
2. Repository → Settings → Pages → Custom domain: enter `www.footballstories101.com`, save, wait for the DNS check, tick "Enforce HTTPS".
3. Set two repository variables: `SITE_URL` = `https://www.footballstories101.com`, `SITE_BASE` = `/`.
4. Ask the assistant (or edit in the web editor) to add a file `public/CNAME` containing `www.footballstories101.com`, and to change `start_url`, `scope` and the icon paths in `public/site.webmanifest` from `/football-stories-101/` to `/`.
5. Run **Build and deploy**. All links, the RSS feed, the sitemap and the share cards switch to the new address; the old github.io address redirects.

Buttondown emails already sent keep their old links; GitHub redirects them.
