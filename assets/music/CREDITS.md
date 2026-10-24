# Reel music

Every track is a **public-domain** recording (no licence fee, no credit needed, no copyright claims), cut to 25 seconds
and loudness-matched at -14 LUFS. Source: Wikimedia Commons, recordings by the Musopen project.

**In use:** only `coriolan.m4a`, on every Reel (owner's choice, 24 Oct 2026). The other three stay here, unused, in case
the owner wants them later. `TRACKS` in `scripts/lib/reel.ts` sets what is used.

| file | piece | section used | source |
|---|---|---|---|
| egmont.m4a | Beethoven, Egmont Overture, Op. 84 (Musopen Symphony) | 8:10 to 8:35, the closing fanfare | https://commons.wikimedia.org/wiki/File:Beethoven_-_Egmont_Overture,_Op._84_(Musopen_Symphony).flac |
| coriolan.m4a | Beethoven, Coriolan Overture, Op. 62 (Musopen Symphony) | 2:05 to 2:30 | https://commons.wikimedia.org/wiki/File:Beethoven_-_Coriolan_Overture,_Op._62_(Musopen_Symphony).flac |
| mozart40.m4a | Mozart, Symphony No. 40 in G minor, K550, I. Molto allegro (Musopen Symphony) | 0:00 to 0:25, the famous opening | https://commons.wikimedia.org/wiki/File:Mozart_-_Symphony_No._40_in_G_minor,_K550_-_I._Molto_allegro_(Musopen_Symphony).flac |
| hebrides.m4a | Mendelssohn, Hebrides Overture, Op. 26 (Musopen Symphony) | 3:20 to 3:45, the storm | https://commons.wikimedia.org/wiki/File:Mendelssohn_-_Hebrides_Overture,_Op._26_(Musopen_Symphony).flac |

To add a track: put a public-domain or royalty-free file here (25 seconds or longer), add a row above, and add it to
`TRACKS` in `scripts/lib/reel.ts`. Never use a commercial or "trending" song: Instagram and Facebook mute or remove it.
