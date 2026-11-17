// Design tokens for Forge AI websites.
// These become the :root CSS variables in css/site.css.

export const TOKEN_NAMES = [
  '--bg', '--surface', '--ink', '--muted', '--brand', '--accent',
  '--radius-sm', '--radius-md', '--radius-lg', '--shadow',
  '--font-display', '--font-body', '--space-unit',
];

export const RADIUS_MAP = { sharp: '0.25rem', soft: '0.75rem', round: '1.5rem' };
export const SPACE_MAP = { compact: '0.85rem', regular: '1rem', airy: '1.25rem' };

export function radiusToken(radius) {
  return RADIUS_MAP[radius] || RADIUS_MAP.soft;
}
export function spaceToken(density) {
  return SPACE_MAP[density] || SPACE_MAP.regular;
}

/** Build the :root CSS custom properties block for a spec's design. */
export function rootVariables(design) {
  const { palette, fonts, radius, density } = design || {};
  const lines = [];
  if (palette) {
    lines.push(`  --bg: ${palette.bg || '#ffffff'};`);
    lines.push(`  --surface: ${palette.surface || '#f5f5f5'};`);
    lines.push(`  --ink: ${palette.ink || '#111111'};`);
    lines.push(`  --muted: ${palette.muted || '#666666'};`);
    lines.push(`  --brand: ${palette.brand || '#0066cc'};`);
    lines.push(`  --accent: ${palette.accent || '#ff9900'};`);
  }
  if (radius) lines.push(`  --radius-sm: ${radiusToken(radius)};`);
  if (radius) lines.push(`  --radius-md: ${radiusToken(radius)};`);
  if (radius) lines.push(`  --radius-lg: ${radiusToken(radius)};`);
  lines.push(`  --shadow: 0 4px 12px rgba(0,0,0,0.08);`);
  if (fonts) {
    lines.push(`  --font-display: ${fontStack(fonts.display)};`);
    lines.push(`  --font-body: ${fontStack(fonts.body)};`);
  }
  if (density) lines.push(`  --space-unit: ${spaceToken(density)};`);
  return ':root {\n' + lines.join('\n') + '\n}';
}

function fontStack(id) {
  const stacks = {
    'editorial-serif': '"Fraunces", Georgia, serif',
    'warm-serif': '"Playfair Display", Georgia, serif',
    'modern-grotesk': 'Space Grotesk, system-ui, sans-serif',
    'humanist-sans': 'Work Sans, system-ui, sans-serif',
    'geometric': 'Outfit, system-ui, sans-serif',
    'condensed-bold': 'Oswald, system-ui, sans-serif',
    'refined-sans': 'Manrope, system-ui, sans-serif',
    'classic-book': '"Cormorant Garamond", Georgia, serif',
    'tech-mono-accent': '"JetBrains Mono", ui-monospace, monospace',
    'soft-rounded': 'Nunito, system-ui, sans-serif',
  };
  return stacks[id] || 'system-ui, sans-serif';
}
