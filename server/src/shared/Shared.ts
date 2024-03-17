const roundDelay = 2500;
const shortRoundDelay = 500;

export const minPlayers = 3;
export const maxPlayers = 8;
export const itemsPerPage = 5;
export const numberOfCards = 50;
export const pointsToWin = 5;
export const PHASE_SUBMITTING = 0;
export const PHASE_SELECTING = 1;
export const ACTION_SUBMIT = 0;
export const ACTION_SELECT = 1;

const validationRE: any = {
  'email': /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
  'password': /^(?=.*?[a-z])(?=.*?[0-9])([#?!@$%^&*-]|[a-z]|[A-Z]|[0-9]){12,}$/,
  'username': /^([#?!@$%^&*-]|[a-z]|[A-Z]|[0-9]){3,}$/
};

export function validate (fieldName: string, fieldValue: string) {
  //TODO re-enforce validation for passwords
  if(fieldName === 'password') return true;

  const re = validationRE[fieldName];
  if(re && fieldValue){
    return re.test(fieldValue.toLowerCase());
  }
  return false;
}

export class PlayerInfo {
  username: string;
  email: string;
  inGame: string;

  constructor(username: string, email: string, inGame: string = '') {
    this.username = username;
    this.email = email;
    this.inGame = inGame;
  }
}

export class PlayerState {
  connected: boolean = false;
  ready: boolean = false;
  username: string;
  host: boolean;

  constructor(username?: string, host?: boolean, connected: boolean = false) {
    this.username = username || '';
    this.host = host || false;
    this.connected = connected;
  }
}
export class Card {
  text: string;
  x: number = 0;
  y: number = 0;

  constructor(text: string, x?: number, y?: number){
    this.text = text;
    if(x){
      this.x = x;
    }
    if(y){
      this.y = y;
    }
  }
}

export class Chair {
  username: string;
  cards?: Array<Card> = [];
  cardsSubmitted?: Array<Card> = [];
  submitted: boolean = false;
  points: number = 0;

  constructor(username: string){
    this.username = username;

    for(let i = 0; i < numberOfCards; i++){
      this.cards?.push(new Card('foobar'));
    }
  }
}

export class GameState {
  chairs: any = [];

  pointsToWin: number = pointsToWin;

  phase: number = PHASE_SUBMITTING;
  started: boolean =  false;
  delay: boolean = false;
  winner: string = '';
  latestAction: number = ACTION_SUBMIT;
  actionHistory: Array<string> = [];

  currentTurn: number = 0;
  round: number = 1;

  initialize(players: Array<PlayerState>){
    players.forEach((player) => {
      this.chairs.push(new Chair(player.username));
    });
  }

  getRestrictedState(username: string) {
    let restrictedState: GameState = JSON.parse(JSON.stringify(this));

    restrictedState.chairs.forEach((chair: Chair) => {
      if(chair.username !== username){
        delete chair.cards
      }
    });

    return restrictedState;
  }

  resetGameVariables() {
    this.chairs = [];
    this.started = false;
    this.delay = false;
    this.winner = '';
    this.actionHistory = [];

    this.currentTurn = 0;
    this.round = 0;

    this.resetRoundVariables();
  }

  resetRoundVariables() {
    this.phase = PHASE_SUBMITTING;

    this.chairs.forEach((chair: Chair) => {
      chair.submitted = false;
      chair.cardsSubmitted = [];
      /* TODO add more cards to replace ones lost, remove ones lost */
    })
  }

  incrementTurn(){
    this.currentTurn++;
    if(this.currentTurn >= this.chairs.length){
        this.currentTurn = 0;
    }
  }
}

export class GameMeta {
  id: string;
  messages: Array<string> = [];
  public: boolean;
  passphrase: string;
  playerStates: Array<PlayerState> = [];
  inactiveSince: Number = -1;
  kickedPlayers: Array<string> = [];
  state: GameState = new GameState();

  constructor(id?: string, admin?: PlayerState, isPublic?: boolean, passphrase?: string) {
    if(admin){
      this.playerStates.push(admin);
    }
    this.id = id || '';
    this.public = isPublic || false;
    this.passphrase = passphrase || '';
  }

  joinable() {
    if(this.state.started) {
      return 'Game already started';
    }

    if(this.playerStates.length >= maxPlayers) {
      return 'Game is full';
    }
  }

  startable() {
    if(this.playerStates.length >= minPlayers){
      let ready = 0;
      for(let i = 0; i < this.playerStates.length; i++){
        if(this.playerStates[i].ready){
          ready++;

          if(ready === minPlayers){
            return true;
          }
        }
      }
    }

    return false;
  }

  reset() {
    this.playerStates.forEach((playerState) => {
      playerState.ready = false;
    });

    this.state.resetGameVariables();
  }
}

export function isActionValid(state: GameState, chairIndex: number, action: number, params: any){
  if(state.delay || state.winner) {
    return false;
  }

  const chair = state.chairs[chairIndex];

  //Validations for bid action
  if(action === ACTION_SUBMIT){
    if(state.phase !== PHASE_SUBMITTING) {
      return false;
    }

    if(chairIndex === state.currentTurn){
      return false;
    }

    // TODO add real checks here 

  } else if(action === ACTION_SELECT) { //Validations for select action
    if(state.phase !== PHASE_SELECTING){
      return false;
    }

    if(chairIndex !== state.currentTurn){
      return false;
    }

    // TODO Add real checks here
  }

  return true;
}