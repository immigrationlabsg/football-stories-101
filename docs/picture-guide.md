# Picture guide

How to make the hero picture for each story: pick a free reference photo, then ask ChatGPT (GPT Image) to repaint it as a watercolour in the house style. The style follows the approved Ronaldo example: one person in Brazil's yellow shirt, arms spread, celebrating, painted loosely on a plain background.

The candidate photos for every story, two per story with the best first, are in `data/reference-photos.json`. The table at the end lists the best one for each story.

## Housekeeping

All 30 paintings are live, so the working folders were deleted to keep the repository small: the downloaded reference photos
(`design/references/`), the search contact sheets (`design/candidates/`) and the 1024-pixel paintings (`design/paintings/*.png`).
The photo choices (`data/reference-photos.json`), the search queries (`data/reference-queries.json`) and the live images
(`public/images/stories/`) stay. GitHub keeps old versions in its history, which is fine.

To make the hero for a new story (the recipe the editor chose, "C": high quality, the Ronaldo painting as the style reference):

1. Add the story's search queries to `data/reference-queries.json` and run **Reference candidates** (Actions tab) for that story.
   Look at `design/candidates/NNN.jpg`, pick the photo, and put its Commons file name, a one-line "why", the kit and an "alt" in `data/reference-photos.json`.
2. Run **Reference photos** to download the photo, then **Paint with GPT Image** for the story number. Look at `design/paintings/NNN.png`.
3. Run `npm run publish-painting -- N`. It writes the hero, the alt text and the credit ("Painting after a photo by NAME, LICENCE, via Wikimedia Commons. Image generated with AI.").
4. Delete the working files again (`design/references/`, `design/candidates/`, `design/paintings/*.png`).

## What is in design/references/ (picked 19 October 2026)

Every pick shows the moment the story is about: the goal, the final, the trophy, the celebration. A portrait is used only when the story is about that person and no match photo exists. `design/references/NNN-1.jpg` is the first choice for story NNN and `NNN-2.jpg` the second. Each photo's licence was read from Commons itself, and the credits are in `design/references/README.md`.

**How they were chosen.** A GitHub job searched Commons with queries aimed at each story's moment (`data/reference-queries.json`) and saved a numbered contact sheet per story in `design/candidates/`. The best one or two were then picked by eye. To see the alternatives for any story, open `design/candidates/NNN.jpg`; the matching `NNN.json` gives the Commons file name for each number.

**Strong matches**
- 002: Puskás leading Real Madrid out, 1962
- 004: Ajax celebrating in the 1972 final
- 005: Gerrard; the Istanbul trophy parade
- 006: Garrincha dribbling, 1962
- 007: Leicester lifting the trophy
- 008: Van Basten in Milan stripes
- 009: Ghiggia's goal
- 011: the Gabarra, 2024
- 013: Agüero with the trophy
- 014: Yashin's save
- 015: ships at La Boca
- 018: Eusébio shooting
- 019: the Busby Babes' last line-up
- 020: Guardiola thrown in the air
- 022: Maradona celebrating against England
- 023: the Grande Torino team
- 025: Charisteas's header
- 026: Trautmann's neck brace
- 028: the Highbury trophy day
- 029: United behind the WINNERS banner
- 030: the Dick, Kerr Ladies, 1920

**Close, but tell ChatGPT what to change**
- 003: Forest in the 1980 European Cup run. No free photo of either final exists.
- 010: Weah at PSG. Ask for Milan stripes, 1995.
- 012: Di Stéfano in Real Madrid white.
- 016: Celtic's hoops in the 1970 final. Ask for Lisbon sunshine and Inter in blue and black.
- 024: Juninho's free kick, a dark night shot.

**Paint without a reference**
- 017, 021 and 027: there is no free photo of the match. The first entry in `data/reference-photos.json` describes the scene to ask for.
- 001: Ronaldo already has its painting.

## How to pick a good reference photo

1. **The story's moment, not just the person.** Pick the goal, the final, the trophy lift or the celebration that the story is about, in the kit of that club and year. If the story is about a team (Forest, Ajax, Leicester), a team celebration beats a portrait of the manager. Use a portrait only when the story is about that one person and no match photo exists.
2. **Face and emotion.** The face should be large enough to read the expression: joy, effort, grief, concentration. A face in profile is fine. A face turned away is not.
3. **The moment that defines the story.** A goal celebration, a save, a header, a trophy lift, a manager on the touchline. Choose the moment the story is about over a nicer portrait from some other day.
4. **Period kit.** The shirt should match the year of the story. If the only photo shows the wrong shirt, say which kit you want in the prompt (for example "Ajax white shirt with a broad red band, 1973").
5. **Simple background.** Grass, sky or a blurred stand is ideal. Busy stadium signs and crowds turn into clutter in watercolour.
6. **Free licence only.** Public domain, CC0, CC BY or CC BY-SA. Never use NC (non-commercial), ND (no derivatives) or "fair use" photos, or agency photos that carry no free licence.
7. **No crests or sponsors.** Badges, sponsor names and advertising boards should not dominate the picture. The prompt removes them, but it works better if they are small to begin with.
8. **Portrait-friendly framing.** Head and upper body, with some space around them, crops well to a square. A tiny figure in a wide shot does not.

