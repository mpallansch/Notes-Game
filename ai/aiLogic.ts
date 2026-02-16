/**
 * AI logic for the Passing Notes game.
 * Provides smarter card selection (submitting) and answer selection (selecting) instead of random moves.
 */

import { Card, Answer } from './shared/Shared';

// Card type hints for building coherent sentences (subset of shared card lists)
const FILLER_WORDS = new Set(['a', 'an', 'the', 'i', 'i\'d', 'him', 'her', 'his', 'she', 'he', 'my', 'your', 'it', 'those', 'these', 'we', 'us', 'any', 'in', 'on', 'of', 'for', 'than', 'from', 'with', 'to', 'after', 'at', 'if', 'so', 'but', 'because', 'then', 'now', 'not', 'already', 'yet', 'when', 'too', 'no', 'have', 'did', 'has', 'was', 'do', 'can', 'go']);
const PUNCTUATION = new Set(['?', '!', '.', ',', '...', '-', ':', '/']);
const MODIFIER_SUFFIXES = ['s', 'es', 'ed', 'ing', 'y', 'ly', 'er', 'est', 'un'];

function isFiller(text: string): boolean {
  return FILLER_WORDS.has(text.toLowerCase());
}

function isPunctuation(text: string): boolean {
  return PUNCTUATION.has(text);
}

function isModifier(text: string): boolean {
  return MODIFIER_SUFFIXES.some(suffix => text.toLowerCase().endsWith(suffix) || text === suffix);
}

/**
 * Extract meaningful keywords from the prompt for relevance scoring.
 * Filters out common words and short words.
 */
function extractPromptKeywords(prompt: string): Set<string> {
  const stopWords = new Set(['the', 'a', 'an', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'your', 'you', 'your', 'that', 'this', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can']);
  const words = prompt.toLowerCase().replace(/[^\w\s']/g, ' ').split(/\s+/);
  const keywords = new Set<string>();
  for (const w of words) {
    if (w.length >= 3 && !stopWords.has(w)) {
      keywords.add(w);
    }
  }
  return keywords;
}

/**
 * Score a card's relevance to the prompt.
 */
function scoreCardRelevance(card: Card, promptKeywords: Set<string>): number {
  const text = card.text.toLowerCase();
  if (promptKeywords.has(text)) return 3;
  // Partial match (e.g. "doctor" matches "doctor's")
  for (const kw of promptKeywords) {
    if (text.includes(kw) || kw.includes(text)) return 2;
  }
  // Thematic: some prompts suggest certain word types
  if (isFiller(text)) return 0.5; // Useful for structure
  if (isPunctuation(text)) return 0.5; // Needed to end sentence
  if (isModifier(text)) return 0.3;
  return 0;
}

/**
 * Score a potential submission (array of cards) for coherence and prompt relevance.
 */
function scoreSubmission(cards: Card[], prompt: string): number {
  const keywords = extractPromptKeywords(prompt);
  let score = 0;

  const texts = cards.map(c => c.text);
  const hasPunctuation = texts.some(t => isPunctuation(t));
  const hasFiller = texts.some(t => isFiller(t));
  const wordCount = texts.filter(t => !isPunctuation(t)).length;

  // Prefer 3-8 word responses (not too short, not too long)
  if (wordCount >= 3 && wordCount <= 8) score += 2;
  else if (wordCount >= 2 && wordCount <= 10) score += 1;

  // Bonus for ending with punctuation
  if (hasPunctuation && isPunctuation(texts[texts.length - 1])) score += 1.5;

  // Bonus for having sentence structure (filler word)
  if (hasFiller) score += 1;

  // Relevance to prompt
  for (const card of cards) {
    score += scoreCardRelevance(card, keywords);
  }

  // Slight preference for variety (different card types)
  const types = new Set(texts.map(t => isFiller(t) ? 'filler' : isPunctuation(t) ? 'punct' : 'content'));
  if (types.size >= 2) score += 0.5;

  return score;
}

/**
 * Pick the best cards to submit for the prompt.
 * Uses a greedy approach: try multiple combinations and pick the highest-scoring.
 */
export function pickCardsToSubmit(availableCards: Card[], prompt: string): Card[] {
  if (!availableCards || availableCards.length === 0) return [];

  // Limit search space: try subsets of size 3-7
  const minCards = Math.min(3, availableCards.length);
  const maxCards = Math.min(7, availableCards.length);
  let bestSubmission: Card[] = [];
  let bestScore = -1;

  // Sample combinations to avoid exponential blowup
  const maxAttempts = 50;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const size = minCards + Math.floor(Math.random() * (maxCards - minCards + 1));
    const shuffled = [...availableCards].sort(() => Math.random() - 0.5);
    const subset = shuffled.slice(0, size);

    // Try to put punctuation at end
    const punct = subset.filter(c => isPunctuation(c.text));
    const nonPunct = subset.filter(c => !isPunctuation(c.text));
    const ordered = [...nonPunct];
    if (punct.length > 0) {
      ordered.push(punct[0]); // One punctuation at end
    }

    const score = scoreSubmission(ordered, prompt);
    if (score > bestScore) {
      bestScore = score;
      bestSubmission = ordered.map((c, i) => new Card(c.text, 10 + i * 20, 10 + (i % 2) * 20, i + 1));
    }
  }

  // If we found nothing good, pick a simple 3-4 card combo
  if (bestSubmission.length === 0) {
    const simple = availableCards.slice(0, Math.min(4, availableCards.length));
    return simple.map((c, i) => new Card(c.text, 10 + i * 20, 10, i + 1));
  }

  return bestSubmission;
}

/**
 * Score an answer (another player's submission) for the selecting phase.
 */
function scoreAnswer(answer: Answer, prompt: string): number {
  const cards = answer.cardsSubmitted || [];
  const texts = cards.map((c: Card) => c.text);
  const wordCount = texts.filter((t: string) => !isPunctuation(t)).length;

  let score = 0;

  // Prefer 3-8 word answers
  if (wordCount >= 3 && wordCount <= 8) score += 2;
  else if (wordCount >= 2 && wordCount <= 10) score += 1;

  // Has punctuation
  if (texts.some((t: string) => isPunctuation(t))) score += 1;

  // Has filler (sentence structure)
  if (texts.some((t: string) => isFiller(t))) score += 0.5;

  // Relevance to prompt
  const keywords = extractPromptKeywords(prompt);
  for (const t of texts) {
    if (keywords.has(t.toLowerCase())) score += 1.5;
    else {
      for (const kw of keywords) {
        if (t.toLowerCase().includes(kw) || kw.includes(t.toLowerCase())) score += 0.5;
      }
    }
  }

  return score;
}

/**
 * Pick the best answer to select (as the judge).
 */
export function pickBestAnswer(answers: Answer[], prompt: string): number {
  if (!answers || answers.length === 0) return -1;

  let bestIndex = 0;
  let bestScore = -1;

  for (let i = 0; i < answers.length; i++) {
    const score = scoreAnswer(answers[i], prompt);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return answers[bestIndex].chairIndex;
}
