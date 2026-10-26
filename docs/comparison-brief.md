# Comparison brief: "On this day" stories (used for 29 Oct to 28 Nov 2026; reuse for every comparison)

## What the owner wants
Every third day the page posts an "on this day" comparison: two moments involving famous players (or famous teams) that
happened on the SAME calendar date (different years are fine), compared, ending with an either/or question fans will argue
about and send to friends. Approved example (posted 26 Oct): src/content/stories/007-le-tissier-v-totti.mdx and its log
docs/fact-checks/007.md. Read both first, then docs/editorial-standards.md and the "On this day" bullets in docs/posting-format.md.

Hard rules (owner):
- Only matches that were played or things that happened to football stars on that date (a goal, hat-trick, debut, record,
  red card, transfer, award, final). NEVER foundings, meetings, governing bodies or rule changes.
- Favour popular legends (Messi, Ronaldo, Maradona, Pelé, Zidane, Henry, Ronaldinho, Beckham, Cantona, Gerrard, Rooney,
  Shearer, Ibrahimović, Kaká, Buffon, Maldini, Iniesta, Xavi, Raúl, Bergkamp, Van Basten and the like; famous women's
  players welcome). African/Asian/North American players only if they have a European or world profile.
- Never repeat a story: avoid the events of existing stories (titles: `grep -h "^title:" src/content/stories/*.mdx`). The
  story bank (docs/story-bank.md) has reserved angles; you MAY use a reserved angle if its date matches (say so).
- Every factual claim (body, facts cards, dek, hook) needs two independent sources, logged like docs/fact-checks/007.md.
  Pages do not open here (WebFetch fails); use WebSearch excerpts and say so in the method note, as 007's log does.
  Drop anything with only one source. Dates must be exact. Living-persons rule: documented football facts only.
- Quotes: at most one, verbatim, with two sources; otherwise paraphrase without quotation marks.

## Format (copy 007's front matter exactly; leave number as 0 and date as the slot date T00:00:00Z on weekdays,
## T02:00:00Z on Saturdays/Sundays; draft: false; series: "On this day"; seriesOrder: null)
- title "A v B / angle"; dek ≤160 chars; hook ≤100 chars, starting "On this day"; pillar: moments;
- body 320 to 350 words in the house shape: short opening on moment 1 then moment 2 (write "On 26 October 1996," not
  "On this day", because the web page goes live a week later), "Here's what I didn't know until recently." early, the
  backstory comparing the two, "Then came the part that surprised me." mid-way, "Here's what stays with me." then 2-4
  short present-tense sentences (no unsourced superlatives);
- question: a sharp either/or line ("Le Tissier or Totti: who was the greater one-club legend?");
- facts: exactly 5, each ≤110 characters, restating the body in story order;
- sources: the URLs you relied on; hero: src "/images/stories/NNN-SLUG.jpg" (leave NNN), alt describing a watercolour of
  the two players, credit "Painting after photos via Wikimedia Commons. Image generated with AI." (I finish it).
- British English, numerals for scores, no exclamation marks, no website links.

## Pictures (the owner is strict: real likeness, real kits, real numbers)
For each of the two players, give 2-4 Wikimedia Commons search queries that should find a free photo of THAT player,
ideally in the kit of that moment or his most famous shirt with his number, face clearly visible (e.g. "Thierry Henry
Arsenal", "Henry 14 Arsenal 2004"). Do not invent file names. Write them to photos.json:
{"A": {"player": "...", "want": "...", "queries": [...]}, "B": {...}}

## Output
The story file, its fact-check log in `docs/fact-checks/`, and the photo queries for the two players (add the chosen
Commons files to `data/reference-photos.json`, then paint and check against the picture standard), handed over with
`npm run hand-over` as `docs/weekly-drafting.md` step 5a describes.
