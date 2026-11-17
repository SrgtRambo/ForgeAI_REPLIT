// Footer section.
// Variants: columns, minimal.

const space = (d) => ({ compact: '0.85rem', regular: '1rem', airy: '1.25rem' }[d] || '1rem');
const radius = (r) => ({ sharp: '0.25rem', soft: '0.75rem', round: '1.5rem' }[r] || '0.75rem');
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c])); }
function sectionId(content) { return `footer-${esc((content.sectionId || 'footer').toLowerCase().replace(/[^a-z0-9]+/g,'-'))}`; }

export const type = 'footer';
export const variants = {
  columns: {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const brand = esc(content.brand || ctx.content.businessName || 'Forge AI');
      const notice = esc(content.notice || '');
      const links = Array.isArray(content.links) ? content.links : [];
      const id = sectionId(content);
      return `
        <footer class="footer columns" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading" class="sr-only">Footer</h2>
          <div class="footer-inner">
            <div class="footer-brand">${brand}</div>
            ${links.length ? `<nav class="footer-links" aria-label="Footer links"><ul>${links.map((l) => `<li><a href="${esc(l.href || '#')}">${esc(l.label)}</a></li>`).join('')}</ul></nav>` : ''}
            ${notice ? `<div class="footer-notice">${notice}</div>` : ''}
          </div>
        </footer>
      `;
    },
    css: `
      .footer.columns { padding:calc(var(--space-unit) * 3) 0 calc(var(--space-unit) * 1.5); background:var(--surface); color:var(--ink); border-top:1px solid var(--muted); }
      .footer.columns > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .footer-inner { display:flex; flex-direction:column; gap:calc(var(--space-unit) * 1.5); }
      .footer-brand { font-family:var(--font-display); font-weight:700; font-size:clamp(1.25rem,1.5vw + 0.5rem,1.5rem); color:var(--ink); }
      .footer-links ul { list-style:none; margin:0; padding:0; display:flex; flex-wrap:wrap; gap:calc(var(--space-unit) * 1.5); }
      .footer-links a { color:var(--ink); text-decoration:none; font-family:var(--font-body); font-size:clamp(0.9rem,1vw + 0.3rem,1rem); }
      .footer-links a:focus-visible { outline:2px solid var(--brand); outline-offset:2px; border-radius:var(--radius); }
      .footer-notice { font-family:var(--font-body); font-size:clamp(0.85rem,1vw + 0.25rem,0.95rem); color:var(--muted); }
      @media (min-width:700px) {
        .footer-inner { flex-direction:row; justify-content:space-between; align-items:flex-start; }
        .footer-links ul { justify-content:flex-end; }
      }
    `,
  },
  minimal: {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const brand = esc(content.brand || ctx.content.businessName || 'Forge AI');
      const notice = esc(content.notice || '');
      const id = sectionId(content);
      return `
        <footer class="footer minimal" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading" class="sr-only">Footer</h2>
          <div class="footer-inner minimal-inner">
            <div class="footer-brand">${brand}</div>
            ${notice ? `<div class="footer-notice">${notice}</div>` : ''}
          </div>
        </footer>
      `;
    },
    css: `
      .footer.minimal { padding:calc(var(--space-unit) * 3) 0 calc(var(--space-unit) * 1.5); background:var(--bg); color:var(--ink); border-top:1px solid var(--muted); }
      .footer.minimal > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .minimal-inner { display:flex; flex-direction:column; gap:calc(var(--space-unit) * 1); align-items:center; text-align:center; }
      .footer-brand { font-family:var(--font-display); font-weight:700; font-size:clamp(1.25rem,1.5vw + 0.5rem,1.5rem); color:var(--ink); }
      .footer-notice { font-family:var(--font-body); font-size:clamp(0.85rem,1vw + 0.25rem,0.95rem); color:var(--muted); }
    `,
  },
};
