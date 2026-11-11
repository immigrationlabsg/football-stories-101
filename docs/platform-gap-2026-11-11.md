# Why the same Reel does so differently on Instagram, YouTube and TikTok (11 Nov 2026)

Read on 11 Nov between 15:00 and 16:00 SGT from YouTube Studio, TikTok Studio, Instagram insights and the repo's records. Small sample: about 5 Reels per platform, each 0.5 to 2.5 days old.

## The numbers

| Story | Instagram | YouTube Short | TikTok |
|---|---|---|---|
| 021 Denmark 1992 | 1,110 viewers, 49 likes, 25 shares, avg watch 22.6 s | 1,328 views, 60% stayed, avg 0:27, +3 subscribers | 798 views, avg 10.3 s, 1 follow |
| 909 Spurs 3-5 United | 111 viewers, 2 likes | 1,136 views, 33% stayed | 0 views |
| 022 Van Persie v Salah | 117 viewers, 0 likes | 146 views, 31% stayed (uploaded by hand, no #shorts) | 0 views |
| 906 Como | 112 viewers, 0 likes | 1,019 views, 24% stayed | 0 views |
| 023 Wimbledon | 126 viewers at about 10 h | 1,187 views, 55% stayed, avg 0:41 | 311 views, avg 10.6 s |

Accounts: Instagram 0 followers (since 20 Oct); YouTube 3 subscribers (since 9 Nov); TikTok 0 followers (since 9 Nov). TikTok viewers are 83 to 96% Singapore; YouTube viewers are worldwide (Denmark's Short was watched most in Denmark).

## Why, most likely first

1. **Each platform tests a new post on a different-sized first audience** (high confidence, the data shows it). YouTube gave nearly every Short about 1,000 tries, even a weak one. Instagram shows each Reel to about 120 people and only widens a Reel people send to friends (Denmark, 25 shares). So most of the gap is the platform, not the Reel.
2. **Three of five TikTok posts got no views at all** (the zeros are data; the cause is a guess, medium confidence). Most likely a brand-new account being held back after three posts in about 21 hours through the API. Possibly reused-content or audio matching. TikTok's account status screen is only in the phone app.
3. **TikTok only shows the page in Singapore and Malaysia** (high confidence): a small audience for European football history.
4. **TikTok viewers leave at about 10 s**, while the same file holds about 60% on YouTube (medium confidence on why): a general local audience rather than football fans, no trending sound yet (the first post with it is 024), words low on screen where TikTok's buttons cover them, and a long essay caption.
5. **The story decides the result on every platform** (medium-high): Denmark leads everywhere; the news extras (Como, 909) hold worst.
6. **Captions written for the website** (low-medium): until today the visible first line had no hook. Since 11 Nov voiced Reels open with the hook.
7. **Posting time** (low): 08:00 SGT is 01:00 in Europe.

## Fixes that can run automatically

- **Measure:** a read-only analytics mode for TikTok and YouTube (Zernio analytics, or the YouTube Analytics API) feeding the daily snapshot, and an alarm when a TikTok post has under 20 views after 12 hours.
- **TikTok:** a short caption (hook with name, club and year, one payoff line, the question, AI line, 3-5 hashtags, under about 300 characters); one TikTok a day for two weeks while the account warms up; test trending sound on even stories and off on odd ones; later a TikTok cut with words above the bottom quarter.
- **YouTube:** use "stayed vs swiped" as the daily hook score (Denmark 60% and Wimbledon 55% are the bar); keep hook plus #shorts as the title; test an evening upload time.
- **Instagram:** story choice is the main lever (sends lift a Reel out of the first 120); hook and name in the first 125 characters (done since 11 Nov); test 20:00 SGT on extras.

Sources: [YouTube engaged views](https://blog.youtube/inside-youtube/engaged-views-youtube-explained/), [Instagram on reaching new people](https://creators.instagram.com/blog/helping-creators-of-all-sizes-break-through), [TikTok For You](https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you/), [Zernio analytics](https://docs.zernio.com/analytics/get-analytics.mdx), plus vendor guides on TikTok's zero-view warm-up (anecdotal).
