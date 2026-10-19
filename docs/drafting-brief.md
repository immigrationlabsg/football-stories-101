# Drafting brief: how a Football Stories 101 story is written

This is the working brief for whoever drafts a story, human or AI. The owner
reads stories as a reader, not as a fact-checker: every story must be checked
before the owner sees it. Read docs/editorial-standards.md too.

## Reader promise

Every morning the reader should finish the story knowing something they did
not know, and wanting to tell someone. Aim for the "I never knew that" moment:
a forgotten detail, a hinge decision, a human scene. Avoid Wikipedia-summary
prose, lists of honours, and clichés ("the rest is history", "etched in folklore").

## The file

One file per story: `src/content/stories/NNN-slug.mdx` (NNN = story number,
three digits). Copy the front matter shape from
`src/content/stories/002-ferenc-puskas-real-madrid-exile.mdx`. Required fields:

- `number`, `slug` (lower-case-hyphens), `pillar` (players | clubs | eras | moments)
- `title`: "Subject / angle" with a spaced slash
- `dek`: one sentence, at most 160 characters, the striking hook or number
- `date`: for unscheduled drafts use `2027-01-01T00:00:00Z`; the editor sets real dates at scheduling
- `draft: true` for every new draft (never sent, never published until switched)
- tags: `players`, `clubs`, `countries`, `competitions`, `decades` ("1950s"), `themes`
- `hero.src`: `/images/stories/NNN-short-name.jpg` (the file does not exist yet; it is painted automatically)
- `hero.alt`: describes the illustration as it will look (a scene, not a named person's face)
- `hero.credit`: `Illustration: Football Stories 101`
- `hero.commons`: **preferred.** A real photograph from Wikimedia Commons that shows the story's subject (the player,
  the team, the match, the stadium), as `"File:Exact file name.jpg"`. Find it with WebSearch restricted to
  commons.wikimedia.org; the Dutch National Archief (Anefo), Fortepan and Agência Brasil collections are rich and
  freely licensed. Only public domain, CC0, CC BY or CC BY-SA files: never NC or ND, never a photo from a news
  agency site. The build fetches it, checks the licence and writes the credit automatically; leave `credit` as
  `Illustration: Football Stories 101`. Then write `hero.alt` to describe that photograph.
- `hero.prompt`: fallback only, when no suitable Commons photo exists: at most 20 words, an evocative still life
  or place, main object first, no people, no text. It is painted as a watercolour automatically.
- `sources`: three to eight, books as "Author, Title (Publisher, year)", web sources as full URLs you actually opened
- `question`: one line to the reader, ends the story
- `facts`: three to five standalone facts for the Instagram carousel, each true and sourced

## The body (500 to 700 words)

Read docs/editorial-standards.md "The story template" and "Style" and follow them exactly. In short:

1. First line hooks: a specific moment, or a striking fact.
2. No `##` headings at all. Paragraphs of one to three short sentences, plenty of one-line paragraphs.
3. First-person editor's voice for reactions only, in this order: a 50 to 100 word hook; then, early (about 15% in),
   "Here's what I didn't know until recently." on its own line; around the middle, "Then came the part that
   surprised me." or "But here's where it gets interesting."; and the close "Here's what stays with me."
   Never invent personal experiences.
4. At most one quote, woven into a sentence ("As Cruyff put it: …"), verified like any fact. No pull-quote blocks,
   no timelines.
5. Close with "Here's what stays with me." and two to four short sentences. The reader question goes in the
   `question` field, not the body.

## Fact-check (mandatory, before the draft is saved)

Use web search and open the pages. For every date, score, scorer, attendance, fee,
age, quote and record:

- confirm it in two independent reputable sources (RSSSF, UEFA/FIFA official pages, club official histories,
  BBC, The Guardian, The Athletic, contemporary reports, books by reputable authors, Wikipedia only as a pointer
  to its cited sources, never as one of the two);
- if sources disagree, say so in the text or drop the detail;
- if you cannot confirm it, cut it or soften it to what is confirmed.

Living-persons rule (non-negotiable): an allegation about a living person (match-fixing, doping, misconduct,
private life) appears only if it is an established fact from a primary source (conviction, official finding, the
person's own admission), phrased as attributed fact, and only if the story needs it. Otherwise omit it.

Then run `npm run validate` and fix every error.

## Fact-check log

Append a short entry per story to `docs/fact-checks/NNN.md`: each checked claim, the two sources, and
anything changed or cut. This is the audit trail; the owner never has to read it.

## Social banner line (required for every story)

Each story needs one extra front-matter line, `hook`: a punchy line of 100 characters or fewer, written from the story itself with no new facts.
It is the banner on the Facebook picture and the Instagram cover, and the first line of the Instagram caption.
Example: "He won the World Cup on two rebuilt knees."

The Facebook post is the whole story. The tooling moves "Here's what I didn't know until recently." up so it begins within the first
230 characters, ahead of Facebook's "See more", and the remaining sentences of the opening follow it. Nothing is cut.
