# Picture guide

How to make the hero picture for each story: pick a free reference photo, then ask ChatGPT (GPT Image) to repaint it as a watercolour in the house style. The style follows the approved Ronaldo example: one person in Brazil's yellow shirt, arms spread, celebrating, painted loosely on a plain background.

The candidate photos for every story, two per story with the best first, are in `data/reference-photos.json`. The table at the end lists the best one for each story.

## What is in design/references/ (checked 19 October 2026)

The Reference photos workflow downloaded 45 photos from Wikimedia Commons, read each licence from Commons itself and refused anything that was not free. Every file's photographer and licence is in `design/references/README.md`.

**Strongest references.** One person, the right moment, the right era. Start with these:
004-1 (Cruyff scoring), 005-1 (Gerrard striking), 006-1 (Garrincha dribbling), 009-1 (Ghiggia's goal), 010-1 (Weah for PSG), 012-2 (Di Stéfano), 014-1 (Yashin's save), 018-1 (Eusébio shooting), 019-1 (Bobby Charlton), 020-1 (Guardiola), 022-1 (Maradona celebrating), 023-1 (Valentino Mazzola), 028-1 (Henry), 002-1 (Puskás), 003-2 (Clough).

**Usable but weaker.** These are static portraits, group shots that need cropping, or the wrong era, so mention the year and kit in the prompt: 007, 008, 011, 013, 016, 017, 021, 024, 025, 026, 027 and 029.

**No usable photo.** For 015, 017, 026 and 027 the first choice is "paint without a reference", using the scene in the table below.

**Did not download.** Commons did not recognise these file names, so the names need checking:
- 020-2 (Guardiola, 2009 final)
- 021-2 (Vilfort)
- 024-1 (Juninho free kick)
- 028-2 (Highbury trophy)
- 029-2 (Ferguson)
- both 030 picks (Dick, Kerr Ladies)

**Removed after review:**
- 001-2: Ronaldo in a suit, years later. Story 001 already has its painting.
- 010-2: Weah as president, which is not the footballer the story is about.
- 019-2: the Busby photo is marked public domain but credited to Scanpix, so its licence is doubtful.

## How to pick a good reference photo

1. **One person.** A single player or manager fills the square. Avoid team line-ups and crowds. If a good photo has two people, crop to one before you upload it.
2. **Face and emotion.** The face should be large enough to read the expression: joy, effort, grief, concentration. A face in profile is fine. A face turned away is not.
3. **The moment that defines the story.** A goal celebration, a save, a header, a trophy lift, a manager on the touchline. Choose the moment the story is about over a nicer portrait from some other day.
4. **Period kit.** The shirt should match the year of the story. If the only photo shows the wrong shirt, say which kit you want in the prompt (for example "Ajax white shirt with a broad red band, 1973").
5. **Simple background.** Grass, sky or a blurred stand is ideal. Busy stadium signs and crowds turn into clutter in watercolour.
6. **Free licence only.** Public domain, CC0, CC BY or CC BY-SA. Never use NC (non-commercial), ND (no derivatives) or "fair use" photos, or agency photos that carry no free licence.
7. **No crests or sponsors.** Badges, sponsor names and advertising boards should not dominate the picture. The prompt removes them, but it works better if they are small to begin with.
8. **Portrait-friendly framing.** Head and upper body, with some space around them, crops well to a square. A tiny figure in a wide shot does not.

If no free photo exists, paint a scene without a real person's face: a figure seen from behind, an object (a neck brace, a trophy, a ship), or a place. The table marks these stories "no reference".

## Licence and credit

- **CC BY or CC BY-SA photo.** The painting needs a credit line under the picture: *Painting after a photo by NAME, LICENCE*, for example *Painting after a photo by Peter Woodentop, CC BY-SA 2.0*. Take the name and licence from the photo's Commons page.
- **Public domain or CC0 photo.** No credit is needed. A short "after a photo from the Nationaal Archief" is a nice courtesy.
- **"Licence to confirm"** in the table means the search result did not show the licence clearly. Open the Commons page and check the licence box before you use the photo. If it is not one of the four free licences above, use the second choice.
- **Never use as a reference:** Google Images results, Getty Images, AP, Reuters, PA, or photos from club or league websites. A painting copied closely from one of those is still a copy of their photo.

