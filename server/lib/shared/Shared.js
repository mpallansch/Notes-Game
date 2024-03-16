"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isActionValid = exports.GameMeta = exports.GameState = exports.Chair = exports.Card = exports.PlayerState = exports.PlayerInfo = exports.validate = exports.ACTION_REVEAL = exports.ACTION_BID = exports.ACTION_SELECT = exports.PHASE_REVEALING = exports.PHASE_BIDDING = exports.PHASE_SELECTING = exports.itemsPerPage = exports.maxPlayers = exports.minPlayers = void 0;
var roundDelay = 5000;
exports.minPlayers = 3;
exports.maxPlayers = 8;
exports.itemsPerPage = 5;
exports.PHASE_SELECTING = 0;
exports.PHASE_BIDDING = 1;
exports.PHASE_REVEALING = 2;
exports.ACTION_SELECT = 0;
exports.ACTION_BID = 1;
exports.ACTION_REVEAL = 2;
var validationRE = {
    'email': /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    'password': /^(?=.*?[a-z])(?=.*?[0-9])([#?!@$%^&*-]|[a-z]|[A-Z]|[0-9]){12,}$/,
    'username': /^([#?!@$%^&*-]|[a-z]|[A-Z]|[0-9]){3,}$/
};
function validate(fieldName, fieldValue) {
    var re = validationRE[fieldName];
    if (re && fieldValue) {
        return re.test(fieldValue.toLowerCase());
    }
    return false;
}
exports.validate = validate;
var PlayerInfo = /** @class */ (function () {
    function PlayerInfo(username, email, inGame) {
        if (inGame === void 0) { inGame = ''; }
        this.username = username;
        this.email = email;
        this.inGame = inGame;
    }
    return PlayerInfo;
}());
exports.PlayerInfo = PlayerInfo;
var PlayerState = /** @class */ (function () {
    function PlayerState(username, host, connected) {
        if (connected === void 0) { connected = false; }
        this.connected = false;
        this.ready = false;
        this.username = username;
        this.host = host;
        this.connected = connected;
    }
    return PlayerState;
}());
exports.PlayerState = PlayerState;
var Card = /** @class */ (function () {
    function Card(skull) {
        this.selected = false;
        this.revealed = false;
        this.lost = false;
        this.skull = skull;
    }
    return Card;
}());
exports.Card = Card;
var Chair = /** @class */ (function () {
    function Chair(username) {
        this.cards = [];
        this.out = false;
        this.passed = false;
        this.points = 0;
        this.username = username;
        var skullIndex = Math.round(Math.random() * 3);
        for (var i = 0; i < 4; i++) {
            this.cards.push(new Card(i === skullIndex));
        }
    }
    return Chair;
}());
exports.Chair = Chair;
var GameState = /** @class */ (function () {
    function GameState() {
        this.chairs = [];
        this.phase = exports.PHASE_SELECTING;
        this.started = false;
        this.delay = false;
        this.winner = '';
        this.bid = 0;
        this.highestBidderIndex = 0;
        this.numSelected = 0;
        this.numRevealed = 0;
        this.currentTurn = 0;
        this.totalTurns = 0;
        this.round = 1;
    }
    GameState.prototype.initialize = function (players) {
        var _this = this;
        players.forEach(function (player) {
            _this.chairs.push(new Chair(player.username));
        });
    };
    GameState.prototype.resetGameVariables = function () {
        this.chairs = [];
        this.started = false;
        this.delay = false;
        this.winner = '';
        this.currentTurn = 0;
        this.round = 0;
        this.resetRoundVariables();
    };
    GameState.prototype.resetRoundVariables = function () {
        this.phase = exports.PHASE_SELECTING;
        this.bid = 0;
        this.highestBidderIndex = 0;
        this.numSelected = 0;
        this.numRevealed = 0;
        this.totalTurns = 0;
        this.chairs.forEach(function (chair) {
            chair.passed = false;
            chair.cards.forEach(function (card) {
                card.selected = false;
                card.revealed = false;
            });
        });
    };
    GameState.prototype.newRound = function (pickerChairIndex, pickedChairIndex, skullRevealed, updateState) {
        var _this = this;
        this.delay = true;
        setTimeout(function () {
            _this.round++;
            _this.resetRoundVariables();
            if (skullRevealed) {
                var remainingCards = _this.chairs[pickerChairIndex].cards.filter(function (card) { return !card.lost; });
                remainingCards[Math.round(Math.random() * (remainingCards.length - 1))].lost = true;
                if (remainingCards.length === 1) {
                    _this.chairs[pickerChairIndex].out = true;
                }
                var remainingChairs = _this.chairs.filter(function (chair) { return !chair.out; });
                if (remainingChairs.length === 1) {
                    _this.winner = remainingChairs[0].username;
                }
                else if (pickerChairIndex === pickedChairIndex) {
                    var remainingChairIndicies = [];
                    for (var i = 0; i < _this.chairs.length; i++) {
                        if (!_this.chairs[i].out && i !== pickerChairIndex) {
                            remainingChairIndicies.push(i);
                        }
                    }
                    _this.currentTurn = remainingChairIndicies[Math.round(Math.random() * (remainingChairIndicies.length - 1))];
                }
                else {
                    _this.currentTurn = pickedChairIndex;
                }
            }
            else {
                _this.chairs[pickerChairIndex].points++;
                if (_this.chairs[pickerChairIndex].points === 2) {
                    _this.winner = _this.chairs[pickerChairIndex].username;
                }
                _this.currentTurn = pickerChairIndex;
            }
            _this.delay = false;
            updateState();
        }, roundDelay);
    };
    GameState.prototype.revealCard = function (pickerChairIndex, pickedChairIndex, card, updateState) {
        card.revealed = true;
        if (card.skull) {
            this.newRound(pickerChairIndex, pickedChairIndex, true, updateState);
        }
        else {
            this.numRevealed++;
            if (this.numRevealed === this.bid) {
                this.newRound(pickerChairIndex, pickedChairIndex, false, updateState);
            }
        }
        updateState();
    };
    GameState.prototype.incrementTurn = function () {
        this.totalTurns++;
        this.currentTurn++;
        if (this.currentTurn >= this.chairs.length) {
            this.currentTurn = 0;
        }
        if (this.chairs[this.currentTurn].out === true || (this.phase === exports.PHASE_BIDDING && this.chairs[this.currentTurn].passed)) {
            this.incrementTurn();
        }
    };
    return GameState;
}());
exports.GameState = GameState;
var GameMeta = /** @class */ (function () {
    function GameMeta(id, admin, isPublic, passphrase) {
        this.messages = [];
        this.playerStates = [];
        this.kickedPlayers = [];
        this.state = new GameState();
        this.playerStates.push(admin);
        this.id = id;
        this.public = isPublic;
        this.passphrase = passphrase;
    }
    GameMeta.prototype.joinable = function () {
        if (this.state.started) {
            return 'Game already started';
        }
        if (this.playerStates.length >= exports.maxPlayers) {
            return 'Game is full';
        }
    };
    GameMeta.prototype.startable = function () {
        if (this.playerStates.length >= exports.minPlayers) {
            var ready = 0;
            for (var i = 0; i < this.playerStates.length; i++) {
                if (this.playerStates[i].ready) {
                    ready++;
                    if (ready === exports.minPlayers) {
                        return true;
                    }
                }
            }
        }
        return false;
    };
    GameMeta.prototype.reset = function () {
        this.playerStates.forEach(function (playerState) {
            playerState.ready = false;
        });
        this.state.resetGameVariables();
    };
    return GameMeta;
}());
exports.GameMeta = GameMeta;
function isActionValid(state, chairIndex, action, params) {
    if (state.delay || state.winner) {
        return false;
    }
    //Check it is this players turn
    if (chairIndex !== state.currentTurn) {
        return false;
    }
    var chair = state.chairs[chairIndex];
    //Validations for select action
    if (action === exports.ACTION_SELECT) {
        if (state.phase !== exports.PHASE_SELECTING) {
            return false;
        }
        if (typeof params.cardIndex !== 'number' || params.cardIndex < 0 || params.cardIndex >= chair.cards.length) {
            return false;
        }
        if (chair.cards[params.cardIndex].selected || chair.cards[params.cardIndex].lost) {
            return false;
        }
    }
    else if (action === exports.ACTION_BID) { //Validations for bid action
        if (state.phase === exports.PHASE_REVEALING) {
            return false;
        }
        if (state.phase === exports.PHASE_SELECTING && state.totalTurns < state.chairs.length) {
            return false;
        }
        if (params.value !== 'pass' && (typeof params.value !== 'number' || params.value <= state.bid || params.value > state.numSelected)) {
            return false;
        }
        if (params.value === 'pass' && state.phase !== exports.PHASE_BIDDING) {
            return false;
        }
    }
    else if (action === exports.ACTION_REVEAL) { //Validations for reveal action
        if (state.phase !== exports.PHASE_REVEALING) {
            return false;
        }
        if (typeof params.opponentChairIndex !== 'number' || params.opponentChairIndex < 0 || params.opponentChairIndex >= state.chairs.length) {
            return false;
        }
        var opponentChair = state.chairs[params.opponentChairIndex];
        if (typeof params.cardIndex !== 'number' || params.cardIndex < 0 || params.cardIndex >= opponentChair.cards.length) {
            return false;
        }
        var card = opponentChair.cards[params.cardIndex];
        if (!card.selected || card.revealed || card.lost) {
            return false;
        }
    }
    return true;
}
exports.isActionValid = isActionValid;
