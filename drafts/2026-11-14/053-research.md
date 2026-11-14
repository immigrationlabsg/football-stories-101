# 053 research: Guess the legend / Jay-Jay Okocha (Friday 11 December 2026)

Drafted 14 Nov 2026. Draft file: `drafts/2026-11-14/053-guess-the-legend-jay-jay-okocha.mdx`.

Method: pages opened with WebFetch where they loaded; curl used for Olympedia; where a page was blocked (403) the
search tool's excerpt is used and marked "(search excerpt)". Wikipedia used only as a pointer.

## Subject choice
- Okocha is not a subject or answer in any story (`grep -h "^players:\|^answer:" src/content/stories/*.mdx`: no Okocha,
  no Kanu, no Nigeria). Planned nearby: Maradona 6 Dec, Son/Scholes 7 Dec, Galácticos 8 Dec, Ronaldinho 9 Dec,
  Benzema/Salah 10 Dec, Beckham 12 Dec: no clash. Oliver Kahn is a passing mention (not featured).
- Ronaldinho (9 Dec) is left out on purpose. Kanu: not mentioned. The Ballon d'Or "only Europeans until 1995" line: not used.
- `facts: []`: the brief asked for "exactly 5 facts as in 044", but 044, 035, 026 and 017 all have `facts: []`, and
  `scripts/validate.ts` line 17 warns that a quiz shows clues, not facts. I followed 044. If 5 facts are wanted anyway,
  the five body paragraphs map onto them one to one.
- Topical tie-in: none that is honest. Searched for Okocha news around Nov/Dec 2026 (nothing dated; latest items are Nov 2025)
  and Frankfurt's fixtures (matchday 13, 11–13 Dec, away at Mönchengladbach: not linked to this story). AFCON 2027 is in
  mid-2027. So there's no tie-in. The piece stands as an evergreen quiz.

## Living-persons rule
Okocha and Kahn are alive. Only documented football facts are used. Nothing about his later legal or tax news
(a Channels TV "bench warrant" headline came up in a search). It is not relevant and was not used.

## Claims

