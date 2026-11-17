// CTA section.
// Variants: band, card.

const space = (d) => ({ compact: '0.85rem', regular: '1rem', airy: '1.25rem' }[d] || '1rem');
const radius = (r) => ({ sharp: '0.25rem', soft: '0.75rem', round: '1.5rem' }[r] || '0.75rem');
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c])); }
function sectionId(content) { return `cta-${esc((content.sectionId || 'cta').toLowerCase().replace(/[^a-z0-9]+/g,'-'))}`; }

export const type = 'cta';
export const variants = {
  band: {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'Get started today');
      const body = esc(content.body || '');
      const id = sectionId(content);
      return `
        <section class="cta band" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <div class="cta-inner">
            <div class="cta-text">
              <h2 id="${id}-heading">${heading}</h2>
              ${body ? `<p>${body}</p>` : ''}
            </div>
            ${content.buttonLabel ? `<a href="${esc(content.buttonHref || '#')}" class="btn">${esc(content.buttonLabel)}</a>` : ''}
          </div>
        </section>
      `;
    },
    css: `
      .cta.band { padding:calc(var(--space-unit) * 2.5) 0; background:var(--brand); color:#ffffff; }
      .cta.band > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .cta-inner { display:flex; flex-direction:column; gap:calc(var(--space-unit) * 1.5); align-items:center; text-align:center; }
      .cta-text h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 0.75); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:#ffffff; }
      .cta-text p { font-family:var(--font-body); margin:0; font-size:clamp(1rem,1.25vw + 0.5rem,1.25rem); line-height:1.6; color:rgba(255,255,255,0.9); }
      .btn { display:inline-block; background:#ffffff; color:var(--brand); text-decoration:none; padding:0.6rem calc(var(--space-unit) * 1.5); border-radius:var(--radius); font-family:var(--font-body); font-weight:600; font-size:clamp(0.9rem,1vw + 0.3rem,1rem); }
      .btn:focus-visible { outline:2px solid #ffffff; outline-offset:2px; }
    `,
  },
  card: {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'Get started today');
      const body = esc(content.body || '');
      const id = sectionId(content);
      return `
        <section class="cta card" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <div class="cta-card">
            <h2 id="${id}-heading">${heading}</h2>
            ${body ? `<p>${body}</p>` : ''}
            ${content.buttonLabel ? `<a href="${esc(content.buttonHref || '#')}" class="btn">${esc(content.buttonLabel)}</a>` : ''}
          </div>
        </section>
      `;
    },
    css: `
      .cta.card { padding:calc(var(--space-unit) * 3) 0; background:var(--bg); color:var(--ink); }
      .cta.card > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .cta-card { background:var(--surface); border:1px solid var(--muted); border-radius:var(--radius); padding:calc(var(--space-unit) * 2); text-align:center; max-width:560px; margin:0 auto; }
      .cta-card h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 0.75); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); }
      .cta-card p { font-family:var(--font-body); margin:0 0 calc(var(--space-unit) * 1.5); font-size:clamp(1rem,1.25vw + 0.5rem,1.25rem); line-height:1.6; color:var(--ink); }
      .btn { display:inline-block; background:var(--brand); color:#ffffff; text-decoration:none; padding:0.6rem calc(var(--space-unit) * 1.5); border-radius:var(--radius); font-family:var(--font-body); font-weight:600; font-size:clamp(0.9rem,1vw + 0.3rem,1rem); }
      .btn:focus-visible { outline:2px solid var(--brand); outline-offset:2px; }
    `,
  },
};
