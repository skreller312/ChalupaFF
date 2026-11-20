# Strahdsmas — Barovian Gift Exchange

A Curse of Strahd-themed shared Secret Santa experience, hosted under `/strahd/` in ChalupaFF.

## Participants and restrictions
The six participants are Ashling, Lana, Strahd, Kaedrin, Zillah, and Penelope. Each participant gives to one other participant and receives from one participant. Self-assignments are prohibited. Ashling/Lana and Kaedrin/Penelope are mutual forbidden pairings. The client uses randomized permutations and retries until it finds a valid draw; database constraints independently enforce the exclusions and one-to-one assignment.

## Deployment
1. Create a free Supabase project.
2. Open Supabase SQL Editor. In `supabase-setup.sql`, replace `SET_A_LONG_RANDOM_HOST_CODE` with your host password in a local copy, then run the script in Supabase. Do not commit that edited SQL file: this repository is public. Prefer a longer, unique password than a memorable phrase.
3. In Supabase Project Settings > API, copy the Project URL and anon/public key.
4. Put those values in `app.js` as `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
5. Commit/push the `strahd/` folder to the repository's `main` branch. With GitHub Pages enabled for the repository, visit `https://skreller312.github.io/ChalupaFF/strahd/`.

## Participant password setup
After running the base setup script, create one password hash per participant in Supabase SQL Editor. Do not put these passwords in GitHub or browser code. Use the private SQL seed statement supplied by the organizer to populate `public.black_ball_access_codes`. Passwords are stored as bcrypt hashes; the browser submits the selected character and entered password to the `reveal_assignment` RPC. Direct table access is revoked for anonymous and authenticated clients.

## How it works
- The host opens “For the Master of the Black Ball”, enters the host code, and casts the draw. Publishing replaces the previous active draw.
- Each participant selects their character, enters their unique private character password, and clicks “Discover My Fate”.
- Supabase returns only that participant's recipient; the browser plays a recipient-specific scene with the participant's name woven into it.
- The complete assignment table is not directly readable by anonymous clients. Publishing requires the host code.

## Important privacy note
The site uses unique per-character passwords, stored as bcrypt hashes in Supabase. This prevents casual visitors from selecting every character and revealing all assignments. It cannot prevent a participant from sharing their password or screenshot. Use a unique password per participant and distribute each one privately.

## Notes
- The scenes are authored in `app.js` and can be edited independently of the draw logic.
- The Supabase anon key is designed to be public; never put a Supabase service-role key in browser code.
- The app is a static page and does not modify the existing fantasy dashboard.
