import 'dotenv/config';
import express from 'express';
import session from 'cookie-session';
import bodyParser from 'body-parser';
import multer from 'multer';
import sqlite3 from 'sqlite3';
import path from 'path';
import nodemailer from 'nodemailer';
import { createServer } from 'http';
import { Server } from 'socket.io';

import auth from './auth';
import config from './constants/Config';
import constants from './constants/Constants';
import { sendVerificationEmail } from './email';
import { PlayerInfo, PlayerState, GameMeta, Chair, itemsPerPage, isActionValid, pointsToWin, roundDelay, ACTION_SUBMIT, ACTION_SKIP, ACTION_SELECT, GameState, validate } from './shared/Shared';
import e from 'express';
//import { Connection, MysqlError } from 'mysql';

//let mysql = require('mysql');

// Defines global variables
const apiWhitelist = ['/login', '/check-login', '/register', '/verify-email', '/login-captcha-required', '/register-captcha-required'];
let serverShuttingDown = false;
let socketClients: any = {};
let gameMetas: any = {};
let playersInGame: any = {};
let gameMetasQueue: Array<GameMeta> = [];

// Failed login attempts per IP: { count, firstAttemptAt }
const failedLoginAttempts: Map<string, { count: number; firstAttemptAt: number }> = new Map();
const FAILED_ATTEMPTS_THRESHOLD = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getClientIp(req: any): string {
  return req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
}

function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const existing = failedLoginAttempts.get(ip);
  if (existing) {
    if (now - existing.firstAttemptAt > ATTEMPT_WINDOW_MS) {
      failedLoginAttempts.set(ip, { count: 1, firstAttemptAt: now });
    } else {
      existing.count++;
    }
  } else {
    failedLoginAttempts.set(ip, { count: 1, firstAttemptAt: now });
  }
}

function clearFailedLogin(ip: string): void {
  failedLoginAttempts.delete(ip);
}

function requiresCaptcha(ip: string): boolean {
  const entry = failedLoginAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    failedLoginAttempts.delete(ip);
    return false;
  }
  return entry.count >= FAILED_ATTEMPTS_THRESHOLD;
}

async function verifyRecaptcha(token: string, remoteip?: string): Promise<boolean> {
  const params = new URLSearchParams({
    secret: config.captchaSecretKey!,
    response: token,
  });
  if (remoteip) params.append('remoteip', remoteip);

  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    body: params,
  });
  const data = await res.json();
  return !!data.success;
}

// Defines global functions
const isGameUnjoinable = (id: string, passphrase: string) => {
    if (!gameMetas[id]) {
        return 'Game does not exist';
    }

    let joinError = gameMetas[id].joinable();

    if (joinError) {
        return joinError;
    }

    if (!gameMetas[id].public && gameMetas[id].passphrase !== passphrase) {
        return 'Game is private, and password is incorrect';
    }
};

const getPlayerFromGame = (gameId: string, username: string) => {
    let gameMeta = gameMetas[gameId];
    if (gameMeta) {
        for (let i = 0; i < gameMeta.playerStates.length; i++) {
            if (gameMeta.playerStates[i].username === username) {
                return gameMeta.playerStates[i];
            }
        }
    }
};

const removePlayerFromGame = (gameId: string, username: string) => {
    let gameMeta = gameMetas[gameId];
    if (gameMeta) {
        for (let i = 0; i < gameMeta.playerStates.length; i++) {
            let playerState = gameMeta.playerStates[i];
            if (playerState.username === username) {
                if (playerState.host && gameMeta.playerStates.length > 1) {
                    for (var j = 0; j < gameMeta.playerStates.length; j++) {
                        if (gameMeta.playerStates[j].username !== playerState.username) {
                            gameMeta.playerStates[j].host = true;
                            break;
                        }
                    }
                }
                gameMeta.playerStates.splice(i, 1);
                delete playersInGame[gameId];
                if(socketClients[gameId]){
                    delete socketClients[gameId][username];
                }
                break;
            }
        }
        for(let i = 0; i < gameMeta.state.chairs.length; i++){
            let chair = gameMeta.state.chairs[i];
            if(chair.username === username){
                if(i === gameMeta.state.currentTurn){
                    gameMeta.state.currentTurn++;
                    if(gameMeta.state.currentTurn >= gameMeta.state.chairs.length){
                        gameMeta.state.currentTurn = 0;
                    }
                }
                gameMeta.state.chairs.splice(i, 1);
                break;
            }
        }
        updateSocketChairIndecies(gameId);
    }
};

