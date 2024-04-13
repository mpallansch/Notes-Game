export const roundDelay = 5000;
export const minPlayers = 3;
export const itemsPerPage = 5;
export const pointsToWin = 5;
export const cardQuantities: any = {
  words: 40,
  punctuation: 5,
  modifiers: 5,
  filler: 15
}

export const PHASE_SUBMITTING = 0;
export const PHASE_SELECTING = 1;
export const ACTION_SUBMIT = 0;
export const ACTION_SKIP = 1;
export const ACTION_SELECT = 2;

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
  'Tell your date they look nothing like their Bumble photo',
  'Write a thesis statement for a PHD in feminism',
  'What do you learn on day one of airplane pilot training',
  'Explain the joys of gardening',
  'What\'s the most embarassing reason to go to the doctor?',
  'Explain to a child how giving birth works',
  'Tell someone you\'ve clogged their toilet during a party',
  'Ask a child in the airplane seat behind you to stop kicking',
  'Exlaim loudly that your pants are filled with ants',
  'Politely tell your kidnapper that you have to pee',
  'Write a media release describing the tragedy at your local amusement park',
  'As a teacher, tell a friend about your favorite student',
  'Write a horoscope for the current player whose turn it is',
  'Write an 11th commandment',
  'What was the creepiest part of Charlie and the Chocolate Factory?',
  'What happens in your favorite disney movie?',
  'Describe the final loyalty test you must pass to join a cult',
  'What got you a lifetime ban from Applebee\'s?',
  'What\'s the number one cause of divorce in America?',
  'Write an inspiration quote that a 19 year old white girl would get tattooed',
  'Explain why you got fired from your last job',
  'Explain to a cow why you have to kill them to make hamburgers',
  'What\'s the biggest lie you\'ve ever told?',
  'What\'s the worst part of camping?',
  'Write a jingle for a toupe\'e store',
  'What\'s that horrible smell?',
  'Warn someone there is a murderer hiding under the bed',
  'Write an argument for why dinosaurs are better than humans',
  'Describe the Olympics',
  'Draft an instruction manual for toilet paper',
  'Describe your current level of fitness to your new personal trainer',
  'Write the warning label for a new Viagra alternative',
  'Write an ad from the 1940\'s selling cigarettes to middle schoolers',
  'Tell your Tinder date that you have rabies',
  'Write an excuse for driving 125mph in a school zone'
];

const cards: any = {
  words: ['nibble','flesh','bomb','bare','area','challenge','swap','hundred','fish','wound','relish','weenie','hunt','woman','fantasy','boy','girl','grow','shrink','neck','egg','leak','jelly','scream','slide','tiny','grab','meat','gnarly','abscess','attempt','raw','drama','tough','mad','dump','disappear','elaborate','chaos','booty','please','crucial','human','scenario','wonderful','ceremony','crowd','chant','drug','bender','heavy','tongue','bamboozle','toast','alter','illness','rub','cheese','skin','gently','press','potato','brain','numerous','tissue','plop','surprise','cadaver','cherish','boob','saggy','insidious','hostile','friend','visit','crack','anguish','pause','struggle','moist','panties','anxiety','young','man','why','foot','enemy','suffer','hike','sexy','pantsuit','innards','small','poke','storm','face','saw','itch','absorb','jerk','creep','wink','unlikely','vegetable','high','damage','princess','pray','pop','float','question','inquiry','walk','smooth','surge','betrayal','behind','head','crisis','soul','like','fix','up','cure','also','rock','think','bitchy','whip','asset','argue','basic','doubt','work','kingdom','devil','money','bite','hurt','lucky','mind','test','shark','mushroom','party','cam','mat','blake','joe','moon','carl','mush','kelp','fly','torment','space','attain','despise','miss','amazing','night','arrest','juicy','crash','strategy','flap','jam','your','strive','keep','blow','eat','see','cry','baby','school','slight','prize','price','climb','pink','cruel','chocolate','daddy','commotion','rotten','alien','average','dangerous','crunch','thunder','flame','poop','UFO','wife','belief','her','shirt','seem','good','study','more','firm','genital','delight','wish','record','happy','ooze','pump','seduce','curious','stroke','filth','sack','yummy','dance','listen','finger','duck','day','nose','nail','animal','assassin','large','organic','murder','bag','travel','catch','ass','warrior','around','some','old','stink','shelter','crave','adventure','say','noise','darkness','cute','batter','attack','assault','terrify','love','bowel','anatomy','cake','amount','damp','hero','object','foul','bank','chocolates','squirt','evolve','excuse','burn','blunder','abuse','search','fester','laser','conflict','stomach','pad','wave','grate','hey','peel','hammer','apply','place','blame','plug','bone','big','TV'],
  punctuation: ['?','!','.',',','...','-',':','/'],
  modifiers: ['s','es','ed','ing','y','ly','er','est','un'],
  filler: [
    'a','an','the', //articles
    'I','I\'d','him','her','his','she','he','my','your','it','those','these','we','us','any', //pronouns
    'in','on','of','for','than','from','with','to','after','at', //prepositions
    'if','so','but','because', // conjunctions
    'then','now','not','already','yet','when','too','no', //adverbs
    'have','did','has','was','do','can','go' // verb
  ]
};

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