## The ChatGPT prompt

Attach the reference photo and paste:

> Repaint the attached photo as a loose, hand-made watercolour illustration in the style of an editorial newsletter cover. Keep the person's likeness, face, expression and pose exactly as in the photo, so they are clearly recognisable. Show one person only, from about the waist up, filling most of a square (1:1) frame. Use soft, transparent washes, visible paper texture, confident brush edges with no ink outlines, and gentle colour bleeds, on a warm off-white paper background that fades out around the figure. Keep the shirt colours true to the period: [KIT, YEAR]. Remove all club crests, badges, sponsor logos, kit-maker logos, shirt numbers, advertising boards and any lettering in the background. Leave out other people, a crowd or a stadium. Do not add text, a signature or a frame. Scene: [SCENE NOTE FROM THE TABLE].

Follow-up fixes, one line each:

1. "The face no longer looks like the person in the photo. Redo it, keeping the face exactly as photographed and changing only the painting style."
2. "There is still a logo, crest or lettering on the shirt or in the background. Remove it completely and leave plain fabric or plain wash."
3. "Make it looser and lighter: more white paper showing, softer edges, less detail in the background."
4. "Make it square and move the figure into the centre with more space above the head."

## Story by story

| No. | Story | Best reference (Commons file) | Licence | Scene note for the prompt |
|---|---|---|---|---|
| 001 | Ronaldo / The World Cup he won on two rebuilt knees | File:Ronaldo 2002 cropped.jpg | CC BY-SA 4.0 (Milly barzellai) | Arms spread, celebrating, yellow Brazil shirt, 2002 (approved example exists) |
| 002 | Ferenc Puskás / The exile who scored 156 goals for Real Madrid | File:Ferenc Puskás.jpg | CC0 | Puskás smiling, all-white Real Madrid shirt, early 1960s |
| 003 | Nottingham Forest / Two European Cups from the Second Division | File:Nottingham Forest FC (Amsterdam, 1980) - Francis, Clough, Robertson.jpg (crop to Clough) | CC0 | Brian Clough, green sweatshirt, wry confident look, 1980 |
| 004 | Ajax 1971 to 1973 / Three European Cups | File:Johan Cruijff (Ajax) scoort.jpg | CC BY-SA 3.0 NL | Cruyff striking the ball, white Ajax shirt with a red band, 1971 |
| 005 | Istanbul 2005 / The half-time substitution | File:Liverpool footballer Steven Gerrard.jpg | Licence to confirm | Gerrard, red Liverpool shirt, fist clenched, 2005 (or no-reference scene of the cup raised at night) |
| 006 | Garrincha / The bent-legged winger who won 1962 | File:Garrincha na copa de 1962.jpg | Public domain | Garrincha dribbling, yellow Brazil shirt, blue shorts, 1962 |
| 007 | Leicester City / Champions at 5,000 to 1 | File:LCFC lift the Premier League Trophy (26943755296) (cropped).jpg | CC BY-SA 2.0 (Peter Woodentop) | Captain lifting the trophy, blue Leicester shirt, 2016 |
| 008 | Arrigo Sacchi's Milan | File:Arrigo Sacchi.jpg | CC BY-SA 2.0 (Elena Torre) | Sacchi on the touchline, younger, dark coat, arms folded, 1989 |
| 009 | The Maracanazo | File:Gol ghiggia vs brasil.jpg | Public domain | Ghiggia shooting at the near post, sky-blue Uruguay shirt, 1950 |
| 010 | George Weah / From Clara Town to the Ballon d'Or | File:Coppa UEFA 1992-93 - Napoli vs PSG - George Weah.jpg | Public domain | Weah celebrating a goal, dark-blue PSG shirt, 1992 |
| 011 | Athletic Club / The club that only picks its own | File:Zarra Final Copa 1950.png | Licence to confirm | Zarra heading or shooting, red-and-white Athletic stripes, 1950 |
| 012 | Real Madrid 1956–60 / Five European Cups | File:Di Stefano 1959.jpg | CC0 | Di Stéfano, all-white Real Madrid shirt, intent look, 1959 |
| 013 | 93:20 / Agüero and Manchester City | File:Aguero sending photos - Premier League parade 2011-12.jpg | Licence to confirm | Agüero beaming, sky-blue City shirt, 2012 (or no-reference shirt-swirl from behind) |
| 014 | Lev Yashin / The only goalkeeper to win the Ballon d'Or | File:Yashin v argentina.jpg | Licence to confirm (probably PD) | Yashin diving full stretch, all-black keeper kit and cap, 1961 |
| 015 | Boca Juniors / The colours from a Swedish ship | No reference | n/a | Steamer with a blue-and-yellow Swedish flag on the Riachuelo, 1907, a young man watching from the dock, his back to us |
| 016 | Celtic's Lisbon Lions | File:Trainer Jock Stein van Celtic in het Hiltonhotel, Bestanddeelnr 924-3395.jpg | CC0 | Jock Stein, dark suit, determined look, late 1960s |
| 017 | Cameroon 1 Argentina 0 | No reference | n/a | Cameroon striker in green shirt and red shorts rising for a header, side-on, face in shadow, 1990 |
| 018 | Eusébio / From Mozambique to Benfica | File:Ajax tegen Benfica 2-1, Schrijvers in duel met Eusebio, Bestanddeelnr 917-7453.jpg | Licence to confirm (probably CC0) | Eusébio running at goal, red Benfica shirt, 1965 |
| 019 | Manchester United after Munich | File:Bobby charlton elgrafico.JPG | Licence to confirm (probably PD) | Bobby Charlton, red United shirt, quiet resolve, 1960s |
| 020 | Barcelona 2008–12 / Guardiola | File:Manager Josep Guardiola.jpg | CC BY 2.0 (Tsutomu Takasu) | Guardiola on the touchline, grey suit, gesturing, 2009 |
| 021 | Denmark at Euro 1992 | File:Peter Schmeichel juli 1991.JPG | Public domain | Schmeichel, arms wide, red Denmark keeper kit, 1992 |
| 022 | Diego Maradona / Four minutes against England | File:Maradona vs england.jpg | Public domain | Maradona celebrating, fist raised, sky-blue-and-white stripes, 1986 |
| 023 | Grande Torino / The champions who never came home | File:Italy v Hungary - Turin, 1947 - Valentino Mazzola.jpg | Public domain | Valentino Mazzola shooting, maroon Torino shirt, 1940s |
| 024 | Lyon 2002–08 / Seven straight titles | File:Juninho-free-kick 2.jpg | CC BY-SA 3.0 | Juninho striking a free kick, white Lyon shirt, mid-2000s |
| 025 | Greece at Euro 2004 | File:Charisteas' Siegtreffer im Finale der Euro 2004.jpg | GFDL, licence to confirm | Charisteas rising for the winning header, white Greece shirt, 2004 |
| 026 | Bert Trautmann / The broken-neck final | No reference (or File:Bert Trautmann's Neck Brace.jpg as a still life) | n/a (brace photo CC BY 2.0, Smabs Sputzer) | 1950s goalkeeper in a grey jersey seen from behind, hand to his neck, old Wembley |
| 027 | Wimbledon / Two penalty saves, 13 years apart | No reference | n/a | Goalkeeper diving to his left to save a penalty, seen from behind the goal, old Wembley, 1988 |
| 028 | Arsenal's Invincibles | File:Thierry Henry Charlton.jpg | Licence to confirm | Henry celebrating, red-and-white Arsenal shirt, 2004 |
| 029 | Camp Nou, 26 May 1999 | File:1999 UEFA Champions League celebration (edited).jpg (crop to one player) | Licence to confirm | United player sliding on his knees, arms wide, red shirt, 1999 |
| 030 | Lily Parr / The Dick, Kerr star | File:Dick, Kerr's Ladies kiss.jpg | Licence to confirm (Flickr Commons, 1920) | 1920s player in a striped Dick, Kerr shirt and cap, cheerful, muddy pitch |
