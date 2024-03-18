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

const prompts = [
  'Describe a frightening medical condition',
  'Where\'s the weirdest place you\'ve put your finger?',
  'Make up a new holiday',
  'Share a little known remedy for the common cold',
  'Write a fortune cookie',
  'Describe what a hangover feels like',
  'Ask a restaurant host if their bathroom fan works',
  'Describe the inside of a Chuck E. Cheese',
  'Give a presentation about drugs to elementary school children',
  'Why is cocaine illegal',
  'Tell your date they look nothing like their Bubmble photo',
  'Write a thesis statement for a PHD in feminism',
  'What do you learn on day one of airplane pilot training',
  'Explain the joys of gardening',
  'What\'s the most embarassing reason to go to the doctor?',
  'Explain to a child how giving birth works',
  'Tell someone you\'ve clogged their toilet during a party',
  'Ask a child in the airplane seat behind you to stop kicking',
  'Exlaim loudly that your pants are filled with ants',
  'Politely tell your kidnapper that you have to pee',
  'Write a media release describing the tragedy at your local amusement park'
];

const cardWords = ['boy','grow','neck','egg','leak','jelly','scream','slide','tiny','grab','meat','in','gnarly','neck','abscess','attempt','raw','egg','drama','tough','mad','dump','disappear','have','did','not','elaborate','chaos','booty','please','crucial','human','scenario','wonderful','ceremony','crowd','chant','drug','bender','heavy','tongue','bamboozle','toast','alter','illness','rub','cheese','on','skin','gently','press','potato','to','brain','numerous','tissue',
'plop','surprise','cadaver','cherish','boob','now','for','it','not','yet','saggy','insidious','hostile','friend','visit','crack','anguish','pause','struggle','moist','panties','anxiety','did','dump','tough','disappear','young','man','why','foot','enemy','I','suffer','hike','was','not','sexy','pantsuit','innards','has','small','poke','storm','face','to','saw','itch','absorb','when'];

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

    const cardsAvailable = [...cardWords];
    for(let i = 0; i < numberOfCards; i++){
      const randomIndex = Math.round(Math.random() * (cardsAvailable.length - 1));
      this.cards?.push(new Card(cardsAvailable[randomIndex]));
      cardsAvailable.splice(randomIndex, 1);
    }
  }
}

export class GameState {
  chairs: any = [];

  pointsToWin: number = pointsToWin;

  phase: number = PHASE_SUBMITTING;
  started: boolean =  false;
  delay: boolean = false;
  prompt: string = '';
  winner: string = '';
  latestAction: number = ACTION_SUBMIT;
  promptHistory: Array<string> = [];
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
    this.promptHistory = [];
    this.actionHistory = [];

    this.currentTurn = 0;
    this.round = 0;

    this.resetRoundVariables();
  }

  resetRoundVariables() {
    this.phase = PHASE_SUBMITTING;
    const possiblePrompts = prompts.filter(prompt => this.promptHistory.indexOf(prompt) === -1);
    this.prompt = possiblePrompts[Math.round(Math.random() * (possiblePrompts.length - 1))];
    this.promptHistory.push(this.prompt)

    this.chairs.forEach((chair: Chair) => {
      chair.submitted = false;
      chair.cardsSubmitted = [];
      const cardsAvailable = cardWords.filter(cardWord => (chair.cards?.filter(card => card.text === cardWord).length || 0) > 0);
      for(let i = 0; i < numberOfCards - (chair.cards?.length || 0); i++){
        const cardIndex = Math.round(Math.random() * (cardsAvailable.length - 1));
        chair.cards?.push(new Card(cardWords[cardIndex]));
        cardsAvailable.splice(cardIndex, 1);
      }
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