const playerConnected = (gameId: string, username: string) => {
    let gameMeta = gameMetas[gameId];
    if (gameMeta) {
        let playerState: PlayerState = getPlayerFromGame(gameId, username);

        if (!playerState) {
            gameMeta.playerStates.push(new PlayerState(username, false, true, Math.max(...gameMeta.playerStates.map((playerState: any) => playerState.color)) + 1));

            if (gameMeta.joinable()) {
                for (let i = 0; i < gameMetasQueue.length; i++) {
                    if (gameMetasQueue[i].id === gameId) {
                        gameMetasQueue.splice(i, 1);
                        break;
                    }
                }
            }
        } else {
            playerState.connected = true;
        }

        playersInGame[username] = gameId;
    } else {
        console.log('Attemted to connect to a game that doesn\'t exist');
    }
};

const playerDisconnected = (gameId: string, username: string) => {
    let playerState: PlayerState = getPlayerFromGame(gameId, username);

    if (playerState) {
        playerState.connected = false;
    }
};

const sendRestrictedState = (gameId: string) => {
    db.run('UPDATE GameMetas SET JSONData = ? WHERE GameId = ?', [JSON.stringify(gameMetas[gameId]), gameId], (err) => {
        if (err) {
            console.log('Error persisting GameMeta', gameId)
        }

        Object.keys(socketClients[gameId]).forEach((socketId: any) => {
            const socket = socketClients[gameId][socketId];
            socket.emit('state', socket.gameMeta.state.getRestrictedState(socket.username));
        });
    });
}

const addGameMeta = (gameId: string, gameMeta: GameMeta, isPublic: string) => {
    db.run('INSERT INTO GameMetas (GameId, JSONData) VALUES (?, ?)', [gameId, JSON.stringify(gameMeta)], (err) => {
        if (err) {
            console.log('Error persisting GameMeta', gameId)
        }

        gameMetas[gameId] = gameMeta;
        gameMeta.lastActivityAt = Date.now();

        if (isPublic === 'true') {
            gameMetasQueue.push(gameMetas[gameId]);
        }
    });
    
}

const removeGameMeta = (gameId: string, publicQueueOnly: boolean = false) => {
    if(!publicQueueOnly){
        delete gameMetas[gameId];
        Object.keys(playersInGame).forEach((playerId: any) => {
            if(playersInGame[playerId] === gameId){
                delete playersInGame[playerId];
            }
        })
        if(socketClients[gameId]){
            Object.keys(socketClients[gameId]).forEach((username: any) => {
                delete socketClients[gameId][username].inGame;
            })
        }
        db.run('DELETE FROM GameMetas WHERE GameId = ?', [gameId], (err) => {
            if(err){
                console.log('Error removing GameMeta', gameId);
            }
        });
    }
    for (let i = 0; i < gameMetasQueue.length; i++) {
        if (gameMetasQueue[i].id === gameId) {
            gameMetasQueue.splice(i, 1);
            break;
        }
    }
}

const updateSocketChairIndecies = (gameId: string) => {
    let gameMeta = gameMetas[gameId];
    if(gameMeta && socketClients[gameId]){
        Object.keys(socketClients[gameId]).forEach((username: string) => {
            for (let i = 0; i < gameMeta.playerStates.length; i++) {
                if (gameMeta.playerStates[i].username === username) {
                    socketClients[gameId][username].chairIndex = i;
                    break;
                }
            }
        })
    }
}

const recordActivity = (gameId: string) => {
    const gameMeta = gameMetas[gameId];
    if (gameMeta) {
        gameMeta.lastActivityAt = Date.now();
    }
};

//Initializes database conntection
const db = new sqlite3.Database(path.resolve(__dirname, 'db/death-card.db'), sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error(err);
        process.exit(1);
    } else {
        db.all('SELECT * FROM GameMetas', [], (err, results) => {
            if (err) {
                 console.log('Error loading persisted games from database', err);
                 return;
             }
             if(results && results.length > 0){
                (results as Array<{ GameId: string; JSONData: string }>).forEach(result => {
                    const JSONData = JSON.parse(result.JSONData);
                    if(JSONData.playerStates){
                        JSONData.playerStates.forEach((playerState: any, i: any) => {
                            playerState.connected = false; 
                            playersInGame[playerState.username] = result.GameId;
                            JSONData.playerStates[i] = Object.assign(new PlayerState(), playerState);
                        })
                    }
                    JSONData.state = Object.assign(new GameState(), JSONData.state);
                    const gameMetaData = Object.assign(new GameMeta(), JSONData);
                    if (gameMetaData.lastActivityAt < 0) {
                        gameMetaData.lastActivityAt = Date.now();
                    }
                    gameMetas[result.GameId] = gameMetaData;
                    if(gameMetaData.public && !gameMetaData.state.started){
                        gameMetasQueue.push(gameMetaData);
                    }
                });

             }
        });
    }
});