If no free photo exists, paint a scene without a real person's face: a figure seen from behind, an object (a neck brace, a trophy, a ship), or a place. The table marks these stories "no reference".

## Licence and credit

Every painting is credited on the story page, in the emails and in the social posts, in this form:

- **CC BY or CC BY-SA photo:** *Painting after a photo by NAME, LICENCE, via Wikimedia Commons. Image generated with AI.* The credit links to the photo's Commons page. Take the name and licence from `design/references/README.md`.
- **Public domain or CC0 photo:** *Painting after a public-domain photo, via Wikimedia Commons. Image generated with AI.* (Name the photographer or archive when it is known.)
- **No photo (a painted scene):** *Illustration: Football Stories 101. Image generated with AI.*

The "Image generated with AI" line is on every painting, the way The Morning Founder labels its images.

- **Never use as a reference:** Google Images results, Getty Images, AP, Reuters, PA, or photos from club or league websites. A painting copied closely from one of those is still a copy of their photo.

## The ChatGPT prompt

Attach the reference photo and paste:

> Repaint the attached photo as a loose, hand-made watercolour illustration in the style of an editorial newsletter cover. Soft, transparent washes, visible paper texture, confident brush edges with no ink outlines and gentle colour bleeds, on a warm off-white paper background that fades out at the edges. Square (1:1) frame. Keep the shirt colours true to the period. Do not add text, a signature or a frame. Keep every person’s likeness, face, expression and pose as in the photo, so they are recognisable, and keep the moment the photo captures. Simplify the background into loose washes. Scene: [the “what it shows” line for that story]

Follow-up fixes, one line each:

1. "The face no longer looks like the person in the photo. Redo it, keeping the face exactly as photographed and changing only the painting style."
2. "There is still a logo, crest or lettering on the shirt or in the background. Remove it completely and leave plain fabric or plain wash."
3. "Make it looser and lighter: more white paper showing, softer edges, less detail in the background."
4. "Make it square and move the figure into the centre with more space above the head."

## Story by story

First choice first. The files are in `design/references/`.

