// Services section.
// Variants: grid-cards, numbered-list, alternating-rows.

const space = (d) => ({ compact: '0.85rem', regular: '1rem', airy: '1.25rem' }[d] || '1rem');
const radius = (r) => ({ sharp: '0.25rem', soft: '0.75rem', round: '1.5rem' }[r] || '0.75rem');
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c])); }
function sectionId(content) { return `services-${esc((content.sectionId || 'services').toLowerCase().replace(/[^a-z0-9]+/g,'-'))}`; }

export const type = 'services';
export const variants = {
  'grid-cards': {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'Our services');
      const items = Array.isArray(content.items) ? content.items : [];
      const id = sectionId(content);
      return `
        <section class="services grid-cards" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading">${heading}</h2>
          <div class="services-grid">
            ${items.map((item, i) => `
              <article class="service-card">
                <h3>${esc(item.heading || item.title || 'Service')}</h3>
                <p>${esc(item.body || item.description || '')}</p>
              </article>
            `).join('')}
          </div>
        </section>
      `;
    },
    css: `
      .services.grid-cards { padding:calc(var(--space-unit) * 3) 0; background:var(--bg); color:var(--ink); }
      .services.grid-cards > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .services h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 2); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); }
      .services-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:calc(var(--space-unit) * 1.5); }
      .service-card { background:var(--surface); border:1px solid var(--muted); border-radius:var(--radius); padding:calc(var(--space-unit) * 1.5); }
      .service-card h3 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 0.75); font-size:clamp(1.1rem,1.25vw + 0.4rem,1.25rem); color:var(--ink); }
      .service-card p { font-family:var(--font-body); margin:0; font-size:clamp(0.9rem,1vw + 0.3rem,1rem); line-height:1.5; color:var(--ink); }
    `,
  },
  'numbered-list': {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'Our services');
      const items = Array.isArray(content.items) ? content.items : [];
      const id = sectionId(content);
      return `
        <section class="services numbered-list" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading">${heading}</h2>
          <ol class="services-list">
            ${items.map((item, i) => `
              <li class="service-item"><span class="num">${i + 1}</span><div><h3>${esc(item.heading || item.title || 'Service')}</h3><p>${esc(item.body || item.description || '')}</p></div></li>
            `).join('')}
          </ol>
        </section>
      `;
    },
    css: `
      .services.numbered-list { padding:calc(var(--space-unit) * 3) 0; background:var(--surface); color:var(--ink); }
      .services.numbered-list > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .services h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 2); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); }
      .services-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:calc(var(--space-unit) * 1.25); }
      .service-item { display:flex; gap:calc(var(--space-unit) * 1.25); align-items:flex-start; }
      .num { font-family:var(--font-display); font-weight:700; font-size:clamp(1.5rem,2vw,2rem); color:var(--brand); min-width:2rem; }
      .service-item h3 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 0.5); font-size:clamp(1.1rem,1.25vw + 0.4rem,1.25rem); color:var(--ink); }
      .service-item p { font-family:var(--font-body); margin:0; font-size:clamp(0.9rem,1vw + 0.3rem,1rem); line-height:1.5; color:var(--ink); }
    `,
  },
  'alternating-rows': {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'Our services');
      const items = Array.isArray(content.items) ? content.items : [];
      const id = sectionId(content);
      return `
        <section class="services alternating-rows" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading">${heading}</h2>
          <div class="services-rows">
            ${items.map((item, i) => `
              <div class="service-row ${i % 2 === 0 ? 'row-even' : 'row-odd'}">
                <div class="row-text">
                  <h3>${esc(item.heading || item.title || 'Service')}</h3>
                  <p>${esc(item.body || item.description || '')}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      `;
    },
    css: `
      .services.alternating-rows { padding:calc(var(--space-unit) * 3) 0; background:var(--bg); color:var(--ink); }
      .services.alternating-rows > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .services h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 2); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); }
      .services-rows { display:flex; flex-direction:column; gap:calc(var(--space-unit) * 1.25); }
      .service-row { border:1px solid var(--muted); border-radius:var(--radius); padding:calc(var(--space-unit) * 1.25); background:var(--surface); }
      .service-row h3 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 0.5); font-size:clamp(1.1rem,1.25vw + 0.4rem,1.25rem); color:var(--ink); }
      .service-row p { font-family:var(--font-body); margin:0; font-size:clamp(0.9rem,1vw + 0.3rem,1rem); line-height:1.5; color:var(--ink); }
    `,
  },
};
