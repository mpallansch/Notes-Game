import { io } from "socket.io-client";

import {
  PlayerState,
  GameState,
  PHASE_SUBMITTING,
  PHASE_SELECTING,
  ACTION_SUBMIT,
  ACTION_SKIP,
  ACTION_SELECT,
  isActionValid,
} from "./shared/Shared";

import { pickCardsToSubmit, pickBestAnswer } from "./aiLogic";

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

  constructor(index: number, callback: () => void, error: () => void) {
    this.error = error;
    this.host = index === 0;

    // Emails match setup.ts: foo@test.com, foo2@test.com, ... for indices 0, 1, 2, ...
    const email = index === 0 ? 'foo@test.com' : `foo${index + 1}@test.com`;
    const password = 'something123';

    const instance = this;
    const formData = { email, password };

    fetch(apiRoot + 'login', {
      method: 'POST',
      body: JSON.stringify(formData),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((res: any) => {
        const setCookies = res.headers.getSetCookie?.() || [];
        instance.cookie = setCookies.map((c: string) => c.split(';')[0].trim()).join('; ');
        return res.json();
      })
      .then((objRes: any) => {
        if (objRes.error) {
          console.log('Login error:', objRes.message);
          return;
        }
        instance.username = objRes.data.username;

        if (instance.host && shouldHost) {
          const formGameData = {
            gameId: gameName,
            public: 'true',
          };

          fetch(apiRoot + 'create-game', {
            method: 'POST',
            body: JSON.stringify(formGameData),
            headers: {
              cookie: instance.cookie,
              'Content-Type': 'application/json',
            },
          })
            .then((res: any) => res.json())
            .then((res: any) => {
              if (!res.error || res.message === 'Game with that id already exists.') {
                callback();
              } else {
                console.log(res.message);
              }
            });
        } else {
          callback();
        }
      })
      .catch(() => {
        console.log('Error during login');
      });
  }

  join() {
    const instance = this;
    const passphrase = 'public';
    this.socket = io(`${socketRoot}?gameId=${gameName}&passphrase=${passphrase}`, {
      withCredentials: true,
      transportOptions: {
        polling: {
          extraHeaders: {
            Cookie: this.cookie,
          },
        },
      },
    });

    this.socket.on('disconnect', () => {
      console.log('socket disconnected');
    });

    this.socket.on('connect', () => {
      if (this.host && shouldHost) {
        this.socket.on('players', (players: PlayerState[]) => {
          if (players.length === numPlayers) {
            const allReady = players.every((p) => p.ready);
            if (allReady) {
              instance.socket.emit('begin-request');
            }
          }
        });
      }

      this.socket.emit('set-ready', true);

      this.socket.on('error', (err: any) => {
        if (err === 'You are not signed in. Please log in and try again.') {
          this.error();
        } else {
          console.log(err);
        }
      });

      this.socket.on('state', (state: GameState) => {
        if (instance.chairIndex === -1) {
          for (let i = 0; i < state.chairs.length; i++) {
            if (state.chairs[i].username === instance.username) {
              instance.chairIndex = i;
              break;
            }
          }
        }

        const actions: { name: string; params: any }[] = [];

        if (!state.winner && !state.delay && state.started && state.currentTurn === instance.chairIndex) {
          if (state.phase === PHASE_SUBMITTING) {
            // AI is the judge (current turn) - can skip if no one has submitted yet
            const anyoneSubmitted = state.chairs.some(
              (chair: any, idx: number) => idx !== state.currentTurn && chair.submitted
            );
            if (!anyoneSubmitted) {
              if (isActionValid(state, instance.chairIndex, ACTION_SKIP, {})) {
                actions.push({ name: 'skip', params: {} });
              }
            }
            // If we add skip, we might still want to wait - for now skip is optional
            // The judge typically waits for others, so we only add skip when no one has submitted
          } else if (state.phase === PHASE_SELECTING) {
            // AI is the judge - pick the best answer
            const chair = state.chairs[instance.chairIndex];
            if (chair && state.answersSubmitted && state.answersSubmitted.length > 0) {
              const bestChairIndex = pickBestAnswer(state.answersSubmitted, state.prompt);
              if (bestChairIndex >= 0 && isActionValid(state, instance.chairIndex, ACTION_SELECT, { chairIndex: bestChairIndex })) {
                actions.push({ name: 'select', params: { chairIndex: bestChairIndex } });
              }
            }
          }
        }

        // When AI is NOT the judge (submitting phase) - add submit action
        if (!state.winner && !state.delay && state.started && state.phase === PHASE_SUBMITTING && state.currentTurn !== instance.chairIndex) {
          const chair = state.chairs[instance.chairIndex];
          if (chair && chair.cards && !chair.submitted) {
            const cardsToSubmit = pickCardsToSubmit(chair.cards, state.prompt);
            if (cardsToSubmit.length > 0 && isActionValid(state, instance.chairIndex, ACTION_SUBMIT, { cardsSubmitted: cardsToSubmit })) {
              actions.push({ name: 'submit', params: { cardsSubmitted: cardsToSubmit } });
            }
          }
        }

        // Execute the best action (or first available)
        if (actions.length > 0) {
          const action = actions[0];
          setTimeout(() => {
            instance.socket.emit(action.name, action.params);
          }, 500 + Math.random() * 500);
        }
      });
    });
  }
}

if (process.argv.length < 4) {
  console.log('Invalid number of parameters. Usage "ts-node index [numPlayers] [numBots] [gameName (optional)] [shouldBotHost (optional)]"');
  process.exit(1);
}

const numPlayers = parseInt(process.argv[2]);
const numBots = parseInt(process.argv[3]);

if (isNaN(numPlayers)) {
  console.log('numPlayers is not a number');
  process.exit(1);
}

if (isNaN(numBots)) {
  console.log('numBots is not a number');
  process.exit(1);
}

if (process.argv.length >= 5) {
  gameName = process.argv[4];
} else {
  gameName = 'test';
}

if (process.argv.length >= 6 && process.argv[5] === 'false') {
  shouldHost = false;
}

let botsInitialized: number = 0;
let bots: AI[] = [];

const init = () => {
  if (bots.length > 0) {
    for (let i = 0; i < numBots; i++) {
      if (bots[i]?.socket) {
        bots[i].socket.disconnect();
      }
    }
  }

  botsInitialized = 0;
  bots = [];

  for (let i = 0; i < numBots; i++) {
    bots.push(
      new AI(
        i,
        () => {
          botsInitialized++;
          if (botsInitialized === numBots) {
            for (let i = 0; i < numBots; i++) {
              bots[i].join();
            }
          }
        },
        init
      )
    );
  }
};

init();
