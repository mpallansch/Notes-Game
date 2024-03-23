import express from 'express';
import session from 'cookie-session';
import bodyParser from 'body-parser';
import multer from 'multer';
import sqlite3 from 'sqlite3';
import path from 'path';
import nodemailer from 'nodemailer';
import * as https from 'https';
import { createServer } from 'http';
import { Server } from 'socket.io';

import auth from './auth';
import config from './constants/Config';
import constants from './constants/Constants';
import { PlayerInfo, PlayerState, GameMeta, Chair, Card, itemsPerPage, validate, isActionValid, ACTION_SUBMIT, ACTION_SELECT, PHASE_SUBMITTING, PHASE_SELECTING, GameState } from './shared/Shared';
import e from 'express';
//import { Connection, MysqlError } from 'mysql';

//let mysql = require('mysql');

// Defines global variables
const apiWhitelist = ['/login', '/register', '/check-login', '/forgot-password', '/reset-password', '/check-username-availability', '/play-as-guest']; //API calls that aren't protected by session authentication
let socketClients: any = {};
let gameMetas: any = {};
let playersInGame: any = {};
let gameMetasQueue: Array<GameMeta> = [];

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
            }
        }
    }
};

const playerConnected = (gameId: string, username: string) => {
    let gameMeta = gameMetas[gameId];
    if (gameMeta) {
        let playerState: PlayerState = getPlayerFromGame(gameId, username);

        if (!playerState) {
            gameMeta.playerStates.push(new PlayerState(username, false, true));

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

const sendResetEmail = (email: string, token: string) => {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            type: 'OAuth2',
            user: config.emailFrom,
            clientId: config.emailClientId,
            clientSecret: config.emailClientSecret,
            refreshToken: config.emailRefreshToken,
            accessToken: config.emailAccessToken
        }
    });

    const mail = {
        from: config.emailFrom,
        to: email,
        subject: `${config.name} Password reset link`,
        html: `Here is your password reset link for ${config.name}. If you did not request this, please ignore. <a href="${config.clientUrl}${config.resetPasswordPath}/${email}/${token}">Reset Password</a>`
    }

    transporter.sendMail(mail, function (err, info) {
        if (err) {
            console.log('Error sending email', err);
        }

        transporter.close();
    });
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

        if (isPublic === 'true') {
            gameMetasQueue.push(gameMetas[gameId]);
        }
    });
    
}

