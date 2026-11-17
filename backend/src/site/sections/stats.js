// Stats section.
// Variants: row, band. Only generated when numbers are supplied.

const space = (d) => ({ compact: '0.85rem', regular: '1rem', airy: '1.25rem' }[d] || '1rem');
const radius = (r) => ({ sharp: '0.25rem', soft: '0.75rem', round: '1.5rem' }[r] || '0.75rem');
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c])); }
function sectionId(content) { return `stats-${esc((content.sectionId || 'stats').toLowerCase().replace(/[^a-z0-9]+/g,'-'))}`; }

export const type = 'stats';
export const variants = {
  row: {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'By the numbers');
      const items = Array.isArray(content.items) ? content.items : [];
      if (!items.length) return '';
      const id = sectionId(content);
      return `
        <section class="stats row" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading">${heading}</h2>
          <div class="stats-row">
            ${items.map((item) => `
              <div class="stat-item">
                <div class="stat-value">${esc(item.value || item.number || '')}</div>
                <div class="stat-label">${esc(item.label || '')}</div>
              </div>
            `).join('')}
          </div>
        </section>
      `;
    },
    css: `
      .stats.row { padding:calc(var(--space-unit) * 3) 0; background:var(--surface); color:var(--ink); }
      .stats.row > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .stats h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 2); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); text-align:center; }
      .stats-row { display:flex; flex-wrap:wrap; justify-content:center; gap:calc(var(--space-unit) * 1.5); }
      .stat-item { text-align:center; min-width:120px; }
      .stat-value { font-family:var(--font-display); font-weight:700; font-size:clamp(1.75rem,3vw + 0.5rem,2.5rem); color:var(--brand); }
      .stat-label { font-family:var(--font-body); margin-top:calc(var(--space-unit) * 0.5); font-size:clamp(0.9rem,1vw + 0.3rem,1rem); color:var(--muted); }
    `,
  },
  band: {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'By the numbers');
      const items = Array.isArray(content.items) ? content.items : [];
      if (!items.length) return '';
      const id = sectionId(content);
      return `
        <section class="stats band" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading">${heading}</h2>
          <div class="stats-band">
            ${items.map((item) => `
              <div class="stat-item">
                <div class="stat-value">${esc(item.value || item.number || '')}</div>
                <div class="stat-label">${esc(item.label || '')}</div>
              </div>
            `).join('')}
          </div>
        </section>
      `;
    },
    css: `
      .stats.band { padding:calc(var(--space-unit) * 3) 0; background:var(--brand); color:#ffffff; }
      .stats.band > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .stats.band h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 2); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:#ffffff; text-align:center; }
      .stats-band { display:flex; flex-wrap:wrap; justify-content:center; gap:calc(var(--space-unit) * 1.5); }
      .stat-item { text-align:center; min-width:120px; }
      .stat-value { font-family:var(--font-display); font-weight:700; font-size:clamp(1.75rem,3vw + 0.5rem,2.5rem); color:#ffffff; }
      .stat-label { font-family:var(--font-body); margin-top:calc(var(--space-unit) * 0.5); font-size:clamp(0.9rem,1vw + 0.3rem,1rem); color:rgba(255,255,255,0.85); }
    `,
  },
};
