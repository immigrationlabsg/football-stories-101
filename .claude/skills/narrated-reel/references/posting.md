# Posting a narrated Reel

Route built 7 Nov 2026. First real post: story 906 on 10 Nov; update this file with what really happened.

1. Owner's OK first, for the file and the caption. The weekly run (task 7 in `docs/scheduled-tasks.md`) saves its Reels with `draft: true` until then.
2. Copy `final.mp4` to `assets/reels/NNN-<name>.mp4`. Add the story: a number from 906 up, `extra: true`, `onlyOn: ["facebook", "instagram", "threads"]`, `narratedReel: "assets/reels/NNN-<name>.mp4"`, `reelCredits` (every photo's author and licence; shown on the story's web page, never in captions or on the Reel), date at 12:00Z (20:00 Singapore), hero, facts, the same question as the ending card, and `docs/fact-checks/NNN.md`. Add the photos to `data/reference-photos.json`.
3. `npm run images`, then look at the story's cards at full size: Threads posts them with the Reel in a reply.
4. `npm run verify`, commit, push. Once the site has deployed, run "Post to social" with the story number, networks `instagram threads` and Dry run ticked: it proves the mp4 and cards are live and prints the captions.
5. Nothing more is needed. "Post extras" posts at the date: GitHub starts it around the slot and the Mac starts it at 19:45. It waits for the exact time, skips what is recorded, and a later start retries only what is missing; the last automatic start is 20:47 Singapore, so after that rerun "Post extras" by hand (it still posts up to six hours late). A failed run, or a Threads post whose Reel reply failed, turns red and GitHub emails the owner.

`onlyOn` keeps these stories out of the daily run, so no email or Telegram goes out, and workflow "Post extras" posts them to all three networks at the slot (owner, 8 Nov 2026; Facebook was left out before that).

- Timing: never a manual posting run between 06:00 and 08:45 Singapore (10:45 at weekends).
- No website link in the caption.
- After posting, confirm live on each network; log in `docs/growth-log.md`; judge at the Monday review and keep it out of any other experiment's verdict.
- TikTok and YouTube: the automatic TikTok workflow (`.github/workflows/tiktok.yml`, `scripts/tiktok.ts`) posts the same Reel to both through Zernio on the day. TikTok gets a trending track automatically; never schedule Shorts ahead.
