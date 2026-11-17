// Banned phrases and patterns for Forge AI website copy.
// Any match (case-insensitive) fails validation and triggers copy repair.

export const BANNED_PHRASES = [
  'lorem ipsum',
  'unlock',
  'game-changer',
  'game changer',
  'revolutionize',
  'revolutionary',
  'seamless',
  'elevate your',
  'transform your',
  'next level',
  'world-class',
  'cutting-edge',
  'leverage',
  'synergy',
  'your one-stop',
  'we are passionate',
  'passionate about',
  'welcome to our website',
  'click here',
  'placeholder',
  'TODO',
  'XXX',
  '[insert',
  '{{',
  'Example Company',
  'Your Company',
  'John Doe',
  'Jane Doe',
  'Lorem',
];

export const BANNED_PATTERNS = [
  /\{\{/,
  /\[insert/i,
  /TODO/i,
  /XXX/i,
];

/** Returns the first banned phrase found in text, or null. */
export function findBannedPhrase(text) {
  const lower = String(text ?? '').toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) return phrase;
  }
  for (const re of BANNED_PATTERNS) {
    if (re.test(String(text ?? ''))) return re.source;
  }
  return null;
}

/** Returns true when text contains no banned phrases. */
export function isCleanCopy(text) {
  return findBannedPhrase(text) === null;
}

/** Scan an object's string leaves and return banned phrase hits with paths. */
export function scanBanned(node, path = 'root') {
  const hits = [];
  (function walk(n, p) {
    if (typeof n === 'string') {
      const hit = findBannedPhrase(n);
      if (hit) hits.push({ path: p, phrase: hit, text: n.slice(0, 80) });
      return;
    }
    if (Array.isArray(n)) { n.forEach((item, i) => walk(item, `${p}[${i}]`)); return; }
    if (n && typeof n === 'object') { for (const [k, v] of Object.entries(n)) walk(v, `${p}.${k}`); }
  })(node, path);
  return hits;
}
