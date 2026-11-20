# The Black Ball — Barovian Gift Exchange

A Curse of Strahd-themed shared Secret Santa experience, hosted under `/strahd/` in ChalupaFF.

## Participants and restrictions
The six participants are Ashling, Lana, Strahd, Kaedrin, Zillah, and Penelope. Each participant gives to one other participant and receives from one participant. Self-assignments are prohibited. Ashling/Lana and Kaedrin/Penelope are mutual forbidden pairings. The client uses randomized permutations and retries until it finds a valid draw; database constraints independently enforce the exclusions and one-to-one assignment.

## Deployment
1. Create a free Supabase project.
2. Open Supabase SQL Editor. In `supabase-setup.sql`, replace `SET_A_LONG_RANDOM_HOST_CODE` with a strong private code, then run the script.
3. In Supabase Project Settings > API, copy the Project URL and anon/public key.
4. Put those values in `app.js` as `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
5. Commit/push the `strahd/` folder to the repository's `main` branch. With GitHub Pages enabled for the repository, visit `https://skreller312.github.io/ChalupaFF/strahd/`.

## How it works
- The host opens “For the Master of the Black Ball”, enters the host code, and casts the draw. Publishing replaces the previous active draw.
- Each participant selects their character and clicks “Discover My Fate”.
- Supabase returns only that participant's recipient; the browser plays a recipient-specific scene with the participant's name woven into it.
- The complete assignment table is not directly readable by anonymous clients. Publishing requires the host code.

## Important privacy note
This version lets visitors enter a character name without an account. It prevents browsing the assignments table, but a visitor could enter another participant's known name and reveal that assignment. If you want stronger secrecy, add a unique PIN per participant or an authenticated login. This is a casual name-entry flow, not identity verification.

## Notes
- The scenes are authored in `app.js` and can be edited independently of the draw logic.
- The Supabase anon key is designed to be public; never put a Supabase service-role key in browser code.
- The app is a static page and does not modify the existing fantasy dashboard.
