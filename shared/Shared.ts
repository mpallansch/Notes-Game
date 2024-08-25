export const roundDelay = 10000;
export const minPlayers = 3;
export const itemsPerPage = 5;
export const pointsToWin = 5;
export const cardQuantities: any = {
  words: 40,
  punctuation: 5,
  modifiers: 5,
  filler: 15
}

export const banditColors = ['black','gray','brown','pink','purple','lightblue','lightgreen'];

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
  'Write an excuse for driving 125mph in a school zone',
  'Write a mean telegram to your archnemesis',
  'Summarize the existence of man',
  'Write a real estate listing for a home where a murder recently occured',
  'Convince a PetCo customer service rep to accept the return of your recently deceased goldfish',
  'You may send one text to the entire country: what does it say?',
  'Ask a stanger for drugs without being direct',
  'Welcome someone to Walmart',
  'Describe something that scared you as a child',
  'Explain a vasectomy',
  'Tell someone their fly is open',
  'Write a diary entry for Batman',
  'Describe the inner thoughts of a dog',
  'Write a police report about a flasher at the grocery store',
  'What\'s the hardest part about being a ghost?',
  'Explain the importance of foreplay',
  'Briefly summarize American history',
  'Tell your parents that you want to become a stunt person',
  'What\'s the most significant moment in human history',
  'Create a Tinder bio for your grandma',
  'Write a missing cat poster',
  'Write a note to the teller informing them you are robbing the bank',
  'Explain the process of circumcision',
  'Tell a patient that you\'ve accidentally amputated the wrong limb',
  'Offer to apply sunscreen to a rapidly burning stranger on the beach',
  'Give someone CPR instructions over the phone',
  'Ask your boss for a promotion in exchange for sexual favors',
  'Tell your spouse of 20 years that you\'d like to have a threesome',
  'Compliment a stripper on the quality of their performance',
  'Tell a child why they shouldn\'t talk to strangers',
  'Announce last call at a dive bar',
  'Write a business plan for Taco Bell',
  'Disinvite someone to your wedding',
  'Explain puberty to a class full of pre-teens',
  'Draft an apology email to your boss after accidentally setting the office on fire',
  'Craft a text message to your ex, asking for your favorite sweater back',
  'Write a letter to the aliens arriving on Earth, explaining human behavior',
  'Create a Craigslist ad selling your soul',
  'Create a list of requirements for a romantic dinner',
  'Write the list of ingredients God used to create the current player',
  'Compose a tweet as if you were an alien visiting Earth for the first time',
  'Craft a message to your future self 10 years from now, warning them about an impending disaster',
  'Draft a press release announcing your candidacy for President',
  'Write a job application to become a professional ghost hunter',
  'Write a diary entry for Batman',
  'Write a diary entry for the current player',
  'Write a note seducing the current player',
  'Compose a speech you\'d give to convince your parents to let you adopt a pet dragon',
  'Tell your doctor that your nipples simply won\'t stop growing in length',
  'Tell your neighbor that regretfully you have run over their cat',
  'Write a diary entry for the day you lost your virginity',
  'Write an inspirational halftime speech given by a high school assistant football coach',
  'Leave a Yelp review of a bad restaurant',
  'Write a song that teaches children self-esteem',
  'Write an elaborate phrase you might yell when carjacking someone',
  'Apologize to your dog for stepping on her tail',
  'Describe a hippopotamus',
  'Write an advertisement for trendy adult diapers',
  'Use your best pick up line',
  'At the center of King Tut\'s tomb, there is carved a single phrase:',
  'Explain how the sewer system works',
  'Write a cry for help alerting people you are stuck inside a well',
  'Write a magic spell that changes someone into a farm animal',
  'Give a lecture about how the pyramids were made',
  'Teach someone how to potty train a dog',
  'Draft a new law that would make the world a better place',
  'Explain to a grocery store worker why you have to be accompanied by your monkey',
  'Summarize Greek mythology',
  'What\'s your biggest regret?',
  'Describe the status of your bank account',
  'Give the current player an annual performance review',
  'Give the current player some relationship advice',
  'Describe your family to your therapist',
  'Ask a friend for money to help you start a new food truck',
  'What\'s the most frustrating thing about corporate life?',
  'What does Bernie Sanders believe in?',
  'Confess your darkest sins to a priest',
  'Write a sign advertising that you have chickens for sale',
  'How did Jesus die?',
  'Romeo\'s most quoted line to Juliet is:',
  'Write a letter informing someone why they were not accepted into college',
  'Write a highway sign reminding people not to drink and drive',
  'Record the voicemail greeting for your mom\'s new phone',
  'Write an obscure law that is still on the books in Florida',
  'Write a warning sign for people entering an underwater cave',
  'Talk someone through performing open heart surgery',
  'Explain to a child why we\'ve let global warming get this bad',
  'Describe how a caterpillar becomes a butterfly',
  'Tell a friend they have something stuck in their teeth',
  'Tell your gynecologist why you require an immediate appointment',
  'Write a fortune cookie',
  'Write a theme song for a TV show about loneliness',
  'Walk us through the masturbation process',
  'Write a sympathy card',
  'Write an entry on your resume',
  'Write the laundry instructions for a delicate shirt',
  'Explain the female orgasm',
  'Write a new motto for the state of Texas',
  'What\'s the most shocking thing you\'ve ever heard an old person say?',
  'What\'s the creepiest thing about the ocean?',
  'What was the best part about kindergarten',
  'Write a sign explaining your shop is closed due to an infestation of angry bees',
  'Create the tagline for a travel brochure for a small town in Idaho',
  'Make a billboard for orange soda',
  'Ask a neighbor to borrow something from their kitchen',
  'Write a list of demands for social justice reform',
  'Write a speech that you\'d regret giving at your wedding',
  'Introduce your mom a candidate to be your stepdad',
  'Describe your imaginary friend',
  'Write an ancient spell that gives your enemies lice',
  'Write a chant protesting fossil fuel',
  'Describe living through the year 2020',
  'Write a doctor\'s note to get a child out of gym class',
  'Warn someone there\'s a giant, hairy spider on their shoulder',
  'Explain puberty to a classroom of pre-teens',
  'Ask a barber to shave your chest',
  'Tell a patient that you\'ve accidentally amputated the wrong limb',
  'What\'s the most depraved Google search the current player has ever made?',
  'What\'s the most signifcant moment in human history?',
  'What\'s the most unusual thing about the city you live in?',
  'Create a compelling argument for why women are superior',
  'Write the automated telephone greeting for a haunted house',
  'Write a new Bible verse',
  'Write a new verse of a Taylor Swift song',
  'Describe your favorite food',
  'Write what your father angrily shouts at other cars while in traffic',
  'Say something to soothe a neurotic child at bedtime',
  'Reveal to your best friend that you are actually a vampire',
  'Come up with the plot for a low-budget porn film',
  'Recommend acupuncture therapy to a skeptical friend',
  'Write a eulogy to be said at your young child\'s goldfish funeral',
  'What will you discuss with your therapist this week',
  'What is this month\'s most Googled search by 70-year-old men',
  'Write a flier promoting a new vegan coffee bar',
  'Write a diary entry describing the most appealing part of the male body',
  'Write a letter to the parents of a private school apologizing for why you had to fire the chemistry teacher'
  'Threaten a neighbor with a lawsuit over a tree branch that fell on your car',
  'Describe the best Halloween costume you\'ve ever seen',
  'Summarize the Star Wars movies',
  'Write a review of your childhood',
  'Describe kangaroos',
  'Throw someone out of the dog park',
  'Tell your parents you want to become a stunt person',
  'Explain badminton',
  'What\'s the worst part of camping?',
  'Convince a scared child to ride a horse',
  'Write a Facebook message to your high school crush',
  'Where do babies come from?',
  'Make a flier offering guitar lessons',
  'Leave a note in a time capsule that will be opened in 150 years',
  'Explain how vaccines work',
  'Pitch a new movie plot to Disney executives',
  'Declare the terms of a duel in an old-timey Western village',
  'How do you explain trickle-down economics?',
  'Tell a child why they shouldn\'t talk to strangers',
  'How do you feel about billionaires',
  'Choose one superpower and explain your decision',
  'How would your best friend describe you when trying to be your wingman?',
  'Explain TikTok to your grandfather',
  'What\'s the best part about being a single adult?',
  'Pitch a new technology startup to a group of investors',
  'Explain to a child that Santa Claus is not real',
  'Describe a Picasso painting',
  'What happens when we die?',
  'What\'s Easter all about?',
  'Go next door and tell your neighbors their music is too loud',
  'Explain the process of circumcision',
  'Tell a stranger that they look very nice today'
  'Write the new Nike tagline',
  'Convince a bank to give you a loan',
  'Ask a friend to go bird watching with you',
  'Write a jingle for the bus company in your city',
  'Tell someone your appendix has burst',
  'Write an application to NASA to be an astronaut',
  'Write a flyer offering your discount massage services',
  'Write the speech you plan to give at your retirement party',
  'Give the commencement speech as the valedictorian of an art school',
  'Describe the experiment you\'re planning to conduct with grant money',
  'Describe something that scared you as a child',
  'Create the name for the least-famous member of the Wu-Tang Clan',
  'What are some tips for keeping your food safe from bears?',
  'Tell the job interviewer why you haven\'t worked in three years',
  'Tweet a political complaint',
  'Draft a pamphlet convincing people to join your religion',
  'Summarize the Facebook privacy policy',
  'Tell a Home Depot employee you\'re looking for a hammer',
  'Get someone who\'s been in a coma since 2014 up to speed',
  'What\'s the weirdest thing you\'ve ever seen in a museum?',
  'Whisper something seductive to your date during a movie',
  'Write a commercial for Coke. Specifically cocaine.',
  'Describe your job as a mail carrier to someone during a speed dating event',
  'Deliver the airplane safety speech just before takeoff',
  'Ask someone to help you move',
  'Write the description for a Netflix-exclusive romcom',
  'Tell your Tinder date that you have rabies',
  'Write a description for a true crime podcast',
  'Send a text to a loved one telling them you\'ve been trampled by a donkey',
  'Warn someone there is a murderer hiding under their bed',
  'Alert someone that you are slowly sinking in quicksand',
  'What\'s the nicest thing you can say about the current player',
  'Ask your boss for a promotion in exchange for sexual favors',
  'Choreograph a fight scene in a kung fu movie',
  'What\'s your plan for survivng the zombie apocalypse',
  'Write an acceptance speech for a Grammy award',
  'Describe the weirdest dream you\'ve ever had',
  'Ask a stranger for drugs without being direct',
  'Explain how pearls are made',
  'Write a missing cat poster',
  'The tagline to Guy Fieri\'s new cooking show is:',
  'Ask your uncle on his deathbed to include you in his will',
  'Write a Facebook post shamelessly asking people to join your multi-level marketing scheme',
  'Demand to a nervous customer service rep that they remove the charges from your account',
  'What conspiracy theory does you aunt always bring up at Thanksgiving?',
  'Write a Craigslist ad for a couch that smells vaguely of urine',
  'Write a happy birtday song for your mom',
  'Write the eulogy for your boss whom you openly despise',
  'Share what you know about New York City',
  'Write a recall notice for a batch of baby toys that spontaneously combust',
  'Write an old-timey expression for someone who isn\'t very attractive',
  'Apologize to someone for crashing your car through their house and into their dining room',
  'What is the current players deepest sexual fantasy',
  'Describe your inner thoughts while public speaking',
  'What does it say in the Declaration of Independence?',
  'Give your best advice for dealing with anger to a 4-year-old',
  'Welcome newly landed aliens to Earth',
  'Write a speech for a troubling presidential candidate',
  'Create a beer commercial',
  'Show your racist uncle the error of his ways',
  'Tell a mechanic what\'s wrong with your car',
  'Describe the solar system',
  'Call your grandmother and ask her to drive you home from a party because you\'re too high',
  'Write an Amazon review for a toaster oven',
  'What\'s the most satisfying thing about revenge'
];