// const db: Connection = new mysql.createConnection({
//     host: 'deathcard-db-1.cz2g91ujk4gt.us-east-1.rds.amazonaws.com',
//     user: 'admin20220608',
//     password: 'QUNFU5WF5MNvIiig325W',
//     database: 'dbo'
// });

// Initializes express, session, and socket.io
const app = express();
const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: config.clientUrl,
        methods: ["GET", "POST"],
        credentials: true
    }
});

const sessionConfig: any = {
    secret: config.sessionSecret!,
    cookie: {}
}
if (app.get('env') === 'production') {
    app.set('trust proxy', 1) // trust first proxy
    if (sessionConfig.cookie) {
        sessionConfig.cookie.secure = true // serve secure cookies
    }
}
const sessionMiddleware = session(sessionConfig);

app.use(express.static(path.join(__dirname, './public')));

// Applys all middleware
app.use(sessionMiddleware);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer({}).any());
app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', config.clientUrl); // TODO, set this to be specific domains
    res.set('Access-Control-Allow-Credentials', 'true');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, authorization");
    res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,PUT,OPTIONS");

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});
app.use((req: any, res: any, next) => {
    if (apiWhitelist.indexOf(req.path) === -1 && !req.session.playerInfo) {
        res.status(401).send({ error: true, message: 'You are not logged in.' });
    } else {
        next();
    }
});
io.use((socket: any, next: any) => {
    sessionMiddleware(socket.request, {} as any, next);
});

// Used by the client to check if the session is still valid
app.get('/check-login', (req: any, res: any) => {
    if (req.session.playerInfo) {
        let username = req.session.playerInfo.username;

        if (playersInGame[username] && gameMetas[playersInGame[username]]) {
            req.session.playerInfo.inGame = playersInGame[username];
        } else {
            req.session.playerInfo.inGame = '';
            delete playersInGame[username];
        }

        res.send({ error: false, data: req.session.playerInfo });
    } else {
        res.send({ error: true, message: 'Session not valid' });
    }
});

// Used by the client to check if the username has already been taken
app.get('/delete-player-in-game', (req: any, res: any) => {
    delete playersInGame[req.query.username];
});