| No. | Story | File | Commons photo | What it shows / scene note |
|---|---|---|---|---|
| 001 | Ronaldo | 001-1.jpg | Ronaldo 2002 cropped.jpg | Ronaldo in Brazil's shirt in 2002. Story 001 already has the owner's painting. |
| 002 | Ferenc Puskás | 002-1.jpg | 1961–62 European Cup - Juventus v Real Madrid - Puskás, Gento and Araquistáin.jpg | Puskás leading Real Madrid out at Juventus in the 1961–62 European Cup: Real Madrid era, the right man, a real match. |
|  |  | 002-2.jpg | Benfica tegen Real Madrid (Finale Europacup I te Amsterdam) 5-3 eerste doelpunt , Bestanddeelnr 913-8512.jpg | Puskás scoring in the 1962 European Cup final against Benfica, a wide night shot. |
| 003 | Nottingham Forest | 003-1.jpg | Europa Cup I wedstrijd Ajax tegen Nottingham Forest 0-1 Viv Anderson, Bestanddeelnr 930-7890 (cropped).jpg | Viv Anderson in action for Forest in the 1980 European Cup semi-final in Amsterdam: Forest on their way to a second European Cup. |
|  |  | 003-2.jpg | Europa Cup I wedstrijd Ajax tegen Nottingham Forest 0-1 Schoenaker (r) in duel , Bestanddeelnr 930-7889.jpg | Forest and Ajax contesting a high ball in the same 1980 semi-final. Commons has no free photo of either final: ask for Forest in red lifting the big-eared cup if you want the trophy moment. |
| 004 | Ajax 1971 to 1973 | 004-1.jpg | Ajax 2 - 0 Inter 1971-1972.jpg | Ajax players with arms raised after scoring in the 1972 European Cup final against Inter. |
|  |  | 004-2.jpg | Ajax-voetballer Piet Keizer met de Europa-cup, Bestanddeelnr 925-6339.jpg | Piet Keizer holding the European Cup, 31 May 1972. |
| 005 | Istanbul 2005 | 005-1.jpg | Liverpool footballer Steven Gerrard.jpg | Gerrard striking the ball in Liverpool red with the 2004–05 Premier League ball. |
|  |  | 005-2.jpg | CL parade Lpool.jpg | Liverpool's open-top bus with the European Cup the day after Istanbul, 26 May 2005. |
| 006 | Garrincha | 006-1.jpg | Garrincha na copa de 1962 (cropped).jpg | Garrincha dribbling between two defenders at the 1962 World Cup (cropped). |
|  |  | 006-2.jpg | Garrincha (Brasil) - El Gráfico 2233.jpg | Garrincha in Brazil's yellow shirt, El Gráfico. |
| 007 | Leicester City | 007-1.jpg | LCFC lift the Premier League Trophy (26943755296) (cropped).jpg | Leicester City lifting the Premier League trophy, 7 May 2016. |
|  |  | 007-2.jpg | LCFC players celebrate after victory vs Everton (27859481336).jpg | Leicester players celebrating on the pitch after the Everton match, 7 May 2016. |
| 008 | Arrigo Sacchi's Milan | 008-1.jpg | Marco van Basten 1990-1992.jpg | Marco van Basten in Sacchi's Milan, red-and-black stripes, running onto the ball (1990–92). |
|  |  | 008-2.jpg | Aankomst v.l.n.r. Ruud Gullit, Frank Rijkaard en Marco Van Basten, Bestanddeelnr 934-4613.jpg | Gullit, Rijkaard and Van Basten, Milan's Dutch trio, days after the 1989 European Cup final. |
| 009 | The Maracanazo | 009-1.jpg | Gol ghiggia vs brasil.jpg | Ghiggia's winning goal in the Maracanã, 16 July 1950. |
|  |  | 009-2.jpg | Uruguay gol schiaffino 1950.jpg | Schiaffino's equaliser in the same match. |
| 010 | George Weah | 010-1.jpg | Coppa UEFA 1992-93 - Napoli vs PSG - George Weah.jpg | Weah celebrating a goal for PSG at Napoli, 1992, on the way to his Ballon d'Or. No free photo of him in Milan's shirt: ask for red-and-black stripes, 1995, if you want the Ballon d'Or season. |
| 011 | Athletic Club | 011-1.jpg | Athleticeko gabarra itsasadarrean.jpg | The Gabarra carrying the Athletic squad up the Nervión, 11 April 2024, the scene the story ends on. |
|  |  | 011-2.jpg | Zarra Final Copa 1950.png | Zarra scoring in the 1950 Copa final. |
| 012 | Real Madrid 1956–60 | 012-1.jpg | Di stefano real madrid cf (cropped).png | Di Stéfano, who scored in all five finals, in Real Madrid white. |
|  |  | 012-2.jpg | Real Madrid tegen Partizan 2-1 te Brussel, aanvoerder Gento met de beker, Bestanddeelnr 919-1274.jpg | Real Madrid with the European Cup in 1966, Gento (who played in all five 1956–60 finals too) holding it. |
| 013 | 93:20 | 013-1.jpg | Nasri & Aguero with trophy.JPG | Agüero with the Premier League trophy at the parade the day after 93:20 (crop out Nasri). |
|  |  | 013-2.jpg | Vincent Kompany holds up the Premier League trophy 2012.jpg | Kompany holding the 2012 Premier League trophy on the parade bus. For the goal itself, paint without a reference: a striker in sky blue whirling his shirt over his head. |
| 014 | Lev Yashin | 014-1.jpg | Yashin v argentina.jpg | Yashin diving to save against Argentina, 1961. |
|  |  | 014-2.jpg | Lev Yashin 1960b.jpg | Yashin catching a high ball, 1960. |
| 015 | Boca Juniors | 015-1.jpg | Regina Margherita at Muelle de la Boca by Samuel Boote (colorized).png | Ships at the Muelle de la Boca in the early 1900s (colourised): the port the Swedish ship story is set in. |
|  |  | 015-2.jpg | La Boca del Riachuelo - Boteros cruzando personas c.1900.jpg | Boatmen on the Riachuelo at La Boca, around 1900. |
| 016 | Celtic's Lisbon Lions | 016-1.jpg | Celtic tegen Feijenoord 1-2 finale Europacup-I in Milaan spelmoment, Bestanddeelnr 923-5041.jpg | Celtic in their green-and-white hoops in a European Cup final (1970, Milan). No free photo of Lisbon 1967 exists: ask for bright sunshine and Inter in blue and black. |
|  |  | 016-2.jpg | Jimmy Johnstone (cropped).jpg | Jimmy Johnstone, one of the Lisbon Lions, 1971. |
| 017 | Cameroon 1 Argentina 0 | (paint) |  | Commons has no free 1990 photo. Paint without a reference: a Cameroon striker in the green 1990 shirt and red shorts rising high for a header under San Siro floodlights, seen side-on with the face in shadow. |
|  |  | 017-2.jpg | Milla2008cropped.jpg | Roger Milla in Cameroon red (2008), for his likeness only; the 1990 opening match has no free photo. |
| 018 | Eusébio | 018-1.jpg | Ajax tegen Benfica 2-1, Schrijvers in duel met Eusebio, Bestanddeelnr 917-7453.jpg | Eusébio shooting for Benfica against Ajax, 1965. |
|  |  | 018-2.jpg | Ajax tegen Benfica 2-1, Eusébio in actie, Bestanddeelnr 917-7451.jpg | Eusébio in action in the same match. |
| 019 | Manchester United after Munich | 019-1.jpg | Busby babes last match.jpg | The Busby Babes lined up in Belgrade on 5 February 1958, their last match before Munich. |
|  |  | 019-2.jpg | Bobby charlton elgrafico.JPG | Bobby Charlton, survivor and 1968 European Cup winner. |
| 020 | Barcelona 2008–12 | 020-1.jpg | FC Barcelona Team 2011.jpg | Barcelona's players throwing Guardiola into the air after winning a trophy. |
|  |  | 020-2.jpg | FC Barcelona Team, 2011.jpg | Xavi, Messi and team-mates celebrating a goal together. |
| 021 | Denmark at Euro 1992 | (paint) |  | Commons has no free photo of Denmark at Euro 1992. Paint without a reference: a Danish player in the red 1992 shirt, arms raised to a Gothenburg evening sky, seen from behind. |
|  |  | 021-2.jpg | Peter Schmeichel juli 1991.JPG | Schmeichel in 1991, a year before Euro 92; a clear face but probably not in Denmark kit. Ask for the red 1992 Denmark goalkeeper kit. |
| 022 | Diego Maradona | 022-1.jpg | Maradona vs england.jpg | Maradona celebrating against England, 22 June 1986, with Fenwick on the ground. |
|  |  | 022-2.jpg | Maradona pateando v inglaterra.jpg | Maradona sliding the Goal of the Century past Shilton. |
| 023 | Grande Torino | 023-1.jpg | Grande Torino 1948 49.jpg | Grande Torino, the 1948–49 team, in colour. |
|  |  | 023-2.jpg | Italy v Hungary - Turin, 1947 - Valentino Mazzola.jpg | Valentino Mazzola shooting, Turin 1947. |
| 024 | Lyon 2002–08 | 024-1.jpg | Juninho-free-kick 2.jpg | Juninho striking a free kick, the signature image of Lyon's seven-title era. |
|  |  | 024-2.jpg | Juninho Pernambucano.JPG | Juninho at Stade Gerland in 2009; check the pose. |
| 025 | Greece at Euro 2004 | 025-1.jpg | Charisteas' Siegtreffer im Finale der Euro 2004.jpg | Charisteas heading the winning goal in the Euro 2004 final. |
|  |  | 025-2.jpg | Euro 2004 Final.jpg | The giant Greek flag on the pitch at the Estádio da Luz before the final. |
| 026 | Bert Trautmann | 026-1.jpg | Bert Trautmann's Neck Brace.jpg | The neck brace Trautmann wore after the 1956 final: the object the story turns on. |
|  |  | 026-2.jpg | Sculpture of Bert Trautmann.jpg | The sculpture of Bert Trautmann in goal. |
| 027 | Wimbledon | (paint) |  | Commons has no free 1988 final photo. Paint without a reference: a tall goalkeeper in a 1988 jersey diving full-length to his left to save a penalty at old Wembley, seen from behind the goal, face hidden. |
|  |  | 027-2.jpg | Beasant.jpg | Dave Beasant in 2003, for a likeness only (older, other club). |
| 028 | Arsenal’s Invincibles | 028-1.jpg | Trophy presentation Highbury 2004.JPG | The trophy presentation at Highbury, 15 May 2004, the day the Invincibles finished unbeaten. |
|  |  | 028-2.jpg | Thierry Henry’s iconic knee slide.jpg | Thierry Henry's knee-slide celebration in Arsenal red and white. |
| 029 | Camp Nou, 26 May 1999 | 029-1.jpg | 1999 UEFA Champions League celebration (edited).jpg | Manchester United behind the WINNERS banner at Camp Nou, 26 May 1999. |
|  |  | 029-2.jpg | Manchester United Treble celebration.jpg | The Treble parade, the three trophies on the open-top bus. |
| 030 | Lily Parr | 030-1.jpg | Dick, Kerr's Ladies kiss.jpg | The Dick, Kerr captain and the French captain kissing before their 1920 match. |
|  |  | 030-2.jpg | Dick, Kerr Ladies.jpg | The Dick, Kerr Ladies team photo. |
