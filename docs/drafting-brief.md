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
- `hero.prompt`: one sentence describing an evocative still life or place that stands for the story, in the spirit of
  The Morning Founder's watercolours: an object (boots, a leather ball, a shirt on a peg, a trophy, a ticket stub, a
  train, a stadium in mist, a pitch from above) with era and colour detail. Avoid people's faces and close-up figures,
  never name a real person, club, crest, badge or sponsor, never ask for text or numbers, and do not write
  negatives ("no …"). The watercolour style is added automatically.
- `sources`: five to eight, books as "Author, Title (Publisher, year)", web sources as full URLs you actually opened
- `question`: one line to the reader, ends the story
- `facts`: three to five standalone facts for social posts, each true and sourced

## The body (1,300 to 1,700 words)

1. Open inside a specific moment with a date and a place. No throat-clearing.
2. Two to four `##` section headings with short, concrete titles.
3. Two or three pull quotes as Markdown blockquotes, last line starting with an em dash:
   `> quote` then `> — Who, where, when`. Quotes must be real and attributable to where they were first recorded.
   If you cannot verify a quote's wording and origin, do not use it; paraphrase in prose instead.
4. A `## The turn` section: the decision, accident or trait that explains the outcome.
5. Close with `## What it tells us`: two to four sentences, present tense.
6. Optional: a `<Timeline title="…" items={[ { when: '…', what: '…' }, … ]} />` for careers or club histories
   (single quotes inside; use a curly apostrophe ’ inside text).

Style: third person, past tense for history, British English, numerals for scores, ages,
fees, attendances; full names on first mention; no "I", no exclamation marks; an en dash in scores (3–2).

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