| # | Claim (where used) | Source 1 | Source 2 | Result |
|---|---|---|---|---|
| 1 | As a teenager he went to Germany in 1990 to visit a friend who played for Borussia Neunkirchen, a third-division club (clue 1, body, hook) | 90min.de, "Was macht eigentlich Jay-Jay Okocha?" https://www.90min.de/posts/was-macht-eigentlich-jay-jay-okocha (opened): "Als Spieler der Enugu Rangers gönnte sich Okocha 1990 einen Urlaub in Deutschland ... Ein Freund von ihm spielte damals in der dritten Liga bei Borussia Neunkirchen" | Planet Football, "A tribute to the sensational Jay-Jay Okocha" https://www.planetfootball.com/nostalgia/tribute-amazing-jay-jay-okocha-great-bolton-team (opened): "Visiting a friend in Germany, he went along to one of his training sessions for Borussia Neunkirchen"; Duke International Magazine https://dukeintmagazine.com/with-a-smile-and-a-step-over-the-enduring-legacy-of-jay-jay-okocha/ (opened): "A fortuitous holiday to Germany in 1990 ... he trained with third-division side Borussia Neunkirchen"; Okocha himself, Goethe-Institut interview (search excerpt; page needs a login, not opened): "I went to visit my brother's friend and I thought that's it. A visit, no more" | Confirmed. "Teenager": NAN https://nannews.ng/okocha-credits-germany-for-shaping-his-football-career/ (opened) quotes him: "I went there when I was just 17"; 90min: debut "als 17-Jähriger". Third division: 90min, Duke, NAN ("a third-division club"). **"Holiday" was dropped on purpose:** Okocha has also said it "wasn't holiday" and that he went on a visiting visa (Legit.ng, search excerpt; page 403). "Visit a friend" is true in every version. "West Germany" was dropped: reunification was on 3 Oct 1990, and sources just say "Germany". |
| 2 | He joined in at training and the coach offered him a contract (clue 1, body, hook) | 90min.de: "Okocha begleitete ihn eines Tages zum Training und begeisterte den Trainer mit seinen Fähigkeiten so sehr, dass er einen Vertrag angeboten bekam" | Duke International Magazine: "impressing the coach enough to earn a contract"; Goethe interview (search excerpt): "after I went to training with him, the coach asked me whether I could come back" | Confirmed. The friend's name (Binebi Numa) appears only on Wikipedia: not used. "Invited back the next day" (Wikipedia) and "offered on the spot" (one search summary) disagree: neither was used. The draft said "He never needed a trial" in the reflection. I removed it, because Okocha's own account (Legit.ng excerpt) mentions "trials". |
| 3 | From Neunkirchen he moved on to Eintracht Frankfurt (body) | NAN (opened): "in 1992 he signed for Eintracht Frankfurt" | worldfootball.net profile (search excerpt): Frankfurt 07/1992 – 06/1996; ThisDay, Bundesliga.com: playing for Frankfurt in 1993 | Confirmed. **The year is not given in the text**, because some sources say December 1991. |
| 4 | In 1993, against Karlsruhe, he dribbled past Oliver Kahn twice and scored (clue 4, body, dek, title) | t-online, "Okocha lässt den Titan ins Leere fliegen" https://www.t-online.de/sport/fussball/bundesliga/id_58392540/okochas-legendaerer-treffer-gegen-oliver-kahn.html (opened): "Wir schreiben den 31. August 1993"; Okocha goes past Kahn, then Kahn dives "erneut vergeblich" at the shot | Duke International Magazine: "famously wrong-footing the great Oliver Kahn twice before scoring"; Sky Sports https://www.skysports.com/football/news/11881/12671255/okocha-on-scoring-the-best-ever-bundesliga-goal (opened): after two feints past Kahn he "fires the ball between two defenders and past Kahn into the net"; Bundesliga.com https://www.bundesliga.com/en/bundesliga/news/jay-jay-okocha-and-that-goal-against-oliver-kahn-17144 (opened): "that August evening in 1993", against Karlsruher | Confirmed. The exact date (31 Aug 1993) is t-online plus search summaries only, so the text says "In 1993". The venue was dropped because sources disagree: t-online says a Frankfurt home game, one search summary says the Wildparkstadion. "Came off the bench" (t-online, ThisDay) is true but was cut for length. "Five players" (Bundesliga.com) and "three times" (Planet Football) disagree on how many players he beat, so no count is given. Season note: 31 Aug 1993 is in 1993–94, though some English pieces say 1992–93; the text gives only the year. |
| 5 | Frankfurt won 3–1 (body) | Bundesliga.com (opened): "Frankfurt won 3-1" | ThisDay, "Okocha's goal makes me dizzy, says Oliver Kahn" https://www.thisdaylive.com/index.php/2016/09/01/okochas-goal-makes-me-dizzy-says-oliver-kahn (opened): Frankfurt won 3-1 v Karlsruhe | Confirmed. |
| 6 | Viewers of the German TV programme Sportschau voted it the Goal of the Year for 1993 (clue 4, body) | ThisDay (opened): "voted as 1993 Goal of the Year by viewers of Sportschau" | t-online (opened): first Tor des Monats, "später sogar zum Tor des Jahres gewählt"; Duke: "a strike voted Germany's Goal of the Year" | Confirmed. |
| 7 | In 1996 he won Olympic gold with Nigeria; they beat Brazil 4–3 in the semi-final and Argentina 3–2 in the final (clue 3, body, dek) | Olympedia, Football, Men 1996 https://www.olympedia.org/results/34098 (opened via curl): "Nigeria NGR 4 – 3 Brazil BRA AET (sudden-death)" (31 Jul) and "Nigeria NGR 3 – 2 Argentina ARG" (3 Aug); squad table "10 Jay-Jay Okocha 6 [matches] 2 [goals]" | Olympics.com, "When Nigeria's Super Eagles stunned the world" (search excerpt; page timed out twice): Nigeria came back to beat Brazil 4-3, beat Argentina 3-2, Okocha and captain Kanu named as the team's greatest players; OkayAfrica https://www.okayafrica.com/legends-nigerias-dream-team-made-african-football-history-at-atlanta-96-olympics/129678 (opened via curl): gold team "led by folk heroes like Nwankwo Kanu, Austin 'Jay Jay' Okocha" | Confirmed. Kanu's golden goal is not mentioned, to keep Kanu out as a subject. |
| 8 | Nigeria became the first African team to win the Olympic football tournament (body) | Olympedia (opened): "the Nigerians, who celebrated Africa's first Olympic gold medal in football" | Olympics.com (search excerpt): "the first African team to win Olympic men's football gold" | Confirmed. |
| 9 | In 1998 Paris Saint-Germain signed him from Fenerbahçe (clue 2, body) | 90min.de (opened): moved from Istanbul to Paris Saint-Germain in August 1998 | worldfootball.net (search excerpt): Fenerbahçe 1996–1998; search summary (several outlets): PSG signed him from Fenerbahçe in 1998 | Confirmed. |
| 10 | He became the most expensive African player of the time (clue 2, body, dek) | Duke International Magazine (opened): "where he became the most expensive African player at the time" | Planet Football (opened): PSG paid £14 million, "a record for an African footballer"; Soccernet.ng headline "one-time Africa's most expensive player" (search excerpt) | Confirmed. **The fee itself is left out:** sources give £14m, £10.9m, €12.4m, €15m and $18m. |
| 11 | In 2002 he joined Bolton Wanderers (body) | Planet Football (opened): out of contract after the 2002 World Cup, then "agreed to join the lowly Trotters" | These Football Times https://thesefootballtimes.co/jay-jay-okocha-so-good-they-named-him-twice/ (opened): "When Bolton Wanderers signed Okocha in 2002"; SuperSport (opened): brought in "on the back of his showing at the 2002 World Cup" | Confirmed. |
| 12 | He later became captain (body) | Planet Football (opened): "Okocha was even made captain when Gudni Bergsson left that summer" | These Football Times (opened): "The Nigerian magician captained a Bolton side" | Confirmed. |
| 13 | The fans called him the man so good they named him twice (body) | These Football Times (opened): the line was a "terrace chant" | SuperSport (opened): the club printed T-shirts reading "Jay-Jay – so good they named him twice"; search summary: Bolton's site used the chant in 2017, when fans voted him the best player at the Reebok | Confirmed. It is written as a paraphrase, not a quotation, so the story has **no direct quote**. |