// Register new user - creates pending verification, sends email
app.post('/register', async (req: any, res: any) => {
    const { email, username, password, recaptchaResponse } = req.body;
    const ip = getClientIp(req);
    const captchaDisabled = process.env.DISABLE_CAPTCHA === 'true' || process.env.NODE_ENV !== 'production';

    if (!email || !username || !password) {
        return res.send({ error: true, message: 'Email, username, and password are required.' });
    }
    if (!validate('email', email)) {
        return res.send({ error: true, message: 'Please enter a valid email address.' });
    }
    if (!validate('username', username)) {
        return res.send({ error: true, message: 'Username must be at least 3 characters and can only contain numbers, letters, and these special characters: #?!@$%^&*-' });
    }
    if (!validate('password', password)) {
        return res.send({ error: true, message: 'Password must be at least 12 characters and contain at least one letter and one number.' });
    }

    if (!captchaDisabled) {
        if (!recaptchaResponse) {
            return res.send({ error: true, message: 'Please complete the captcha to register.' });
        }
        const captchaValid = await verifyRecaptcha(recaptchaResponse, ip);
        if (!captchaValid) {
            return res.send({ error: true, message: 'Captcha verification failed. Please try again.' });
        }
    }

    db.get('SELECT 1 FROM Users WHERE EmailAddress = ? COLLATE NOCASE', [email], (err: any, row: any) => {
        if (err) return res.send({ error: true, message: 'Error checking email.' });
        if (row) return res.send({ error: true, message: 'This email is already registered. Please log in or use a different email.' });

        db.get('SELECT 1 FROM Users WHERE UserName = ? COLLATE NOCASE', [username], (err2: any, row2: any) => {
            if (err2) return res.send({ error: true, message: 'Error checking username.' });
            if (row2) return res.send({ error: true, message: 'Username is not available. Please try a different username.' });

            db.get('SELECT 1 FROM VerificationTokens WHERE email = ? COLLATE NOCASE', [email], (err3: any, row3: any) => {
                if (err3) return res.send({ error: true, message: 'Error. Please try again.' });
                if (row3 && !process.env.SKIP_EMAIL_VERIFICATION) return res.send({ error: true, message: 'A verification email was already sent to this address. Please check your inbox or try again later.' });

                const salt = auth.generateSalt(10);
                const hash = auth.hash(password, salt);

                const skipVerification = process.env.SKIP_EMAIL_VERIFICATION === 'true';
                if (skipVerification) {
                    db.run('INSERT INTO Users (EmailAddress, UserName, Password, Salt) VALUES (?, ?, ?, ?)',
                        [email.toLowerCase(), username, hash.hashedpassword, hash.salt],
                        (err4: any) => {
                            if (err4) {
                                if (err4.message.indexOf('UNIQUE') !== -1) return res.send({ error: true, message: 'Email or username already registered.' });
                                return res.send({ error: true, message: 'Error creating account. Please try again.' });
                            }
                            res.send({ error: false, data: { message: 'Account created successfully!' } });
                        });
                    return;
                }

                auth.generateToken().then((token: string) => {
                    db.run('INSERT INTO VerificationTokens (email, username, password, salt, token, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
                        [email.toLowerCase(), username, hash.hashedpassword, hash.salt, token, Date.now()],
                        (err4: any) => {
                            if (err4) return res.send({ error: true, message: 'Error creating account. Please try again.' });
                            sendVerificationEmail(email, token).then(() => {
                                res.send({ error: false, data: { message: 'Registration successful! Please check your email for a verification link to activate your account.' } });
                            });
                        });
                }).catch(() => res.send({ error: true, message: 'Error generating verification token.' }));
            });
        });
    });
});

// Verify email - called by client when user clicks verification link
app.post('/verify-email', (req: any, res: any) => {
    const { token } = req.body;
    if (!token) return res.send({ error: true, message: 'Invalid verification link.' });

    db.get('SELECT * FROM VerificationTokens WHERE token = ?', [token], (err: any, row: any) => {
        if (err) return res.send({ error: true, message: 'Error verifying account.' });
        if (!row) return res.send({ error: true, message: 'Invalid or expired verification link. Please register again.' });
        if (Date.now() - row.createdAt > constants.verificationTokenExpires) {
            db.run('DELETE FROM VerificationTokens WHERE email = ?', [row.email]);
            return res.send({ error: true, message: 'Verification link has expired. Please register again.' });
        }

        db.run('INSERT INTO Users (EmailAddress, UserName, Password, Salt) VALUES (?, ?, ?, ?)',
            [row.email, row.username, row.password, row.salt],
            (err2: any) => {
                if (err2) {
                    if (err2.message.indexOf('UNIQUE') !== -1) {
                        return res.send({ error: true, message: 'This email or username is already registered. Please log in.' });
                    }
                    return res.send({ error: true, message: 'Error activating account. Please try again.' });
                }
                db.run('DELETE FROM VerificationTokens WHERE email = ?', [row.email]);
                res.send({ error: false, data: { message: 'Account verified successfully! You can now log in.' } });
            });
    });
});

app.get('/login-captcha-required', (req: any, res: any) => {
    const captchaDisabled = process.env.DISABLE_CAPTCHA === 'true' || process.env.NODE_ENV !== 'production';
    if (captchaDisabled) {
        return res.send({ error: false, data: { requiresCaptcha: false } });
    }
    const ip = getClientIp(req);
    res.send({ error: false, data: { requiresCaptcha: requiresCaptcha(ip) } });
});

app.get('/register-captcha-required', (req: any, res: any) => {
    const captchaDisabled = process.env.DISABLE_CAPTCHA === 'true' || process.env.NODE_ENV !== 'production';
    res.send({ error: false, data: { requiresCaptcha: !captchaDisabled } });
});

