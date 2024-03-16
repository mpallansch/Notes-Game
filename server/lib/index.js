"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var express_session_1 = __importDefault(require("express-session"));
var body_parser_1 = __importDefault(require("body-parser"));
var multer_1 = __importDefault(require("multer"));
var sqlite3_1 = __importDefault(require("sqlite3"));
var path_1 = __importDefault(require("path"));
var nodemailer_1 = __importDefault(require("nodemailer"));
var http_1 = require("http");
var socket_io_1 = require("socket.io");
var auth_1 = __importDefault(require("./auth"));
var Config_1 = __importDefault(require("./constants/Config"));
var Constants_1 = __importDefault(require("./constants/Constants"));
var Shared_1 = require("./shared/Shared");
// Defines global variables
var apiWhitelist = ['/login', '/register', '/check-login', '/forgot-password', '/reset-password', '/check-username-availability']; //API calls that aren't protected by session authentication
var socketClients = {};
var gameMetas = {};
var playersInGame = {};
var gameMetasQueue = [];
// Defines global functions
var isGameUnjoinable = function (id, passphrase) {
    if (!gameMetas[id]) {
        return 'Game does not exist';
    }
    var joinError = gameMetas[id].joinable();
    if (joinError) {
        return joinError;
    }
    if (!gameMetas[id].public && gameMetas[id].passphrase !== passphrase) {
        return 'Game is private, and password is incorrect';
    }
};
var getPlayerFromGame = function (gameId, username) {
    var gameMeta = gameMetas[gameId];
    if (gameMeta) {
        for (var i = 0; i < gameMeta.playerStates.length; i++) {
            if (gameMeta.playerStates[i].username === username) {
                return gameMeta.playerStates[i];
            }
        }
    }
};
var removePlayerFromGame = function (gameId, username) {
    var gameMeta = gameMetas[gameId];
    if (gameMeta) {
        for (var i = 0; i < gameMeta.playerStates.length; i++) {
            var playerState = gameMeta.playerStates[i];
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
var playerConnected = function (gameId, username) {
    var gameMeta = gameMetas[gameId];
    if (gameMeta) {
        var playerState = getPlayerFromGame(gameId, username);
        if (!playerState) {
            gameMeta.playerStates.push(new Shared_1.PlayerState(username, false, true));
            if (gameMeta.joinable()) {
                for (var i = 0; i < gameMetasQueue.length; i++) {
                    if (gameMetasQueue[i].id === gameId) {
                        gameMetasQueue.splice(i, 1);
                        break;
                    }
                }
            }
        }
        else {
            playerState.connected = true;
        }
        playersInGame[username] = gameId;
    }
    else {
        console.log('Attemted to connect to a game that doesn\'t exist');
    }
};
var playerDisconnected = function (gameId, username) {
    var playerState = getPlayerFromGame(gameId, username);
    if (playerState) {
        playerState.connected = false;
    }
};
var sendResetEmail = function (email, token) {
    var transporter = nodemailer_1.default.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            type: 'OAuth2',
            user: Config_1.default.emailFrom,
            clientId: Config_1.default.emailClientId,
            clientSecret: Config_1.default.emailClientSecret,
            refreshToken: Config_1.default.emailRefreshToken,
            accessToken: Config_1.default.emailAccessToken
        }
    });
    var mail = {
        from: Config_1.default.emailFrom,
        to: email,
        subject: Config_1.default.name + " Password reset link",
        html: "Here is your password reset link for " + Config_1.default.name + ". If you did not request this, please ignore. <a href=\"" + Config_1.default.clientUrl + Config_1.default.resetPasswordPath + "/" + email + "/" + token + "\">Reset Password</a>"
    };
    transporter.sendMail(mail, function (err, info) {
        if (err) {
            console.log('Error sending email', err);
        }
        transporter.close();
    });
};
// Initializes database conntection
var db = new sqlite3_1.default.Database(path_1.default.resolve(__dirname, 'db/death-card.db'), sqlite3_1.default.OPEN_READWRITE | sqlite3_1.default.OPEN_CREATE, function (err) {
    if (err) {
        console.error(err);
        process.exit(1);
    }
});
// Initializes express, session, and socket.io
var app = express_1.default();
var httpServer = http_1.createServer();
var io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});
var sessionConfig = {
    secret: Config_1.default.sessionSecret,
    cookie: {}
};
if (app.get('env') === 'production') {
    app.set('trust proxy', 1); // trust first proxy
    if (sessionConfig.cookie) {
        sessionConfig.cookie.secure = true; // serve secure cookies
    }
}
var sessionMiddleware = express_session_1.default(sessionConfig);
// Applys all middleware
app.use(sessionMiddleware);
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use(multer_1.default({}).any());
app.use(function (req, res, next) {
    res.set('Access-Control-Allow-Origin', 'http://localhost:3000'); // TODO, set this to be specific domains
    res.set('Access-Control-Allow-Credentials', 'true');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, authorization");
    res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,PUT,OPTIONS");
    next();
});
app.use(function (req, res, next) {
    if (apiWhitelist.indexOf(req.path) === -1 && !req.session.playerInfo) {
        res.status(401).send({ error: true, message: 'You are not logged in.' });
    }
    else {
        next();
    }
});
io.use(function (socket, next) {
    sessionMiddleware(socket.request, {}, next);
});
// Used by the client to check if the session is still valid
app.get('/check-login', function (req, res) {
    if (req.session.playerInfo) {
        var username = req.session.playerInfo.username;
        if (playersInGame[username] && gameMetas[playersInGame[username]]) {
            req.session.playerInfo.inGame = playersInGame[username];
        }
        else {
            req.session.playerInfo.inGame = '';
            delete playersInGame[username];
        }
        res.send({ error: false, data: req.session.playerInfo });
    }
    else {
        res.send({ error: true, message: 'Session not valid' });
    }
});
// Used by the client to check if the username has already been taken
app.get('/check-username-availability', function (req, res) {
    db.get('SELECT EXISTS(SELECT 1 FROM Users WHERE username = ?)', [req.query.username], function (err, dbRes) {
        if (err) {
            res.send({ error: true, message: 'Error connecting to database' });
            return;
        }
        if (dbRes['EXISTS(SELECT 1 FROM Users WHERE username = ?)'] === 1) {
            res.send({ error: false, data: 'unavailable' });
        }
        else {
            res.send({ error: false, data: 'available' });
        }
    });
});
// Used by the client to register a new user
app.post('/register', function (req, res) {
    if (!req.body.email || !req.body.username || !req.body.password) {
        res.send({ error: true, message: 'Email, username, or password not provided.' });
        return;
    }
    if (!Shared_1.validate('email', req.body.email)) {
        res.send({ error: true, message: 'Email address not valid' });
        return;
    }
    if (!Shared_1.validate('username', req.body.username)) {
        res.send({ error: true, message: 'Username must be at least 3 characters and can only contain numbers, letters, and these special characters: #?!@$%^&*-' });
        return;
    }
    if (!Shared_1.validate('password', req.body.password)) {
        res.send({ error: true, message: 'Password must be at least 12 characters, contain at least one letter and one number, and can only contain numbers, letters, and these special characters: #?!@$%^&*-' });
        return;
    }
    var salt = auth_1.default.generateSalt(10);
    var hash = auth_1.default.hash(req.body.password, salt);
    db.run('INSERT INTO Users(email, username, hashedpassword, salt) VALUES(?, ?, ?, ?)', [req.body.email, req.body.username, hash.hashedpassword, salt], function (err) {
        if (err) {
            if (err.message.indexOf('UNIQUE constraint failed: Users.username') !== -1) {
                res.send({ error: true, message: 'Username is not available. Please try again with a different username.' });
            }
            else if (err.message.indexOf('UNIQUE constraint failed: Users.email') !== -1) {
                res.send({ error: true, message: 'Email address is already registered to an account. Please try again with a different email, or use the forgot password button to regain access to your account.' });
            }
            else {
                res.send({ error: true, message: 'Error adding new user.' });
            }
        }
        else {
            req.session.playerInfo = new Shared_1.PlayerInfo(req.body.username, req.body.email);
            res.send({ error: false, data: req.session.playerInfo });
        }
    });
});
// Used by the client to login with username and password
app.post('/login', function (req, res) {
    if (!req.body.email) {
        res.send({ error: true, message: 'Email not provided.' });
        return;
    }
    db.get('SELECT * FROM Users WHERE email = ?', [req.body.email], function (err, row) {
        if (err) {
            res.send({ error: true, message: 'Error accessing database.' });
        }
        else {
            if (!row) {
                res.send({ error: true, message: 'No user found with the provided email.' });
            }
            else {
                var match = auth_1.default.compare(req.body.password, { salt: row.salt, hashedpassword: row.hashedpassword });
                if (match) {
                    req.session.playerInfo = new Shared_1.PlayerInfo(row.username, row.email, playersInGame[row.username]);
                    res.send({ error: false, data: req.session.playerInfo });
                }
                else {
                    res.send({ error: true, message: 'Invalid password.' });
                }
            }
        }
    });
});
// Used by the client to delete their session
app.get('/logout', function (req, res) {
    req.session.destroy();
    res.send({ error: false, message: 'Logged out successfully.' });
});
// Used by the client to reset password
app.get('/forgot-password', function (req, res) {
    if (req.query.email) {
        db.get('SELECT EXISTS(SELECT 1 FROM Users WHERE email = ?)', [req.query.email], function (err, dbRes) {
            if (!err && dbRes['EXISTS(SELECT 1 FROM Users WHERE email = ?)'] === 1) {
                auth_1.default.generateToken().then(function (token) {
                    db.run('INSERT INTO Resets (email, token, date) VALUES (?, ?, ?)', [req.query.email, token, Date.now()], function (err) {
                        if (err) {
                            db.run('UPDATE Resets SET token = ?, date = ? WHERE email = ?', [token, Date.now(), req.query.email], function () {
                                sendResetEmail(req.query.email, token);
                            });
                        }
                        else {
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
app.post('/reset-password', function (req, res) {
    if (req.body.email && req.body.token && req.body.password) {
        db.get('SELECT * FROM Resets WHERE email = ?', [req.body.email], function (err, row) {
            if (err) {
                return res.send({ error: true, message: 'Error accessing database.' });
            }
            if (!row || req.body.token !== row.token) {
                return res.send({ error: true, message: 'Password reset expired.' });
            }
            //If token is valid, delete record whether successful or not
            db.run('DELETE FROM Resets WHERE email = ?', [req.body.email], function () {
            });
            if (Date.now() - row.date > Constants_1.default.resetExpires) {
                res.send({ error: true, message: 'Password reset expired' });
            }
            else {
                var salt = auth_1.default.generateSalt(10);
                var hash = auth_1.default.hash(req.body.password, salt);
                db.run('UPDATE Users SET hashedpassword = ?, salt = ? WHERE email = ?', [hash.hashedpassword, salt, req.body.email], function (err) {
                    if (err) {
                        res.send({ error: true, message: 'Error resetting password. Please contact support.' });
                    }
                    else {
                        res.send({ error: false, message: 'Password reset successfully!' });
                    }
                });
            }
        });
    }
    else {
        res.send({ error: true, message: 'Email link not valid.' });
    }
});
// Used by the client to see if a game is able to be joined
app.post('/is-game-joinable', function (req, res) {
    if (req.body.gameId) {
        var joinError = isGameUnjoinable(req.body.gameId, req.body.passphrase);
        if (!joinError) {
            res.send({ error: false, data: { joinable: true } });
        }
        else {
            res.send({ error: false, data: { joinable: false, message: joinError } });
        }
    }
    else {
        res.send({ error: true, message: 'Game id not provided.' });
    }
});
// Used by the client to create a new game
app.post('/create-game', function (req, res) {
    var username = req.session.playerInfo.username;
    if (req.body.gameId) {
        if (!gameMetas[req.body.gameId]) {
            if (!playersInGame[username] || !gameMetas[playersInGame[username]]) {
                gameMetas[req.body.gameId] = new Shared_1.GameMeta(req.body.gameId, new Shared_1.PlayerState(req.session.playerInfo.username, true), req.body.public === 'true', req.body.passphrase);
                if (req.body.public === 'true') {
                    gameMetasQueue.push(gameMetas[req.body.gameId]);
                }
                res.send({ error: false, message: 'Game created successfully.' });
            }
            else {
                res.send({ error: true, message: 'Your account is already playing a game. Please leave any connected games before creating a new one.' });
            }
        }
        else {
            res.send({ error: true, message: 'Game with that id already exists.' });
        }
    }
    else {
        res.send({ error: true, message: 'Game id not provided.' });
    }
});
app.get('/public-games', function (req, res) {
    var page = req.query.page ? parseInt(req.query.page) : 0;
    res.send({ error: false, data: gameMetasQueue.slice(page * Shared_1.itemsPerPage, (page + 1) * Shared_1.itemsPerPage).map(function (gameMeta) { return gameMeta.id; }) });
});
// Initializes express app on the specified port
app.listen(Config_1.default.apiPort, function () {
    console.log("Example app listening on port " + Config_1.default.apiPort);
});
// Initializes socket.io server
httpServer.listen(Config_1.default.ioPort);
// Handles socket connections
io.on('connection', function (socket) {
    var joinError;
    var gameId = socket.handshake.query.gameId;
    var passphrase = socket.handshake.query.passphrase;
    var playerInfo = socket.request.session.playerInfo;
    var username = playerInfo ? playerInfo.username : '';
    var gameMeta = gameMetas[gameId];
    if (!playerInfo || !username) {
        socket.emit('error', 'You are not signed in. Please log in and try again.');
    }
    else {
        var playerStatus = getPlayerFromGame(gameId, username);
        if (!playerStatus) {
            joinError = isGameUnjoinable(gameId, passphrase);
        }
        else if (playerStatus.connected) {
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
        }
        else {
            playerConnected(gameId, username);
            socket.gameId = gameId;
            socket.gameMeta = gameMeta;
            socket.username = username;
            socket.playerStatus = playerStatus || getPlayerFromGame(gameId, username);
            for (var i = 0; i < gameMeta.playerStates.length; i++) {
                if (gameMeta.playerStates[i].username === username) {
                    socket.chairIndex = i;
                    break;
                }
            }
            socket.join(gameId);
            socketClients[username] = socket;
            socket.emit('state', gameMeta.state);
            socket.emit('messages', gameMeta.messages);
            io.to(gameId).emit('players', gameMeta.playerStates);
            socket.on('message', function (msg) {
                var authoredMessage = socket.username + ': ' + msg;
                socket.gameMeta.messages.push(authoredMessage);
                io.to(socket.gameId).emit('message', authoredMessage);
            });
            socket.on('set-ready', function (status) {
                socket.playerStatus.ready = status;
                io.to(socket.gameId).emit('players', socket.gameMeta.playerStates);
            });
            socket.on('leave', function () {
                if (socket.gameMeta && socket.playerStatus) {
                    if (socket.gameMeta.playerStates.length === 1) {
                        delete gameMetas[socket.gameId];
                        for (var i = 0; i < gameMetasQueue.length; i++) {
                            if (gameMetasQueue[i].id === socket.gameId) {
                                gameMetasQueue.splice(i, 1);
                                break;
                            }
                        }
                        io.of('/').in(socket.gameId).disconnectSockets(true);
                    }
                    else {
                        removePlayerFromGame(socket.gameId, socket.username);
                    }
                }
                delete socket.request.session.playerInfo.inGame;
                delete playersInGame[socket.username];
                delete socketClients[socket.username];
                io.to(socket.gameId).emit('players', socket.gameMeta.playerStates);
                socket.disconnect();
            });
            socket.on('begin-request', function () {
                if (socket.playerStatus && socket.playerStatus.host && socket.gameMeta && !socket.gameMeta.state.started && socket.gameMeta.startable()) {
                    socket.gameMeta.state.started = true;
                    socket.gameMeta.state.initialize(socket.gameMeta.playerStates);
                    for (var i = 0; i < gameMetasQueue.length; i++) {
                        if (gameMetasQueue[i].id === socket.gameId) {
                            gameMetasQueue.splice(i, 1);
                            break;
                        }
                    }
                    gameMetasQueue.slice(gameMetasQueue.indexOf(socket.gameId), 1);
                    io.to(socket.gameId).emit('state', socket.gameMeta.state);
                }
            });
            socket.on('select', function (params) {
                if (socket.gameMeta && socket.chairIndex !== undefined) {
                    var state = socket.gameMeta.state;
                    if (Shared_1.isActionValid(state, socket.chairIndex, Shared_1.ACTION_SELECT, params)) {
                        state.chairs[socket.chairIndex].cards[params.cardIndex].selected = true;
                        state.numSelected++;
                        state.incrementTurn();
                        io.to(socket.gameId).emit('state', state);
                    }
                }
            });
            socket.on('bid', function (params) {
                if (socket.gameMeta && socket.chairIndex !== undefined) {
                    var state_1 = socket.gameMeta.state;
                    if (Shared_1.isActionValid(state_1, socket.chairIndex, Shared_1.ACTION_BID, params)) {
                        if (state_1.phase !== Shared_1.PHASE_BIDDING) {
                            state_1.phase = Shared_1.PHASE_BIDDING;
                        }
                        if (params.value === 'pass') {
                            state_1.chairs[socket.chairIndex].passed = true;
                        }
                        else {
                            state_1.bid = params.value;
                            state_1.highestBidderIndex = socket.chairIndex;
                        }
                        if (state_1.bid === state_1.numSelected || state_1.chairs.filter(function (chair) { return (!chair.out && !chair.passed); }).length === 1) {
                            state_1.phase = Shared_1.PHASE_REVEALING;
                            state_1.currentTurn = state_1.highestBidderIndex;
                            state_1.chairs[state_1.currentTurn].cards.forEach(function (card) {
                                if (card.selected) {
                                    state_1.revealCard(state_1.currentTurn, state_1.currentTurn, card, function () { io.to(socket.gameId).emit('state', state_1); });
                                }
                            });
                        }
                        else {
                            state_1.incrementTurn();
                            io.to(socket.gameId).emit('state', state_1);
                        }
                    }
                }
            });
            socket.on('reveal', function (params) {
                if (socket.gameMeta && socket.chairIndex !== undefined) {
                    var state_2 = socket.gameMeta.state;
                    if (Shared_1.isActionValid(state_2, socket.chairIndex, Shared_1.ACTION_REVEAL, params)) {
                        var card = state_2.chairs[params.opponentChairIndex].cards[params.cardIndex];
                        state_2.revealCard(socket.chairIndex, params.opponentChairIndex, card, function () { io.to(socket.gameId).emit('state', state_2); });
                        io.to(socket.gameId).emit('state', state_2);
                    }
                }
            });
            socket.on('kick-request', function (kickedUser) {
                if (socket.playerStatus && socket.playerStatus.host) {
                    socket.gameMeta.kickedPlayers.push(kickedUser);
                    removePlayerFromGame(socket.gameId, kickedUser);
                    if (socketClients[kickedUser]) {
                        socketClients[kickedUser].emit('kick');
                        setTimeout(function () {
                            if (socketClients[kickedUser]) {
                                socketClients[kickedUser].disconnect();
                                delete socketClients[kickedUser];
                            }
                        }, 50);
                    }
                    delete playersInGame[kickedUser];
                    io.to(socket.gameId).emit('players', socket.gameMeta.playerStates);
                }
            });
            socket.on('back-to-lobby', function () {
                if (socket.playerStatus && socket.playerStatus.host) {
                    socket.gameMeta.reset();
                    io.to(socket.gameId).emit('players', socket.gameMeta.playerStates);
                    io.to(socket.gameId).emit('state', socket.gameMeta.state);
                }
            });
            socket.on('restart', function () {
                if (socket.playerStatus && socket.playerStatus.host) {
                    socket.gameMeta.state.resetGameVariables();
                    socket.gameMeta.state.initialize(socket.gameMeta.playerStates);
                    socket.gameMeta.state.started = true;
                    io.to(socket.gameId).emit('state', socket.gameMeta.state);
                }
            });
            socket.on('disconnect', function () {
                playerDisconnected(socket.gameId, socket.username);
                delete socketClients[socket.username];
                io.to(socket.gameId).emit('players', socket.gameMeta.playerStates);
            });
        }
    }
});
//Routine cleanup of password reset database
setInterval(function () {
    db.all('SELECT email, date FROM Resets', function (err, rows) {
        if (err || !rows) {
            return console.log('Error cleaning up password reset database', err);
        }
        rows.forEach(function (row) {
            if (Date.now() - row.date > Constants_1.default.resetExpires) {
                db.run('DELETE FROM Resets WHERE email = ?', [row.email], function (err) {
                    if (err) {
                        return console.log('Error removing expired record from password reset database', err);
                    }
                });
            }
        });
    });
}, Constants_1.default.cleanupInterval);