export function shuffleArray(array: any) {
  for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
  }
}

export function selectNewCards(chair: Chair){
  const additions: Card[] = [];
  Object.keys(cards).forEach((type) => {
    const cardsRemaining = cardQuantities[type] - (chair.cards?.filter((card: Card) => cards[type].indexOf(card.text) !== -1) || []).length;
    const cardsAvailable = cards[type].filter((cardWord: string) => (chair.cards?.filter((card: Card) => card.text === cardWord).length || 0) === 0);
    for(let i = 0; i < cardsRemaining; i++){
      const cardIndex = Math.round(Math.random() * (cardsAvailable.length - 1));
      additions.push(new Card(cardsAvailable[cardIndex]));
      cardsAvailable.splice(cardIndex, 1);
    }
  });

  shuffleArray(additions);

  chair.cards = chair.cards?.concat(additions);
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

export class Answer {
  selected: boolean = false;
  chairIndex: number;
  cardsSubmitted: Array<Card> = [];

  constructor(chairIndex: number, cardsSubmitted: any, selected: boolean){
    this.chairIndex = chairIndex;
    this.cardsSubmitted = cardsSubmitted;
    this.selected = selected;
  }
}

export class Chair {
  username: string;
  cards?: Array<Card> = [];
  cardsSubmitted?: Array<Card> = [];
  submitted: boolean = false;
  selected: boolean = false;
  points: number = 0;

  constructor(username: string){
    this.username = username;

    selectNewCards(this);
  }
}

export class GameState {
  chairs: any = [];

  phase: number = PHASE_SUBMITTING;
  started: boolean =  false;
  delay: boolean = false;
  prompt: string = '';
  winner: string = '';
  latestAction: number = ACTION_SUBMIT;
  promptHistory: Array<string> = [];
  actionHistory: Array<string> = [];
  answersSubmitted: Array<Answer> = [];

  currentTurn: number = 0;
  round: number = 1;

  initialize(players: Array<PlayerState>){
    players.forEach((player) => {
      this.chairs.push(new Chair(player.username));
    });

    this.prompt = prompts[Math.round(Math.random() * (prompts.length - 1))];
    this.promptHistory.push(this.prompt)
  }

  getRestrictedState(username: string) {
    const restrictedState: GameState = JSON.parse(JSON.stringify(this));

    restrictedState.chairs.forEach((chair: Chair, chairIndex: number) => {
      if(chair.username !== username){
        delete chair.cards;
        delete chair.cardsSubmitted;
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
    this.answersSubmitted = [];
    this.newPrompt()

    this.chairs.forEach((chair: Chair) => {
      chair.selected = false;
      chair.submitted = false;
      chair.cardsSubmitted = [];
      selectNewCards(chair);
    })
  }

  newPrompt(){
    let possiblePrompts = prompts.filter(prompt => this.promptHistory.indexOf(prompt) === -1);
    if(possiblePrompts.length === 0){
      possiblePrompts = prompts;
    }
    this.prompt = possiblePrompts[Math.round(Math.random() * (possiblePrompts.length - 1))];
    this.promptHistory.push(this.prompt)
  }

  incrementTurn(){
    this.currentTurn++;
    if(this.currentTurn >= this.chairs.length){
        this.currentTurn = 0;
    }
  }

  submitAnswers(){
    this.phase = PHASE_SELECTING;
    this.chairs.forEach((chair: Chair, chairIndex: number) => {
      if(chairIndex !== this.currentTurn){
        this.answersSubmitted.push(new Answer(chairIndex, chair.cardsSubmitted, chair.selected))
      }
    })
    shuffleArray(this.answersSubmitted);
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