app.post('/login', async (req: any, res: any) => {
    const { email, password, recaptchaResponse } = req.body;
    const ip = getClientIp(req);
    const captchaDisabled = process.env.DISABLE_CAPTCHA === 'true' || process.env.NODE_ENV !== 'production';

    if (!email || !password) {
        return res.send({ error: true, message: 'Email and password are required.' });
    }

    if (!captchaDisabled && requiresCaptcha(ip)) {
        if (!recaptchaResponse) {
            return res.send({ error: true, message: 'Please complete the captcha to continue.', requiresCaptcha: true });
        }
        const captchaValid = await verifyRecaptcha(recaptchaResponse, ip);
        if (!captchaValid) {
            return res.send({ error: true, message: 'Captcha verification failed. Please try again.', requiresCaptcha: true });
        }
    }

    db.get('SELECT * FROM Users WHERE EmailAddress = ? COLLATE NOCASE', [email], (err: any, row: any) => {
        if (err) return res.send({ error: true, message: 'Error accessing account.' });
        if (!row) {
            recordFailedLogin(ip);
            const needsCaptcha = !captchaDisabled && requiresCaptcha(ip);
            return res.send({ error: true, message: 'No account found with this email. Please register first.', requiresCaptcha: needsCaptcha });
        }

        const match = auth.compare(password, { salt: row.Salt, hashedpassword: row.Password });
        if (!match) {
            recordFailedLogin(ip);
            const needsCaptcha = !captchaDisabled && requiresCaptcha(ip);
            return res.send({ error: true, message: 'Invalid password.', requiresCaptcha: needsCaptcha });
        }

        clearFailedLogin(ip);
        const username = row.UserName;
        req.session.playerInfo = new PlayerInfo(username, row.EmailAddress, playersInGame[username]);
        res.send({ error: false, data: req.session.playerInfo });
    });
})

// Used by the client to delete their session
app.get('/logout', (req: any, res: any) => {
    req.session = null;
    res.send({ error: false, message: 'Logged out successfully.' });
});

// Change username (requires not in a game)
app.post('/change-username', (req: any, res: any) => {
    const { newUsername } = req.body;
    const username = req.session.playerInfo.username;
    const email = req.session.playerInfo.email;

    if (!newUsername || typeof newUsername !== 'string') {
        return res.send({ error: true, message: 'New username is required.' });
    }
    if (!validate('username', newUsername)) {
        return res.send({ error: true, message: 'Username must be at least 3 characters and can only contain numbers, letters, and these special characters: #?!@$%^&*-' });
    }
    if (playersInGame[username]) {
        return res.send({ error: true, message: 'Leave your current game before changing your username.' });
    }

    db.get('SELECT 1 FROM Users WHERE UserName = ? COLLATE NOCASE AND UserName != ? COLLATE NOCASE', [newUsername, username], (err: any, row: any) => {
        if (err) return res.send({ error: true, message: 'Error checking username.' });
        if (row) return res.send({ error: true, message: 'Username is not available. Please try a different username.' });

        db.run('UPDATE Users SET UserName = ? WHERE EmailAddress = ?', [newUsername, email], (err2: any) => {
            if (err2) return res.send({ error: true, message: 'Error updating username. Please try again.' });
            req.session.playerInfo = new PlayerInfo(newUsername, email, '');
            res.send({ error: false, data: req.session.playerInfo });
        });
    });
});

// Used by the client to see if a game is able to be joined
app.post('/is-game-joinable', (req: any, res: any) => {
    if (req.body.gameId) {
        let joinError = isGameUnjoinable(req.body.gameId, req.body.passphrase);
        if (!joinError) {
            res.send({ error: false, data: { joinable: true } });
        } else {
            res.send({ error: false, data: { joinable: false, message: joinError } });
        }
    } else {
        res.send({ error: true, message: 'Game id not provided.' });
    }
});

// Used by the client to create a new game
app.post('/create-game', (req: any, res: any) => {
    let username = req.session.playerInfo.username;

    if (req.body.gameId) {
        if (!gameMetas[req.body.gameId]) {
            if (!playersInGame[username] || !gameMetas[playersInGame[username]]) {
                addGameMeta(req.body.gameId, new GameMeta(req.body.gameId, new PlayerState(req.session.playerInfo.username, true), req.body.public === 'true', req.body.passphrase), req.body.public);

                res.send({ error: false, message: 'Game created successfully.' });
            } else {
                res.send({ error: true, message: 'Your account is already playing a game. Please leave any connected games before creating a new one.' });
            }
        } else {
            res.send({ error: true, message: 'Game with that id already exists.' });
        }
    } else {
        res.send({ error: true, message: 'Game id not provided.' });
    }
});

app.get('/public-games', (req: any, res: any) => {
    const page = req.query.page ? parseInt(req.query.page) : 0;

    res.send({ error: false, data: gameMetasQueue.slice(page * itemsPerPage, (page + 1) * itemsPerPage).map((gameMeta) => { return { name: gameMeta.id, players: gameMeta.playerStates.length, ready: gameMeta.playerStates.filter((playerState) => { playerState.ready }).length } }) });
});