const cards: any = {
  words: ['happy','struggle','when','incident','seem','tough','actually','laugh','alone','destroy','yeast','threat','chemical','battle','acquire','pink','dream','poke','medicate','pray','mishap','beast','kick','ruin','skeleton','thousand','record','anguish','daddy','website','dis','high','wave','accident','clogged','disappear','yummy','snack','bad','innards','clench','squirt','dump','defeat','commit','comment','revolt','bottom','flow','cyst','jam','pantsuit','adjust','drunk','hostile','chocolate','forbidden','analysis','space','pound','vision','crawl','adult','amusement','unlucky','trillion','soldier','weenie','zone','small','grill','consume','share','lovely','wife','creature','bulbous','sex','hammer','torture','bedroom','creep','vile','impact','ooze','organic','noise','supple','cake','time','treat','pull','plug','chick','fish','dazzling','vegetable','flame','stop','kiss','flap','hero','part','place','screw','aim','weapon','belly','fill','bag','grand','batter','hardware','possess','pleasure','bone','pad','wear','area','smooth','juice','child','moist','bitchy','garden','nugget','dude','grisly','mister','seduce','low','saggy','crave','sleep','beer','beat','overthrow','die','bird','atrocity','attain','adventure','run','nibble','chaos','blast','dangerous','toblerone','coitus','nunchucks','brisk','stilts','fur','bush','peach','eggplant','toast','charm','spell','cast','magic','human','animal','quest','anatomy','scan','sour','slice','churn','furl','screech','pierce','cup','plant','dig','cover','balloon','filth','load','strategy','mistake','never','terrify','game','crusty','steer','sauce','devour','end','start','middle','piece','section','dread','misery','fear','anxiety','sword','meow','cat','dog','pet','goose','fly','soar','smash','sly','sneak','piss','steam','birthday','question','therapy','health','shine','scum','rough','tug','bite','delight','bang','car','ocean','ceiling','hello','yikes','flesh','bomb','bare','challenge','swap','hundred','wound','relish','hunt','woman','fantasy','boy','girl','grow','shrink','neck','egg','leak','jelly','scream','slide','tiny','grab','meat','gnarly','abscess','attempt','raw','drama','mad','elaborate','booty','please','crucial','scenario','wonderful','ceremony','crowd','chant','drug','bender','heavy','tongue','bamboozle','alter','illness','rub','cheese','skin','gently','press','potato','brain','numerous','tissue','plop','surprise','cadaver','cherish','boob','insidious','friend','visit','crack','pause','panties','young','man','why','foot','enemy','suffer','hike','sexy','storm','face','saw','itch','absorb','jerk','wink','unlikely','damage','princess','pop','float','inquiry','walk','surge','betrayal','behind','head','crisis','soul','like','fix','up','cure','also','rock','think','whip','asset','argue','basic','doubt','work','kingdom','devil','money','hurt','lucky','mind','test','shark','mushroom','party','cam','mat','blake','joe','moon','carl','mush','kelp','torment','despise','miss','amazing','night','arrest','juicy','crash','your','strive','keep','blow','eat','see','cry','baby','school','slight','prize','price','climb','cruel','commotion','rotten','alien','average','crunch','thunder','poop','UFO','belief','her','shirt','good','study','more','firm','genital','wish','pump','curious','stroke','sack','dance','listen','finger','duck','day','nose','nail','assassin','large','murder','travel','catch','ass','warrior','around','some','old','stink','shelter','say','darkness','cute','attack','assault','love','bowel','amount','damp','object','foul','bank','chocolates','evolve','excuse','burn','blunder','abuse','search','fester','laser','conflict','stomach','grate','hey','peel','apply','blame','big','TV'],
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
  color: number = 0;

  constructor(username?: string, host?: boolean, connected: boolean = false, color?: number) {
    this.username = username || '';
    this.host = host || false;
    this.connected = connected;
    if(color && color < banditColors.length){
      this.color = color;
    }
  }

  setColor(color?: number){
    if(color !== undefined && color < banditColors.length){
      this.color = color;
    }
  }
}
export class Card {
  text: string;
  x: number = 0;
  y: number = 0;
  z: number = 1;

  constructor(text: string, x?: number, y?: number, z?: number){
    this.text = text;
    if(x){
      this.x = x;
    }
    if(y){
      this.y = y;
    }
    if(z){
      this.z = z;
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