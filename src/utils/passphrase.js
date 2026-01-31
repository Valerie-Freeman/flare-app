import * as Crypto from 'expo-crypto';

// Subset of BIP39 English word list (256 common words for 6-word phrases)
// Full list has 2048 words - this subset provides sufficient entropy for recovery
const WORD_LIST = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
  'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
  'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
  'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
  'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
  'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album',
  'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha',
  'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among', 'amount',
  'anchor', 'ancient', 'anger', 'angle', 'angry', 'animal', 'ankle', 'announce',
  'annual', 'another', 'answer', 'antenna', 'antique', 'anxiety', 'any', 'apart',
  'apology', 'appear', 'apple', 'approve', 'april', 'arch', 'arctic', 'area',
  'arena', 'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange',
  'arrest', 'arrive', 'arrow', 'art', 'artist', 'artwork', 'ask', 'aspect',
  'assault', 'asset', 'assist', 'assume', 'asthma', 'athlete', 'atom', 'attack',
  'attend', 'attitude', 'attract', 'auction', 'audit', 'august', 'aunt', 'author',
  'auto', 'autumn', 'average', 'avocado', 'avoid', 'awake', 'aware', 'away',
  'balance', 'ball', 'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain',
  'barrel', 'base', 'basic', 'basket', 'battle', 'beach', 'bean', 'beauty',
  'because', 'become', 'beef', 'before', 'begin', 'behave', 'behind', 'believe',
  'below', 'belt', 'bench', 'benefit', 'best', 'betray', 'better', 'between',
  'beyond', 'bicycle', 'bird', 'birth', 'bitter', 'black', 'blade', 'blame',
  'blanket', 'blast', 'bleak', 'bless', 'blind', 'blood', 'blossom', 'blouse',
  'blue', 'blur', 'blush', 'board', 'boat', 'body', 'boil', 'bomb',
  'bone', 'bonus', 'book', 'boost', 'border', 'boring', 'borrow', 'boss',
  'bottom', 'bounce', 'box', 'brain', 'brand', 'brave', 'bread', 'breeze',
  'brick', 'bridge', 'brief', 'bright', 'bring', 'brisk', 'broken', 'bronze',
  'brother', 'brown', 'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build',
  'bulb', 'bulk', 'bullet', 'bundle', 'bunker', 'burden', 'burger', 'burst',
  'cabin', 'cable', 'cactus', 'cage', 'cake', 'call', 'calm', 'camera',
  'camp', 'can', 'canal', 'cancel', 'candy', 'cannon', 'canoe', 'canvas',
  'canyon', 'captain', 'car', 'carbon', 'card', 'cargo', 'carpet', 'carry',
  'cart', 'case', 'castle', 'casual', 'cat', 'catalog', 'catch', 'category',
];

/**
 * Generates a random 6-word recovery passphrase.
 * Uses cryptographically secure random number generation.
 */
export async function generatePassphrase() {
  const words = [];
  const randomBytes = await Crypto.getRandomBytesAsync(6);

  for (let i = 0; i < 6; i++) {
    const index = randomBytes[i] % WORD_LIST.length;
    words.push(WORD_LIST[index]);
  }

  return words.join(' ');
}

/**
 * Validates that a passphrase contains exactly 6 words from the word list.
 */
export function validatePassphrase(passphrase) {
  if (!passphrase || typeof passphrase !== 'string') {
    return false;
  }

  const words = passphrase.toLowerCase().trim().split(/\s+/);

  if (words.length !== 6) {
    return false;
  }

  return words.every((word) => WORD_LIST.includes(word));
}

/**
 * Normalizes a passphrase (lowercase, single spaces).
 */
export function normalizePassphrase(passphrase) {
  return passphrase.toLowerCase().trim().split(/\s+/).join(' ');
}