app.get('/leave-game', (req: any, res: any) => {
    const gameId = req.session.playerInfo.inGame;
    const username = req.session.playerInfo.username;
    const gameMeta = gameMetas[gameId];

    if (gameMeta) {
        if (gameMeta.playerStates.length === 1) {
            removeGameMeta(gameId);

            io.of('/').in(gameId).disconnectSockets(true);
        } else {
            removePlayerFromGame(gameId, username);
        }
    }

    delete req.session.playerInfo.inGame;
    delete playersInGame[username];
    if (socketClients[gameId]) {
        delete socketClients[gameId][username];
        if (Object.keys(socketClients[gameId]).length === 0) {
            delete socketClients[gameId];
        }
    }

    io.to(gameId).emit('players', gameMeta.playerStates);

    res.send({ error: false, message: 'Game left successfully.' });
})

// Initializes express app on the specified port
const apiServer = app.listen(config.apiPort, () => {
    console.log(`Example app listening on port ${config.apiPort}`);
});

// Initializes socket.io server
httpServer.listen(config.ioPort);

// Graceful shutdown on SIGTERM/SIGINT
function shutdown(signal: string) {
    if (serverShuttingDown) return;
    serverShuttingDown = true;
    const delayMs = constants.shutdownDelayMs;

    io.emit('server-restarting', { secondsRemaining: Math.ceil(delayMs / 1000) });

    let secondsLeft = Math.ceil(delayMs / 1000);
    const countdownInterval = setInterval(() => {
        secondsLeft -= 10;
        if (secondsLeft > 0) {
            io.emit('server-restarting', { secondsRemaining: secondsLeft });
        }
    }, 10000);

    setTimeout(() => {
        clearInterval(countdownInterval);
        httpServer.close(() => {
            apiServer.close(() => {
                process.exit(0);
            });
        });
    }, delayMs);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handles socket connections
io.on('connection', (socket: any) => {
    if (serverShuttingDown) {
        socket.emit('error', 'Server is restarting. Please try again in a moment.');
        socket.disconnect(true);
        return;
    }

    let joinError;

    let gameId: string = socket.handshake.query.gameId;
    let passphrase: string = socket.handshake.query.passphrase;
    let playerInfo: PlayerInfo = socket.request.session.playerInfo;
    let username: string = playerInfo ? playerInfo.username : '';
    let gameMeta: GameMeta = gameMetas[gameId];

    if (!playerInfo || !username) {
        socket.emit('error', 'You are not signed in. Please log in and try again.');
    } else {
        let playerStatus = getPlayerFromGame(gameId, username);
        if (!playerStatus) {
            joinError = isGameUnjoinable(gameId, passphrase);
        }

        if (!joinError && playersInGame[username] && gameMetas[playersInGame[username]] && playersInGame[username] !== gameId) {
            joinError = 'Your account is currently playing a different game. Please leave any other games before attempting to connect to this one.';
        }

        if (!joinError && gameMeta && gameMeta.kickedPlayers.indexOf(username) !== -1) {
            joinError = 'You have been kicked from this game!';
        }

        if (joinError) {
            socket.emit('error', joinError);
        } else {
            if(playerStatus && playerStatus.connected && socketClients[gameId] && socketClients[gameId][username] && socketClients[gameId][username].disconnect) {
                socketClients[gameId][username].disconnect();
            }

            playerConnected(gameId, username);
            recordActivity(gameId);

            socket.gameId = gameId;
            socket.gameMeta = gameMeta;
            socket.username = username;
            socket.playerStatus = playerStatus || getPlayerFromGame(gameId, username);
            for (let i = 0; i < gameMeta.playerStates.length; i++) {
                if (gameMeta.playerStates[i].username === username) {
                    socket.chairIndex = i;
                    break;
                }
            }

            socket.join(gameId);
            socketClients[gameId] = socketClients[gameId] || {};
            socketClients[gameId][username] = socket;

            sendRestrictedState(gameId);
            socket.emit('messages', gameMeta.messages);
            io.to(gameId).emit('players', gameMeta.playerStates);

            socket.on('message', (msg: any) => {
                recordActivity(socket.gameId);
                let authoredMessage = socket.username + ': ' + msg;
                socket.gameMeta.messages.push(authoredMessage);
                io.to(socket.gameId).emit('message', authoredMessage);
            });

            socket.on('set-color', (colorIndex: number) => {
                recordActivity(socket.gameId);
                socket.playerStatus.setColor(colorIndex);

                io.to(socket.gameId).emit('players', socket.gameMeta.playerStates);
            });

            socket.on('set-ready', (status: boolean) => {
                recordActivity(socket.gameId);
                socket.playerStatus.ready = status;

                io.to(socket.gameId).emit('players', socket.gameMeta.playerStates);
            });

            socket.on('leave', () => {
                recordActivity(socket.gameId);
                if (socket.gameMeta && socket.playerStatus) {
                    if (socket.gameMeta.playerStates.length === 1) {
                        removeGameMeta(socket.gameId);

                        io.of('/').in(socket.gameId).disconnectSockets(true);
                    } else {
                        removePlayerFromGame(socket.gameId, socket.username);
                    }
                }

                delete socket.request.session.playerInfo.inGame;
                delete playersInGame[socket.username];
                if (socketClients[socket.gameId]) {
                    delete socketClients[socket.gameId][socket.username];
                    if (Object.keys(socketClients[socket.gameId]).length === 0) {
                        delete socketClients[socket.gameId];
                    }
                }

                io.to(gameId).emit('players', socket.gameMeta.playerStates);

                if (socket) {
                    socket.disconnect();
                }
            });

            socket.on('begin-request', () => {
                recordActivity(socket.gameId);
                if (socket.playerStatus && socket.playerStatus.host && socket.gameMeta && !socket.gameMeta.state.started && socket.gameMeta.startable()) {
                    socket.gameMeta.state.started = true;
                    socket.gameMeta.state.actionHistory.push('New game started!');
                    socket.gameMeta.state.actionHistory.push('Round 1');
                    socket.gameMeta.state.initialize(socket.gameMeta.playerStates);

                    removeGameMeta(socket.gameId, true);

                    sendRestrictedState(socket.gameId);
                }
            });

            socket.on('submit', (params: any) => {
                recordActivity(socket.gameId);
                if (socket.gameMeta && socket.chairIndex !== undefined) {
                    const state = socket.gameMeta.state;

                    if (isActionValid(state, socket.chairIndex, ACTION_SUBMIT, params)) {
                        state.actionHistory.push(`${state.chairs[socket.chairIndex].username} has submitted their response`);
                        
                        const chair = state.chairs[socket.chairIndex];

                        const newCards: any = [];

                        chair.cardsSubmitted = params.cardsSubmitted;

                        chair.cards.forEach((card: any) => {
                            if(chair.cardsSubmitted.filter((cardSubmitted: any) => cardSubmitted.text === card.text).length === 0){
                                newCards.push(card);
                            }
                        });

                        chair.cards = newCards;

                        chair.submitted = true;

                        state.latestAction = ACTION_SUBMIT;

                        let allSubmitted = true;
                        state.chairs.forEach((chair: Chair, chairIndex: number) => {
                            if(chairIndex !== state.currentTurn && !chair.submitted){
                                allSubmitted = false;
                            }
                        })
                        
                        if(allSubmitted){
                            state.submitAnswers();
                        }

                        sendRestrictedState(socket.gameId);
                    }
                }
            });

            socket.on('skip', (params: any) => {
                recordActivity(socket.gameId);
                if (socket.gameMeta && socket.chairIndex !== undefined) {
                    const state = socket.gameMeta.state;

                    if (isActionValid(state, socket.chairIndex, ACTION_SKIP, params)) {
                        state.latestAction = ACTION_SKIP;

                        state.newPrompt();

                        sendRestrictedState(socket.gameId);
                    }

                }
            })

            socket.on('select', (params: any) => {
                recordActivity(socket.gameId);
                if (socket.gameMeta && socket.chairIndex !== undefined) {
                    const state = socket.gameMeta.state;

                    if (isActionValid(state, socket.chairIndex, ACTION_SELECT, params)) {
                        state.latestAction = ACTION_SELECT;

                        state.answersSubmitted.forEach((answer: any) => {
                            if(answer.chairIndex === params.chairIndex){
                                answer.selected = true;
                            }
                        })
                        state.chairs[params.chairIndex].points++;
                        state.actionHistory.push(`${state.chairs[socket.chairIndex].username} has picked ${state.chairs[params.chairIndex].username}'s response! They now have ${state.chairs[params.chairIndex].points} points`);
                        state.delay = true;

                        setTimeout(() => {
                            state.delay = false;
                            if(state.chairs[params.chairIndex].points === pointsToWin){
                                state.winner = state.chairs[params.chairIndex].username;
                                state.actionHistory.push(`${state.chairs[params.chairIndex].username} has won the game!`);
                            }

                            state.resetRoundVariables();
                            state.incrementTurn();

                            sendRestrictedState(socket.gameId);
                        }, roundDelay);

                        sendRestrictedState(socket.gameId);
                    }
                }
            });

            socket.on('kick-request', (kickedUser: string) => {
                recordActivity(socket.gameId);
                if (socket.playerStatus && socket.playerStatus.host) {
                    socket.gameMeta.kickedPlayers.push(kickedUser);

                    removePlayerFromGame(socket.gameId, kickedUser);

                    if (socketClients[socket.gameId][kickedUser]) {
                        socketClients[socket.gameId][kickedUser].emit('kick');
                        setTimeout(() => {
                            if (socketClients[socket.gameId][kickedUser]) {
                                socketClients[socket.gameId][kickedUser].disconnect();
                                delete socketClients[socket.gameId][kickedUser];
                                if (Object.keys(socketClients[socket.gameId]).length === 0) {
                                    delete socketClients[socket.gameId];
                                }
                            }
                        }, 50);
                    }

                    delete playersInGame[kickedUser];

                    io.to(socket.gameId).emit('players', socket.gameMeta.playerStates);
                }
            });

            socket.on('back-to-lobby', () => {
                recordActivity(socket.gameId);
                if (socket.playerStatus && socket.playerStatus.host) {
                    socket.gameMeta.reset();

                    io.to(socket.gameId).emit('players', socket.gameMeta.playerStates);
                    sendRestrictedState(socket.gameId);
                }
            });

            socket.on('restart', () => {
                recordActivity(socket.gameId);
                if (socket.playerStatus && socket.playerStatus.host) {
                    socket.gameMeta.state.resetGameVariables();
                    socket.gameMeta.state.initialize(socket.gameMeta.playerStates);
                    socket.gameMeta.state.started = true;

                    sendRestrictedState(socket.gameId);
                }
            });

            socket.on('disconnect', () => {
                playerDisconnected(socket.gameId, socket.username);

                if(socketClients[socket.gameId]){
                    delete socketClients[socket.gameId][socket.username];
                    if (Object.keys(socketClients[socket.gameId]).length === 0) {
                        delete socketClients[socket.gameId];
                    }
                }

                io.to(socket.gameId).emit('players', socket.gameMeta.playerStates);
            });
        }
    }
});

//Routine cleanup of password reset database
setInterval(() => {
    //db.query('SELECT EmailAddress, UpdateDateTime FROM Resets', (err, rows) => {
    db.all('SELECT email, date FROM Resets', (err, rows) => {
        if (err || !rows) {
            return console.log('Error cleaning up password reset database', err);
        }

        (rows as Array<{ date: number; email: string }>).forEach((row) => {
            if (Date.now() - row.date > constants.resetExpires) {
                db.run('DELETE FROM Resets WHERE email = ?', [row.email], (err: any) => {
                    if (err) return console.log('Error removing expired record from password reset database', err);
                });
            }
        });
    });

    db.all('SELECT email, createdAt FROM VerificationTokens', [], (err, rows) => {
        if (!err && rows) {
            (rows as Array<{ createdAt: number; email: string }>).forEach((row) => {
                if (Date.now() - row.createdAt > constants.verificationTokenExpires) {
                    db.run('DELETE FROM VerificationTokens WHERE email = ?', [row.email]);
                }
            });
        }
    });

    Object.keys(gameMetas).forEach((gameId: string) => {
        const gameMeta = gameMetas[gameId];
        const allDisconnected = gameMeta.playerStates.every((playerState: PlayerState) => !playerState.connected);
        const noRecentActivity = gameMeta.lastActivityAt > 0 &&
            (Date.now() - gameMeta.lastActivityAt) > constants.inactiveActionTimeout;
        const inactive = allDisconnected || noRecentActivity;

        if (inactive) {
            if (gameMeta.inactiveSince > 0) {
                if (Date.now() - gameMeta.inactiveSince > constants.removeAfter) {
                    removeGameMeta(gameId);
                }
            } else {
                gameMeta.inactiveSince = Date.now();
            }
        } else {
            gameMeta.inactiveSince = -1;
        }
    });
}, constants.cleanupInterval);
