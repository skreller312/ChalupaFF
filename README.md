# ChalupaFF

Mobile-first fantasy football dashboard for ESPN Fantasy Football and Sleeper.

## Current status

Initial UI scaffold with mock data.

Supports:
- 8 league cards (3 ESPN + 5 Sleeper)
- League name, record and position
- Current matchup score
- Projection and win-probability visualization
- Expandable starters
- Separate expandable bench
- Player game information and individual stat lines
- Player status highlighting
- All-matchups dialog
- Manual refresh
- Five-minute automatic refresh
- Responsive/mobile-first layout

## Planned architecture

The frontend will consume a small serverless API layer. ESPN and Sleeper data will be normalized into one common schema.

ESPN authentication credentials, if required for private leagues, will remain server-side and never be shipped to the browser.

## Next steps

1. Validate ESPN/Sleeper API fields against the normalized schema.
2. Build the serverless API/adapters.
3. Add league configuration and secure ESPN credentials.
4. Replace mock data with live data.
5. Deploy the frontend and API.
