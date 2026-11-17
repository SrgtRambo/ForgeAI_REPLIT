// FAQ section.
// Variant: accordion.

const space = (d) => ({ compact: '0.85rem', regular: '1rem', airy: '1.25rem' }[d] || '1rem');
const radius = (r) => ({ sharp: '0.25rem', soft: '0.75rem', round: '1.5rem' }[r] || '0.75rem');
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c])); }
function sectionId(content) { return `faq-${esc((content.sectionId || 'faq').toLowerCase().replace(/[^a-z0-9]+/g,'-'))}`; }

export const type = 'faq';
export const variants = {
  accordion: {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'Frequently asked questions');
      const items = Array.isArray(content.items) ? content.items : [];
      const id = sectionId(content);
      return `
        <section class="faq accordion" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading">${heading}</h2>
          <div class="faq-wrap">
            ${items.map((item, i) => `
              <div class="faq-item">
                <button type="button" class="faq-question" id="faq-q-${i}" aria-controls="faq-a-${i}" aria-expanded="false">
                  ${esc(item.question || '')}
                </button>
                <div id="faq-a-${i}" class="faq-answer" hidden>
                  <p>${esc(item.answer || '')}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      `;
    },
    css: `
      .faq.accordion { padding:calc(var(--space-unit) * 3) 0; background:var(--bg); color:var(--ink); }
      .faq.accordion > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .faq h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 2); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); text-align:center; }
      .faq-wrap { display:flex; flex-direction:column; gap:calc(var(--space-unit) * 0.75); }
      .faq-item { border:1px solid var(--muted); border-radius:var(--radius); overflow:hidden; }
      .faq-question { width:100%; text-align:left; background:transparent; border:none; padding:calc(var(--space-unit) * 1); font-family:var(--font-display); font-size:clamp(1rem,1.25vw + 0.4rem,1.1rem); color:var(--ink); cursor:pointer; text-align:left; }
      .faq-question:focus-visible { outline:2px solid var(--brand); outline-offset:2px; background:var(--surface); }
      .faq-answer { padding:0 calc(var(--space-unit) * 1) calc(var(--space-unit) * 1); font-family:var(--font-body); font-size:clamp(0.95rem,1.1vw + 0.4rem,1.1rem); line-height:1.6; color:var(--ink); }
      .faq-answer p { margin:0; }
    `,
  },
};
