const tapPath = require('../assets/sounds/buttontap.mp3');
const cardPath = require('../assets/sounds/drawcard.mp3');
const turnPath = require('../assets/sounds/bubblepop.mp3');

export default { 
  tap: new Audio(tapPath),
  card: new Audio(cardPath),
  turn: new Audio(turnPath)
} as {
  alarm: any,
  tap: HTMLAudioElement,
  card: HTMLAudioElement,
  turn: HTMLAudioElement
}