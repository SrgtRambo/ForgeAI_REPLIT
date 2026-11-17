// Contrast and palette utilities for Forge AI site designs.
// WCAG 2.1 contrast math, palette validation, and automatic contrast repair.

const HEX_RE = /^#[0-9a-f]{6}$/i;

function linearize(c) {
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function luminance(r, g, b) {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}
export function parseHex(hex) {
  const m = String(hex).match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
}

/** Contrast ratio between two colors (1 to 21). */
export function contrastRatio(color1, color2) {
  const c1 = parseHex(color1);
  const c2 = parseHex(color2);
  if (!c1 || !c2) return 0;
  const l1 = luminance(c1[0], c1[1], c1[2]);
  const l2 = luminance(c2[0], c2[1], c2[2]);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

export const PALETTE_ROLES = ['bg', 'surface', 'ink', 'muted', 'brand', 'accent'];

// Required contrast ratios per role pair: [foreground, background, minimum ratio].
const CONTRAST_RULES = [
  ['ink', 'bg', 4.5],
  ['ink', 'surface', 4.5],
  ['muted', 'bg', 4.5],
  ['brand', 'bg', 3],
];

export function isValidHex(color) {
  return HEX_RE.test(String(color));
}

/** Adjust a color's lightness (HSL) by a delta (-1 to 1). */
function adjustLightness(hex, delta) {
  const c = parseHex(hex);
  if (!c) return hex;
  // RGB to HSL.
  const max = Math.max(c[0], c[1], c[2]);
  const min = Math.min(c[0], c[1], c[2]);
  let h = 0, s, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case c[0]: h = (c[1] - c[2]) / d + (c[1] < c[2] ? 6 : 0); break;
      case c[1]: h = (c[2] - c[0]) / d + 2; break;
      case c[2]: h = (c[0] - c[1]) / d + 4; break;
    }
    h /= 6;
  } else { s = 0; }
  let nl = Math.min(1, Math.max(0, l + delta));
  // HSL back to RGB (simplified: only lightness changes, keep hue/saturation).
  const rgb = hslToRgb(h, s, nl);
  return rgbToHex(rgb[0], rgb[1], rgb[2]);
}
function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) { r = g = b = l; } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Validate a palette object. Returns { ok, errors[], adjustments[] }. */
export function validatePalette(palette) {
  const errors = [];
  const adjustments = [];
  if (!palette || typeof palette !== 'object') {
    return { ok: false, errors: ['Palette must be an object.'], adjustments: [] };
  }
  for (const role of PALETTE_ROLES) {
    if (!isValidHex(palette[role])) {
      errors.push(`palette.${role} must be a valid hex color (#rrggbb).`);
    }
  }
  // Contrast rules (only when both colors are valid hex).
  const bg = palette.bg;
  for (const [fg, bgRole, min] of CONTRAST_RULES) {
    const fgColor = palette[fg];
    const bgColor = palette[bgRole];
    if (isValidHex(fgColor) && isValidHex(bgColor)) {
      const ratio = contrastRatio(fgColor, bgColor);
      if (ratio < min) {
        errors.push(`${fg} on ${bgRole} contrast ${ratio.toFixed(2)}:1 is below required ${min}:1.`);
        // Record an adjustment: darken fg or lighten bg.
        adjustments.push({ role: fg, reason: `contrast with ${bgRole}`, current: fgColor });
      }
    }
  }
  // bg and surface must not be identical.
  if (isValidHex(palette.bg) && isValidHex(palette.surface) && palette.bg.toLowerCase() === palette.surface.toLowerCase()) {
    errors.push('palette.bg and palette.surface must not be identical.');
    adjustments.push({ role: 'surface', reason: 'identical to bg', current: palette.surface });
  }
  return { ok: errors.length === 0, errors, adjustments };
}

/** Repair a palette by adjusting failing colors until contrast passes. Returns adjusted palette. */
export function repairPalette(palette) {
  const fixed = { ...palette };
  let changed = false;
  for (let pass = 0; pass < 10; pass++) {
    const result = validatePalette(fixed);
    if (result.ok) break;
    for (const adj of result.adjustments) {
      if (adj.role === 'ink' || adj.role === 'muted' || adj.role === 'brand') {
        // Darken the foreground color.
        fixed[adj.role] = adjustLightness(fixed[adj.role], -0.15);
      } else if (adj.role === 'surface') {
        // Lighten surface to differ from bg.
        fixed[adj.role] = adjustLightness(fixed[adj.role], 0.15);
      }
      changed = true;
    }
    if (!changed) break;
  }
  return { palette: fixed, changed };
}

/** Derive a palette from customer-provided colors. If none given, returns null (model proposes). */
export function derivePalette(customerColors) {
  if (!customerColors || Object.keys(customerColors).length === 0) return null;
  const palette = {};
  for (const role of PALETTE_ROLES) {
    palette[role] = customerColors[role] || '#000000';
  }
  const repaired = repairPalette(palette);
  if (repaired.changed) {
    palette._adjusted = true;
    palette._adjustmentNote = 'Adjusted brand color for readability.';
  }
  return palette;
}

export const DENSITY_SPACE = { compact: '0.85rem', regular: '1rem', airy: '1.25rem' };
export const RADIUS_VALUES = { sharp: '0.25rem', soft: '0.75rem', round: '1.5rem' };
