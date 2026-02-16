Notes Game

How to test

1. Run `npm install` in the root folder, `client` folder, `server` folder, and `ai` folder
2. Run `npm run create-database` in the `server` folder
3. Run `npm test` in the root directory
4. For AI testing: set `SKIP_EMAIL_VERIFICATION=true` in `server/.env`, then run `npm run setup` in the `ai` folder
5. Run `npm test` in the `ai` folder
6. Sign into the page at http://localhost:3000 using email foo@test.com and password something123 (after AI setup)
7. Join game 'test'

New users: Register on the login page, verify your email via the link sent, then log in with your email and password.

Environment configuration

For local development, defaults work out of the box. For production, copy `.env.example` to `.env` in the `server/` folder and set `SESSION_SECRET` (required), `CLIENT_URL`, and optionally `API_PORT`, `IO_PORT`. See `DEPLOYMENT_PLAN.md` for full details.

Notes SPECIFIC TODO

1. ~~Improve AI logic (not have just random moves)~~ ✅ Done
2. ~~Handle kick request mid-game~~ ✅ Done
3. ~~Change inactive game logic to include no recent actions on sockets~~ ✅ Done

GENERAL TODO

1. ~~Add captcha for login after several incorrect attempts~~ ✅ Done
2. ~~Add captcha for registering (make able to be disabled on dev, so setup script in ai folder still works)~~ ✅ Done
3. Add message when server restart is about to occur (in progress)
4. Add settings to settings page