Hook: "He tagged along to a friend's training and left with a contract. Can you name him in 4 clues?" (93 characters)
restates clue 1 (rows 1–2), with no name. Dek (143 characters) restates clues 1 to 4 in order. The title names him, as every quiz
title does. Reflection: "He went to Germany to visit a friend. / One training session turned a visit into a career."
restates rows 1–2. It's framing, not a new fact.

Clue lengths: 136, 107, 108, 118 characters. None names him. Clue 2 gives "African", clue 3 implies Nigeria, and clue 4 (Kahn) is the
giveaway, as intended. Body: 177 words.

## Dropped
- "Holiday" (he has disputed it); "West Germany"; the friend's name, Binebi Numa (Wikipedia only); the "next day" vs "on the spot"
  timing of the contract offer; the Frankfurt start year (1991 or 1992); the exact date and venue of the Kahn goal; how many players he beat;
  "came off the bench" (cut for length); every transfer fee figure; the Bayern Munich interest story (Legit.ng/AfricaSoccer only,
  not opened); the Klopp "most spectacular goal" quote and Kahn's "still dizzy" tweet (fine, but kept to stay quote-free);
  his 40-yard goal against West Ham voted Bolton's best Premier League goal (SuperSport only); Ronaldinho at PSG (featured 9 Dec).

Routes tried for blocked pages: Legit.ng (WebFetch 403, curl gives a 986-byte stub), Goethe-Institut (redirects to a
Microsoft login, so not opened; goethe.de mirror returned 129 bytes), Stars and Stripes FC (403), olddaysfootball (403),
guardian.ng (403), Olympics.com (WebFetch timed out twice, curl returned empty), Goal.com en-ng (404), FourFourTwo (404). Each claim
that relied on them has a second source that was opened.

## PHOTOS