const removeGameMeta = (gameId: string, publicQueueOnly: boolean = false) => {
    if(!publicQueueOnly){
        delete gameMetas[gameId];
        Object.keys(playersInGame).forEach(playerId => {
            if(playersInGame[playerId] === gameId){
                delete playersInGame[playerId];
            }
        })
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
                results.forEach(result => {
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
app.get('/check-username-availability', (req: any, res: any) => {
    //db.query('SELECT COUNT(*) AS UserCount FROM Users WHERE UserName = ?', [req.query.username], (err, results, fields) => {
    db.get('SELECT COUNT(*) AS UserCount FROM Users WHERE UserName = ?', [req.query.username], (err, dbRes) => {
       if (err) {
            res.send({ error: true, message: 'Error connecting to database' });
            return;
        }

        //if (results['UserCount'] === 1) {
        if(dbRes['EXISTS(SELECT 1 FROM Users WHERE username = ?)'] === 1){
            res.send({ error: false, data: 'unavailable' });
        } else {
            res.send({ error: false, data: 'available' });
        }
    });
});

// Used by the client to register a new user
app.post('/register', (req: any, res: any) => {
    if (!req.body.email || !req.body.username || !req.body.password) {
        res.send({ error: true, message: 'Email, username, or password not provided.' });
        return;
    }

    if (!validate('email', req.body.email)) {
        res.send({ error: true, message: 'Email address not valid' });
        return;
    }

    if (!validate('username', req.body.username)) {
        res.send({ error: true, message: 'Username must be at least 3 characters and can only contain numbers, letters, and these special characters: #?!@$%^&*-' });
        return;
    }

    if (!validate('password', req.body.password)) {
        res.send({ error: true, message: 'Password must be at least 12 characters, contain at least one letter and one number, and can only contain numbers, letters, and these special characters: #?!@$%^&*-' });
        return;
    }

    const register = () => {
        const salt = auth.generateSalt(10);
        const hash: any = auth.hash(req.body.password, salt);

        //db.query('INSERT INTO Users(EmailAddress, UserName, Password, Salt) VALUES(?, ?, ?, ?)', [req.body.email, req.body.username, hash.hashedpassword, salt], (err) => {
        db.get('INSERT INTO Users(EmailAddress, UserName, Password, Salt) VALUES(?, ?, ?, ?)', [req.body.email, req.body.username, hash.hashedpassword, salt], (err, dbRes) => {
            if (err) {
                if (err.message.indexOf('UNIQUE constraint failed: Users.UserName') !== -1) {
                    res.send({ error: true, message: 'Username is not available. Please try again with a different username.' });
                } else if (err.message.indexOf('UNIQUE constraint failed: Users.EmailAddress') !== -1) {
                    res.send({ error: true, message: 'Email address is already registered to an account. Please try again with a different email, or use the forgot password button to regain access to your account.' });
                } else {
                    console.log( 'err', err );
                    res.send({ error: true, message: 'Error adding new user.' });
                }
            } else {
                req.session.playerInfo = new PlayerInfo(req.body.username, req.body.email);
                res.send({ error: false, data: req.session.playerInfo });
            }
        });
    }

    if(process.env.NODE_ENV === 'production'){
        const captchaPostData = new URLSearchParams({
            'secret': config.captchaSecretKey,
            'response': req.body['g-recaptcha-response']
        }).toString();

        const captchaRequest = https.request({
            hostname: 'www.google.com',
            port: 443,
            path: '/recaptcha/api/siteverify',
            method: 'POST',
            headers: {
                 'Content-Type': 'application/x-www-form-urlencoded',
                 'Content-Length': Buffer.byteLength(captchaPostData)
               }
          }, (captchaRes: any) => {
            if (captchaRes.statusCode < 200 || captchaRes.statusCode > 299) {
                res.send({ error: true, message: 'Could not process at this time. Try again.' });
                return;
            }
    
            const body: any[] = []
            captchaRes.on('data', (chunk: any) => body.push(chunk))
            captchaRes.on('end', () => {
                try {
                    const response = JSON.parse(Buffer.concat(body).toString())
                    if(response.success){
                        register();
                    } else {
                        res.send({ error: true, message: 'Could not process at this time. Try again.' });
                    }
                } catch (e) {
                    res.send({ error: true, message: 'Could not process at this time. Try again.' });
                }
            })
          });

        captchaRequest.on('error', (e) => {
            res.send({ error: true, message: 'Could not process at this time. Try again.' });
        });
        
        captchaRequest.write(captchaPostData);
        captchaRequest.end();
    } else {
        register();
    }
});

app.post('/play-as-guest', (req: any, res: any) => {
    req.session.playerInfo = new PlayerInfo(req.body.username, 'Guest');
    res.send({ error: false, data: req.session.playerInfo });
})

// Used by the client to login with username and password
app.post('/login', (req: any, res: any) => {
    if (!req.body.email) {
        res.send({ error: true, message: 'Email not provided.' });
        return;
    }

    const login = () => {
        //db.query('SELECT * FROM Users WHERE EmailAddress = ?', [req.body.email], (err, row) => {
        db.get('SELECT * FROM Users WHERE EmailAddress = ?', [req.body.email], (err, row) => {
            if (err) {
                res.send({ error: true, message: 'Error accessing database.' });
            } else {
                if (!row) {
                    res.send({ error: true, message: 'No user found with the provided email.' });
                } else {
                    let match = auth.compare(req.body.password, { salt: row.Salt, hashedpassword: row.Password });

                    if (match) {
                        req.session.playerInfo = new PlayerInfo(row.UserName, row.EmailAddress, playersInGame[row.UserName]);
                        res.send({ error: false, data: req.session.playerInfo });
                    } else {
                        res.send({ error: true, message: 'Invalid password.' });
                    }
                }
            }
        });
    }

    if(process.env.NODE_ENV === 'production'){
        const captchaPostData = new URLSearchParams({
            'secret': config.captchaSecretKey,
            'response': req.body['g-recaptcha-response']
        }).toString();

        const captchaRequest = https.request({
            hostname: 'www.google.com',
            port: 443,
            path: '/recaptcha/api/siteverify',
            method: 'POST',
            headers: {
                 'Content-Type': 'application/x-www-form-urlencoded',
                 'Content-Length': Buffer.byteLength(captchaPostData)
               }
          }, (captchaRes: any) => {
            if (captchaRes.statusCode < 200 || captchaRes.statusCode > 299) {
                res.send({ error: true, message: 'Could not process at this time. Try again.' });
                return;
            }
    
            const body: any[] = []
            captchaRes.on('data', (chunk: any) => body.push(chunk))
            captchaRes.on('end', () => {
                try {
                    const response = JSON.parse(Buffer.concat(body).toString())
                    if(response.success){
                        login();
                    } else {
                        res.send({ error: true, message: 'Could not process at this time. Try again.' });
                    }
                } catch (e) {
                    res.send({ error: true, message: 'Could not process at this time. Try again.' });
                }
            })
          });

        captchaRequest.on('error', (e) => {
            res.send({ error: true, message: 'Could not process at this time. Try again.' });
        });
        
        captchaRequest.write(captchaPostData);
        captchaRequest.end();
    } else {
        login();
    }
});

// Used by the client to delete their session
app.get('/logout', (req: any, res: any) => {
    req.session.destroy();
    res.send({ error: false, message: 'Logged out successfully.' });
});

// Used by the client to reset password
app.get('/forgot-password', (req: any, res: any) => {
    if (req.query.email) {
            // db.query('SELECT COUNT(*) AS UserCount FROM Users WHERE EMailAddress = ?', [req.query.email], (err, results, fields) => {
            //     if (!err && results['UserCount'] === 1) {
            db.get('SELECT EXISTS(SELECT 1 FROM Users WHERE email = ?)', [req.query.email], (err, dbRes) => {
            if(!err && dbRes['EXISTS(SELECT 1 FROM Users WHERE email = ?)'] === 1){
                auth.generateToken().then((token: string) => {
                    //db.query('INSERT INTO Resets (email, token, date) VALUES (?, ?, ?)', [req.query.email, token, Date.now()], (err, results, fields) => {
                    db.run('INSERT INTO Resets (email, token, date) VALUES (?, ?, ?)', [req.query.email, token, Date.now()], (err) => {
                        if (err) {
                            //db.query('UPDATE Resets SET token = ?, date = ? WHERE email = ?', [token, Date.now(), req.query.email], (err, results, fields) => {
                            db.run('UPDATE Resets SET token = ?, date = ? WHERE email = ?', [token, Date.now(), req.query.email], () => {
                                sendResetEmail(req.query.email, token);
                            });
                        } else {
                            sendResetEmail(req.query.email, token);
                        }
                    });
                });
            }
        });
    }
    res.send({ error: false, message: 'Request received successfully.' });
});

// Used by the client to reset password
app.post('/reset-password', (req: any, res: any) => {
    if (req.body.email && req.body.token && req.body.password) {
        //db.query('SELECT * FROM Resets WHERE email = ?', [req.body.email], (err, row) => {
        db.get('SELECT * FROM Resets WHERE email = ?', [req.body.email], (err, row) => {
            if (err) {
                return res.send({ error: true, message: 'Error accessing database.' });
            }

            if (!row || req.body.token !== row.token) {
                return res.send({ error: true, message: 'Password reset expired.' });
            }

            //If token is valid, delete record whether successful or not
            //db.query('DELETE FROM Resets WHERE email = ?', [req.body.email], () => {
            db.run('DELETE FROM Resets WHERE email = ?', [req.body.email], () => {

            });

            if (Date.now() - row.date > constants.resetExpires) {
                res.send({ error: true, message: 'Password reset expired' });
            } else {
                const salt = auth.generateSalt(10);
                const hash: any = auth.hash(req.body.password, salt);

                //db.query('UPDATE Users SET hashedpassword = ?, salt = ? WHERE email = ?', [hash.hashedpassword, salt, req.body.email], (err) => {
                db.run('UPDATE Users SET hashedpassword = ?, salt = ? WHERE email = ?', [hash.hashedpassword, salt, req.body.email], (err) => {
                        if (err) {
                        res.send({ error: true, message: 'Error resetting password. Please contact support.' });
                    } else {
                        res.send({ error: false, message: 'Password reset successfully!' });
                    }
                });
            }
        });
    } else {
        res.send({ error: true, message: 'Email link not valid.' });
    }
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

// Initializes express app on the specified port
app.listen(config.apiPort, () => {
    console.log(`Example app listening on port ${config.apiPort}`);
});

// Initializes socket.io server
httpServer.listen(config.ioPort);

// Handles socket connections
io.on('connection', (socket: any) => {
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
        } else if (playerStatus.connected) {
            joinError = 'Your account is already connected to this game. Please close any connections from other devices before attempting to connect with this device.';
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
            playerConnected(gameId, username);

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
                let authoredMessage = socket.username + ': ' + msg;
                socket.gameMeta.messages.push(authoredMessage);
                io.to(socket.gameId).emit('message', authoredMessage);
            });

            socket.on('set-ready', (status: boolean) => {
                socket.playerStatus.ready = status;

                io.to(socket.gameId).emit('players', socket.gameMeta.playerStates);
            });

            socket.on('leave', () => {
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
                if (socket.gameMeta && socket.chairIndex !== undefined) {
                    const state = socket.gameMeta.state;

                    if (isActionValid(state, socket.chairIndex, ACTION_SUBMIT, params)) {
                        state.actionHistory.push(`${state.chairs[socket.chairIndex].username} has submitted their response`);
                        
                        const chair = state.chairs[socket.chairIndex];

                        chair.cardsSubmitted = params.cardsSubmitted;
                        chair.submitted = true;

                        state.latestAction = ACTION_SUBMIT;

                        let allSubmitted = true;
                        state.chairs.forEach((chair: Chair, chairIndex: number) => {
                            if(chairIndex !== state.currentTurn && !chair.submitted){
                                allSubmitted = false;
                            }
                        })
                        
                        if(allSubmitted){
                            state.phase = PHASE_SELECTING;
                        }

                        sendRestrictedState(socket.gameId);
                    }
                }
            });

            socket.on('select', (params: any) => {
                if (socket.gameMeta && socket.chairIndex !== undefined) {
                    const state = socket.gameMeta.state;

                    if (isActionValid(state, socket.chairIndex, ACTION_SELECT, params)) {
                        state.latestAction = ACTION_SELECT;

                        state.chairs[params.chairIndex].points++;
                        state.actionHistory.push(`${state.chairs[socket.chairIndex].username} has picked ${state.chairs[params.chairIndex].username}'s response! They now have ${state.chairs[params.chairIndex].points} points`);
                        if(state.chairs[params.chairIndex].points === state.pointsToWin){
                            state.winner = state.chairs[params.chairIndex].username;
                            state.actionHistory.push(`${state.chairs[params.chairIndex].username} has won the game!`);
                        }

                        state.resetRoundVariables();
                        state.incrementTurn();

                        sendRestrictedState(socket.gameId);
                    }
                }
            });

            socket.on('kick-request', (kickedUser: string) => {
                if (socket.playerStatus && socket.playerStatus.host) {
                    socket.gameMeta.kickedPlayers.push(kickedUser);

                    removePlayerFromGame(socket.gameId, kickedUser);

                    if (socketClients[socket.gameId][kickedUser]) {
                        socketClients[socket.gameId][kickedUser].emit('kick');
                        setTimeout(() => {
                            if (socketClients[socket.gameId][kickedUser]) {
                                socketClients[socket.gameId][kickedUser].disconnect();
                                delete socketClients[socket.gameId][socket.username];
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
                if (socket.playerStatus && socket.playerStatus.host) {
                    socket.gameMeta.reset();

                    io.to(socket.gameId).emit('players', socket.gameMeta.playerStates);
                    sendRestrictedState(socket.gameId);
                }
            });

            socket.on('restart', () => {
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

        rows.forEach((row: { date: number; email: any; }) => {
            if (Date.now() - row.date > constants.resetExpires) {
                //db.query('DELETE FROM Resets WHERE EmailAddress = ?', [row.email], (err: any) => {
                db.run('DELETE FROM Resets WHERE email = ?', [row.email], (err: any) => {
                    if (err) {
                        return console.log('Error removing expired record from password reset database', err);
                    }
                });
            }
        });
    });

    Object.keys(gameMetas).forEach((gameId: string) => {
        let inactive = true;
        gameMetas[gameId].playerStates.forEach((playerState: PlayerState) => {
            if(playerState.connected){
                inactive = false;
            }
        })
        if(inactive){
            if(gameMetas[gameId].inactiveSince > 0){
                if(Date.now() - gameMetas[gameId].inactiveSince > constants.removeAfter){
                    removeGameMeta(gameId);
                }
            } else {
                gameMetas[gameId].inactiveSince = Date.now();
            }
        } else {
            gameMetas[gameId].inactiveSince = -1;
        }
    });
}, constants.cleanupInterval);
