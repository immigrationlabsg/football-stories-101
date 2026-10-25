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
12. [Reading the drafts](#12-reading-the-drafts)
13. [Illustrations](#13-illustrations)
14. [Weekly drafting and the launch date](#14-weekly-drafting-and-the-launch-date)
15. [Testing on social media before launch](#15-testing-on-social-media-before-launch)

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
   | Facts for social | Exactly five short standalone facts, each restating the story, in story order. They become the five fact cards in the Instagram and Threads carousels. |
   | Draft | Tick while you are still working on it. **Untick to schedule.** A draft is never sent and never published. |
   | Story | The body. See section 3. |

5. Click **Save**. Pages CMS commits the file to the repository. The site rebuilds; if the story's date is in the future nothing visible happens yet, which is correct.

Tips

- You can save a draft and come back to it. Drafts are invisible to readers.
- To schedule a month ahead, create the stories with their future dates and Draft unticked. The pipeline sends each one on its morning.
- If the form refuses to save, the red message under the field says why (dek too long, headline missing the slash, slug with capitals, missing alt text or sources).
- Behind the scenes a stricter check runs on every build. If a story fails it, the build goes red and the Actions log names the file and the field. Fix it in Pages CMS and save again.

## 3. Writing the body: the little Markdown you need

The house format follows The Morning Founder (full rules in `docs/editorial-standards.md`):

- **500 to 700 words.** No section headings.
- **Short paragraphs:** one to three sentences, with plenty of one-line paragraphs. A blank line between paragraphs.
- **The editor's voice for reactions only:** "Here's what I didn't know until recently.", "Then came the part that
  surprised me.", and a close that starts "Here's what stays with me." The narrator never invents personal memories.
- **At most one quote,** woven into a sentence: `As Cruyff put it: "…"`.
- **The question to the reader** goes in its own field, not in the body. Sources go in the Sources field; they show
  at the foot of the web page only.

```
Ronaldo came off the bench in Rome on 12 April 2000.

Within minutes his right knee buckled beneath him.

Here's what I didn't know until recently.

…

Here's what stays with me.

He was the best in the world before the knee went, and again after it was rebuilt.
```

*italic* and **bold** work as usual.

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
6. **Write `social/007.md`** with the Facebook text, the Instagram caption (the same text) and alt text, and the Threads text, and copy the carousel cards into `social/cards/` (format: `docs/posting-format.md`).
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
- [ ] **Photos**: nothing to do; they are fetched and credited automatically (section 13).
- [ ] **A first dry run** (section 6) to see the whole pipeline in the log.

## 8. The daily ten minutes

After the morning run (check the Actions tab, or just wait for your own copy of the email):

1. Open the repository → `social/` → today's `NNN.md`. GitHub shows it formatted.
2. **Facebook**: paste the "Facebook" text as a post with the banner picture `social/cards/NNN-fb.png`.
3. **Instagram**: download the cards listed under "Cards" (`social/cards/NNN-ig-01.png` onwards; click a file, then "Download raw file") and post them as a carousel in order, with the "Instagram" caption. Add the alt text.
4. **Threads**: post the same cards as a carousel with the "Threads" text (it already ends with the Instagram link).
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

## 12. Reading the drafts

Every story, drafts included, is readable exactly as subscribers will see it at:

**https://immigrationlabsg.github.io/football-stories-101/preview/editors-desk/**

Bookmark it on your phone. Each entry shows its status (Draft, Scheduled, Emailed, Live). The page is not linked
from the site, is hidden from search engines and from the site's own search, but it is not password-protected:
anyone with the address can read it. To retire the address, set a repository variable `PREVIEW_KEY` to a new word
and rebuild; the preview moves to `/preview/<new word>/`.

Every draft has already been fact-checked before it reaches you. The audit trail for each story is in
`docs/fact-checks/NNN.md` if you are ever curious; you never need to read it.

## 13. Story photos

Each story's hero is a **real photograph from Wikimedia Commons** (the free media library behind Wikipedia),
named in the story's `hero.commons` field, for example `File:Ronaldo 2002 cropped.jpg`. When a story is saved, the
**Illustrate** workflow downloads the photo on GitHub's servers, checks that its licence allows reuse (public
domain, CC0, CC BY or CC BY-SA only), crops it square, and writes the photographer, licence and a link into the
caption under the photo. That credit is a legal requirement of the licence: never remove it.

- **Change a story's photo:** browse https://commons.wikimedia.org, open the photo's page, copy its file name
  (it starts with `File:`), paste it into the story's Commons field in Pages CMS, update the alt text, save.
- **Never** use photos from Google Images, news agencies (Getty, AP, Reuters, PA) or club websites: those are not
  free to reuse, and turning them into cartoons does not change that.
- **No free photo exists?** Leave the Commons field empty and the story gets a watercolour still life painted from
  its `hero.prompt` instead (a free AI service, no account needed). To repaint one: Actions → Illustrate → Run
  workflow → story number.
- The record of which photo each story uses, with its licence, is in `data/hero-sources.json`.

### Paintings with GPT Image (optional, paid)

The free way is by hand in ChatGPT: see `docs/picture-guide.md`. To have GitHub paint them instead:

1. On platform.openai.com, add billing and set a monthly budget limit under Limits. API use is billed separately from ChatGPT Plus.
2. Create an API key under API keys. Do not paste it into any chat.
3. In the GitHub repo, go to Settings → Secrets and variables → Actions → New repository secret. Name it `OPENAI_API_KEY` and paste the key as the value.
4. Under Actions → "Paint with GPT Image" → Run workflow, enter the story numbers, such as `2 3 4`.

The paintings land in `design/paintings/NNN.png`. Nothing goes live until the editor approves one and it is set as the story's hero.

## 14. Weekly drafting and the launch date

- A scheduled Claude session runs **every Saturday at 8:47 am Singapore time**. It drafts seven new stories from
  `docs/story-bank.md`, researches and fact-checks each one on the web, and pushes them. You get a phone
  notification when it finishes; read them on the preview page. Its standing instructions are in
  `docs/weekly-drafting.md`. Manage or pause it at claude.ai under your scheduled tasks.
- **Launch date.** While `launch_date` in `data/schedule.json` is empty, new stories stay as drafts and nothing is
  emailed. When you are ready, ask Claude to "set the launch date to YYYY-MM-DD and schedule stories 001 to 030";
  it gives each story its morning slot and switches them from draft to scheduled. From then on the weekly run
  schedules its seven stories itself, keeping at least two weeks ahead.

**Weekly research.** Every Thursday morning a scheduled session researches what football storytelling posts are
drawing attention elsewhere and writes a note in `docs/research/` (rules in its README). It adds up to seven angles to
the story bank. The Saturday drafting run reads the newest note. Ideas that would change the page go to the owner first
(`docs/content-evolution.md`).

**Posting format and delivery.** The format the owner signed off on 20 Oct 2026 is in `docs/posting-format.md`.
The **Delivery check** workflow runs 20 minutes after each slot and emails you if a network is missing; a Claude
check-in at the same time reposts anything missing. Incidents are written up in `docs/incidents/`.

## 15. Testing on social media before launch

Before any money is spent, test the idea on Facebook, Instagram, Threads and Telegram by hand:

1. Open `social/001.md` in the repository: it contains the Facebook post, the Instagram caption and alt text, and the
   Threads text (format: `docs/posting-format.md`).
2. The Instagram carousel images are in `social/cards/` (`001-ig-01.png` onwards). On a phone, open each file in
   GitHub and use "Download".
3. The link in each post points to the story's web page.

For another story, ask Claude to "make the social pack for story N" (it runs `npm run social -- N`).

Buttondown is free up to 100 subscribers and Telegram is always free, so the email and channel can also be
tested at no cost when you are ready.

## 16. Automatic posting to Facebook, Instagram and Threads

The daily "Publish daily" run posts to Facebook, Instagram and Threads after the email and Telegram, as soon as these five
GitHub secrets exist. Until each one is set, that network is simply skipped. You can also post one story by hand with the
**Post to social** workflow (Actions tab): leave "Dry run" ticked first. It prints exactly what would be posted and checks
that every picture is live, without posting anything.

**Simplest route for Instagram (recommended):** in the app dashboard, open the **Instagram** use case and choose
"API setup with Instagram login". Add the Instagram account as an **Instagram Tester** (App roles → Roles), accept the invite in the
Instagram app, then click **Generate token** next to the account. Save that token as `INSTAGRAM_ACCESS_TOKEN` and the account ID shown beside it as
`META_IG_USER_ID`. This needs no Facebook Page link. The token lasts 60 days, so renew it every 50 days. The Facebook Page route below still works for Facebook.

**One-time setup (about 30 minutes, free; allow extra time because Meta's screens change):**

1. The Instagram account must be a Professional (Creator) account, linked to the Facebook Page (Business Suite shows both).
2. Go to developers.facebook.com, log in, **My Apps → Create app**. Choose the **Business** type, name it "Football Stories 101".
   While the app stays in Development mode you can post to Pages and Instagram accounts you own without app review.
3. In **Tools → Graph API Explorer**, pick your app, click **Generate access token**, and tick: `pages_show_list`,
   `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`. Approve for the Football Stories 101 Page and its Instagram account.
4. Make the token long-lived: in the **Access Token Debugger** (developers.facebook.com/tools/debug/accesstoken) paste it and click **Extend access token**.
5. In the Graph API Explorer, with that long-lived token, request `me/accounts`. The entry for Football Stories 101 has its `id` (the Page ID)
   and an `access_token` (the Page token, which does not expire when it comes from a long-lived user token).
6. Request `{page id}?fields=instagram_business_account`. Its `id` is the Instagram user ID.
7. In the GitHub repo, **Settings → Secrets and variables → Actions → New repository secret**, add:
   `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN` (the Page token from step 5), `META_IG_USER_ID`.
8. Threads needs **its own app**: Meta does not offer the Threads use case alongside the others. Create a second app with the
   "Access the Threads API" use case, add `threads_content_publish` and `threads_manage_replies`, make your Threads account a
   Threads Tester, accept the invite, then generate a token under the use case's Settings. Save it as `THREADS_ACCESS_TOKEN`
   (`THREADS_USER_ID` is optional). Check it with **Check a Facebook post** and the word `threads`. It lasts 60 days and is
   renewed automatically by **Refresh social keys**.

Never paste a token or secret into a chat or a file in the repository.

**Test:** Actions → **Post to social** → story `1` → dry run on → Run. Read the log. Then untick "Dry run" and post story 1 for real.

**What the API cannot do:** it cannot switch on Instagram's "AI info" label or write alt text for carousel images.
If you want those on a post, post that one by hand in the app.


### Keys that never run out

- **Facebook Page key:** make it from an *extended* user key (Access Token Tool, "Extend Access Token"), then
  `GET me/accounts`. A Page key made that way does not expire unless you change your Facebook password.
  An even sturdier option is a System User key from Business Settings, Users, System users, with expiry "Never".
- **Instagram and Threads keys** last 60 days. The "Refresh social keys" workflow renews them on the 1st, 8th, 15th and 22nd
  of each month and saves the new keys back into the secrets. It needs one secret, `SECRETS_ADMIN_TOKEN`: create a
  fine-grained token at https://github.com/settings/personal-access-tokens/new for this repository only, with
  Repository permissions, Secrets: Read and write. The same run checks the Facebook key and goes red if it stops working.

## 17. Reels (from 25 October 2026)

Every story from 006 posts as a Reel on all three networks (`docs/posting-format.md`): the 7 cards with one of four
public-domain music clips, rotating day by day, built with the website up to 28 days ahead (`/images/derived/NNN-reel.mp4`). The **Reels** workflow
(Actions tab) has three actions; leave "Dry run" ticked first to see what it would do:

- **check** (story number): is the Reel online, and do Instagram and Threads accept it? Test only, nothing is published.
- **switch** (from, to): gives each upcoming Facebook slot a Reel with the current music, replacing a scheduled picture
  post or an older Reel. The new Reel is scheduled and confirmed by Meta before the old post is deleted. At most 4
  uploads a run (Meta's anti-spam limit), nearest dates first; it refuses to upload while the website still has other
  music, and between 06:00 and 10:45 Singapore time.
- **confirm** (from, to): when `npm run verify` reports a Reel "Meta did not confirm" or a "leftover" post, this asks Meta
  about the Reel. Confirmed: it deletes the leftover posts. Failed: it puts the earlier post back so the next switch
  redoes it. Meta could not be asked: it changes nothing; run it again later.

Each Facebook Reel's line in `data/sent.json` names its music, e.g. "(music: coriolan)". To check one by hand, use
**Check a Facebook post** with `reel:<id>`.