Commons has very few photos of Okocha. A full search (API search for "Okocha", "Jay-Jay Okocha", "Jay Jay", "Augustine Azuka",
"Okocha Bolton/Nigeria/PSG/Frankfurt", and the members of Category:Jay-Jay Okocha) found only:
- two 2017 legends-match photos (below, both usable);
- five 2022 US State Department photos from an Abu Dhabi/Dubai legends event ("Ambassador's UAE Trip in Support of the Abraham
  Accords. March 28-30, 2022 45/47/58/59/62.jpg"). Okocha is a small figure at the end of a line-up. Unusable.
- two 2008 racehorse photos (a horse named "Jay Jay Okocha"). Not him.
There is **no free photo of him in a Nigeria, Eintracht Frankfurt, PSG, Fenerbahçe or Bolton shirt** on Commons.

1. **File:Match legends 2017 CC (1).jpg**. https://commons.wikimedia.org/wiki/File:Match_legends_2017_CC_(1).jpg
   - Licence (read from the page): CC BY-SA 3.0 Unported (also GFDL 1.2+). Permission is on file under VRT ticket #2008100510027116.
   - Author: Кирилл Венедиктов (Kirill Venediktov), soccer.ru. Date: 23 May 2017. Size: 1,240 × 1,600.
   - Shows (I looked at it at 960 px): Okocha alone in focus, running towards the camera with the ball at his feet. Face fully
     visible and sharp, head and hair inside the frame with space above. He wears a blue patterned adidas legends-match
     shirt (sponsor patch blacked out, no number visible), black shorts, camouflage socks and gold boots. Blurred spectators and a red/blue
     advertising board behind him. A small "soccer.ru" watermark sits bottom left (leave it out).
2. **File:Match legends 2017 CC (5).jpg**. https://commons.wikimedia.org/wiki/File:Match_legends_2017_CC_(5).jpg
   - Licence: CC BY-SA 3.0 Unported (also GFDL). VRT permission. Author: Кирилл Венедиктов, soccer.ru. Date: 23 May 2017.
     Size: 1,268 × 1,600 (watermark removed in the 5 Jan 2024 version).
   - Shows: the same match and kit, Okocha in the centre with the ball, face clear in three-quarter view. Other players are
     cut off at both edges (one of them appears to be Marcel Desailly, not checked). This is the second choice, because of the extra people.

Picture-standard note for the art-director and the owner: rule 3 (real kit) cannot be met with a period shirt, because no
free photo of him in any club or Nigeria shirt exists. My recommendation is to paint the 2017 photo **in the kit as photographed**
(plain blue patterned legends shirt, no crest, no number, no sponsor). Do not invent a Nigeria or Bolton shirt from a photo that
does not show one. Real likeness (rule 1) is better served by this sharp, recent photo than by any other file. Because this breaks rule 3,
the owner should see and approve it, as the picture guide asks.

Ready-to-paste `data/reference-photos.json` entry:

```json
"053": [
  {
    "commons": "File:Match legends 2017 CC (1).jpg",
    "licence": "CC BY-SA 3.0",
    "why": "'Guess the legend' reveal: Jay-Jay Okocha at a legends match on 23 May 2017, alone in focus, running towards the camera with the ball at his feet, face sharp and fully visible. Commons has no free photo of him in a Nigeria, Eintracht Frankfurt, PSG or Bolton shirt, so paint the kit exactly as photographed; do not invent a club or national shirt. Leave out the spectators behind him and the soccer.ru watermark.",
    "kit": "2017 legends-match adidas shirt in blue camouflage pattern with white collar and three white stripes on the shoulders, the sponsor patch left blank, black shorts, as photographed (no crest, no number); exception to the period-kit rule because no period photo exists, owner to approve",
    "crop": "attention",
    "alt": "Watercolour painting of Jay-Jay Okocha running with the ball at his feet, in a blue patterned shirt and black shorts"
  }
]
```

Ready-to-paste `data/reference-queries.json` entry:

```json
"053": {
  "want": "Jay-Jay Okocha, face clearly visible, ideally in a Nigeria, Eintracht Frankfurt, PSG or Bolton shirt",
  "queries": [
    "Jay-Jay Okocha",
    "Okocha",
    "Okocha Bolton",
    "Okocha Nigeria",
    "Augustine Okocha"
  ]
}
```

No browser tabs were opened for this work. Everything was fetched with WebFetch, WebSearch and curl.
