// Font pairings for Forge AI website designs.
// Each pairing id maps to a Google Fonts display/body pair with a local fallback stack.
// display and body always come from the same row.

export const FONT_PAIRINGS = [
  { id: 'editorial-serif', display: 'Fraunces', body: 'Inter', googleUrl: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,700&family=Inter:wght@400;600&display=swap', fallback: '"Fraunces", Georgia, serif', bodyFallback: 'Inter, system-ui, sans-serif' },
  { id: 'warm-serif', display: 'Playfair Display', body: 'Source Sans 3', googleUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@400;600&display=swap', fallback: '"Playfair Display", Georgia, serif', bodyFallback: 'Source Sans 3, system-ui, sans-serif' },
  { id: 'modern-grotesk', display: 'Space Grotesk', body: 'Inter', googleUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Inter:wght@400;600&display=swap', fallback: 'Space Grotesk, system-ui, sans-serif', bodyFallback: 'Inter, system-ui, sans-serif' },
  { id: 'humanist-sans', display: 'Work Sans', body: 'Lora', googleUrl: 'https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;600;700&family=Lora:ital,wght@0,400;0,700;1,400&display=swap', fallback: 'Work Sans, system-ui, sans-serif', bodyFallback: 'Lora, Georgia, serif' },
  { id: 'geometric', display: 'Outfit', body: 'DM Sans', googleUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=DM+Sans:wght@400;600&display=swap', fallback: 'Outfit, system-ui, sans-serif', bodyFallback: 'DM Sans, system-ui, sans-serif' },
  { id: 'condensed-bold', display: 'Oswald', body: 'Open Sans', googleUrl: 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Open+Sans:wght@400;600&display=swap', fallback: 'Oswald, system-ui, sans-serif', bodyFallback: 'Open Sans, system-ui, sans-serif' },
  { id: 'refined-sans', display: 'Manrope', body: 'Manrope', googleUrl: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&display=swap', fallback: 'Manrope, system-ui, sans-serif', bodyFallback: 'Manrope, system-ui, sans-serif' },
  { id: 'classic-book', display: 'Cormorant Garamond', body: 'Nunito', googleUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Nunito:wght@400;600&display=swap', fallback: '"Cormorant Garamond", Georgia, serif', bodyFallback: 'Nunito, system-ui, sans-serif' },
  { id: 'tech-mono-accent', display: 'JetBrains Mono', body: 'IBM Plex Sans', googleUrl: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=IBM+Plex+Sans:wght@400;600&display=swap', fallback: '"JetBrains Mono", ui-monospace, monospace', bodyFallback: 'IBM Plex Sans, system-ui, sans-serif' },
  { id: 'soft-rounded', display: 'Nunito', body: 'Nunito Sans', googleUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&family=Nunito+Sans:wght@400;600&display=swap', fallback: 'Nunito, system-ui, sans-serif', bodyFallback: 'Nunito Sans, system-ui, sans-serif' },
];

export const FONT_PAIRING_IDS = new Set(FONT_PAIRINGS.map((p) => p.id));

export function findFontPairing(id) {
  return FONT_PAIRINGS.find((p) => p.id === id);
}

export function isValidFontPairing(display, body) {
  const p = findFontPairing(display);
  return Boolean(p && p.body === body);
}
