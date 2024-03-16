import fetch from "node-fetch";
import { io } from "socket.io-client";
import { ACTION_PICK_TURN } from "./shared/Shared.js";

// @ts-ignore
import { PlayerState, GameState, PHASE_SELECTING, PHASE_BIDDING, PHASE_REVEALING, ACTION_SELECT, ACTION_BID, ACTION_REVEAL, isActionValid } from "./shared/Shared.ts";

const apiRoot: string = 'http://localhost:3001/';
const socketRoot: string = 'http://localhost:3002/';
let gameName: string;
let shouldHost: boolean = true;

class AI {
    host: boolean = false;
    username: string = '';
    cookie: string = '';
    socket: any = undefined;
    chairIndex: number = -1;
    error: any;

    constructor(index: number, callback: { (): void; (): void; }, error: any) {
        this.error = error;
        this.host = index === 0;

        const instance = this;
        const formData = {
            'email': `foo${index + 2}@test.com`,
            'password': 'something123'
        };

        fetch( apiRoot + 'login', {
            method: 'POST',
            body: JSON.stringify(formData),
            headers: {
                'Content-Type': 'application/json'
            }
        } )
        .then( ( res: any ) => {
            instance.cookie = res.headers.get('set-cookie')!;  // Non-NULL assertion
            res.json().then((objRes: any) => {
                instance.username = objRes.data.username;

                if(instance.host && shouldHost){

                    const formGameData = {
                        'gameId': gameName,
                        'public': 'true'
                    };
    
                    fetch(apiRoot + 'create-game', {
                        method: 'POST',
                        body: JSON.stringify(formGameData),
                        headers: {
                            cookie: instance.cookie,
                            'Content-Type': 'application/json'
                        }
                    })
                    .then( ( res: any ) => res.json())
                    .then( ( res: any) => {
                        if( !res.error || res.message === 'Game with that id already exists.') {
                            callback()
                        } else  {
                            console.log(res.message);
                        }
                    });
                } else {
                    callback();
                }
            }, () => {
                console.log('Error parsing JSON response from server');
            });
        })
    }

    join() {
        const instance = this;
        this.socket = io(`${socketRoot}?gameId=${gameName}`, { 
            transportOptions: { 
                polling: { 
                    extraHeaders: { 
                        'Cookie': this.cookie 
                    } 
                } 
            } 
        });

        this.socket.on('disconnect', () => {
            console.log('socket disconnected');
        });

        this.socket.on('connect', () => {
            if(this.host && shouldHost) {
                this.socket.on('players', (players: Array<PlayerState>) => {
                    if(players.length === numPlayers) {
                        let allReady = true;

                        players.forEach((player) => {
                            if(!player.ready){
                                allReady = false;
                            }
                        });

                        if(allReady){
                            instance.socket.emit('begin-request');
                        }
                    }
                });
            }

            this.socket.emit('set-ready', true);

            this.socket.on('error', (err: any) => {
                if(err === 'You are not signed in. Please log in and try again.'){
                    this.error();
                } else {  
                    console.log(err);
                }
            });

            this.socket.on('state', (state: GameState) => {
                if(instance.chairIndex === -1){
                    for(let i = 0; i < state.chairs.length; i++){
                        if(state.chairs[i].username === instance.username){
                            instance.chairIndex = i;
                            break;
                        }
                    }
                }

                if(!state.winner && !state.delay && state.started && state.currentTurn === instance.chairIndex){
                    let potentialActions: any = [];

                    if(state.phase === PHASE_SELECTING){
                        for(let i = 0; i < state.chairs[instance.chairIndex].cards.length; i++){
                            if(isActionValid(state, instance.chairIndex, ACTION_SELECT, {cardIndex: i})) {
                                potentialActions.push({name: 'select', params: {cardIndex: i}});
                            }
                        }

                        if(state.totalTurns >= state.chairs.length){
                            for(let i = (state.bid + 1); i < state.numSelected; i++){
                                if(isActionValid(state, instance.chairIndex, ACTION_BID, {value: i})) {
                                    potentialActions.push({name: 'bid', params: {value: i}});
                                }
                            }

                            if(isActionValid(state, instance.chairIndex, ACTION_BID, {value: 'pass'})) {
                                potentialActions.push({name: 'bid', params: {value: 'pass'}});
                            }
                        }
                    } else if(state.phase === PHASE_BIDDING) {
                        for(let i = (state.bid + 1); i < state.numSelected; i++){
                            if(isActionValid(state, instance.chairIndex, ACTION_BID, {value: i})) {
                                potentialActions.push({name: 'bid', params: {value: i}});
                            }
                        }

                        if(isActionValid(state, instance.chairIndex, ACTION_BID, {value: 'pass'})) {
                            potentialActions.push({name: 'bid', params: {value: 'pass'}});
                        }
                    } else if(state.phase === PHASE_REVEALING) {
                        for(let i = 0; i < state.chairs.length; i++) {
                            if(i !== instance.chairIndex) {
                                if(!state.pickingTurn){
                                    for(let j = 0; j < state.chairs[i].cards.length; j++){
                                        if(isActionValid(state, instance.chairIndex, ACTION_REVEAL, {opponentChairIndex: i, cardIndex: j})){
                                            potentialActions.push({name: 'reveal', params: {opponentChairIndex: i, cardIndex: j}});
                                        }
                                    }
                                } else if(isActionValid(state, instance.chairIndex, ACTION_PICK_TURN, {chairIndex: i})) {
                                    potentialActions.push({name: 'pick-turn', params: {chairIndex: i}})
                                }
                            }
                        }
                    }

                    if(potentialActions.length > 0) {
                        let action = potentialActions[Math.round(Math.random() * (potentialActions.length - 1))];
                        setTimeout(() => {
                            instance.socket.emit(action.name, action.params);
                        }, 500);
                    } else {
                        console.log('No valid turns');
                    }
                }
            });
        });
    }
}

if(process.argv.length < 4) {
    console.log('Invalid number of parameters. Usage "ts-node index [numPlayers] [numBots] [gameName (optional)] [shouldBotHost (optional)]');
    process.exit();
}

const numPlayers = parseInt(process.argv[2]);
const numBots = parseInt(process.argv[3]);

if(isNaN(numPlayers)){
    console.log('numPlayers is not a number');
}

if(isNaN(numBots)){
    console.log('numBots is not a number');
    process.exit();
}

if(process.argv.length >= 5) {
    gameName = process.argv[4];
} else {
    gameName = 'test';
}

if(process.argv.length >= 6 && process.argv[5] === 'false'){
    shouldHost = false;
}

let botsInitialized: number = 0;
let bots : any[] = [];

const init = () => {
    if(bots.length > 0){
        for(let i = 0; i < numBots; i++) {
            if(bots[i].socket){
                bots[i].socket.disconnect();
            }
            delete bots[i];
        }
    }

    botsInitialized = 0;
    bots = [];

    for(let i = 0; i < numBots; i++) {
        bots.push(new AI(i, () => {
            botsInitialized++;
    
            if(botsInitialized === numBots){
                for(let i = 0; i < numBots; i++) {
                    bots[i].join();
                }
            }
        }, init));
    }
};

init();