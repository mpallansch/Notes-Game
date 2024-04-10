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
import { PlayerInfo, PlayerState, GameMeta, Chair, itemsPerPage, isActionValid, pointsToWin, roundDelay, ACTION_SUBMIT, ACTION_SKIP, ACTION_SELECT, GameState } from './shared/Shared';
import e from 'express';
//import { Connection, MysqlError } from 'mysql';

//let mysql = require('mysql');

// Defines global variables
const apiWhitelist = ['/login', '/check-login']; //API calls that aren't protected by session authentication
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
    if(gameMeta){
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
app.get('/delete-player-in-game', (req: any, res: any) => {
    delete playersInGame[req.query.username];
});

app.post('/login', (req: any, res: any) => {
    req.session.playerInfo = new PlayerInfo(req.body.username, 'Guest', playersInGame[req.body.username]);
    res.send({ error: false, data: req.session.playerInfo });
})

// Used by the client to delete their session
app.get('/logout', (req: any, res: any) => {
    req.session = null;
    res.send({ error: false, message: 'Logged out successfully.' });
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
