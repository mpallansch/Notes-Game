Notes Game

How to test

1. Run `npm install` in the root folder, `client` folder, `server` folder, and `ai` folder
2. Run `npm run create-database` in the `server` folder
3. Run `npm test` in the root directory
4. Run `npm run setup` in the `ai` folder
5. Run `npm test` in the `ai` folder
6. Sign into the page at http://localhost:3000 using credentials foo@test.com   something123
7. Join game 'test'


Notes SPECIFIC TODO

1. Improve AI logic (not have just random moves)
2. Handle kick request mid-game
3. Change inactive game logic to include no recent actions on sockets

GENERAL TODO

1. Add captcha for login after several incorrect attempts
2. Add captcha for registering (make able to be disabled on dev, so setup script in ai folder still works)
3. Add message when server restart is about to occur (in progress)
4. Add settings to settings page
