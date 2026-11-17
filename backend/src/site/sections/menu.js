// Menu section (restaurant only).
// Variants: categories-tabs, two-column-list.

const space = (d) => ({ compact: '0.85rem', regular: '1rem', airy: '1.25rem' }[d] || '1rem');
const radius = (r) => ({ sharp: '0.25rem', soft: '0.75rem', round: '1.5rem' }[r] || '0.75rem');
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c])); }
function sectionId(content) { return `menu-${esc((content.sectionId || 'menu').toLowerCase().replace(/[^a-z0-9]+/g,'-'))}`; }

export const type = 'menu';
export const variants = {
  'categories-tabs': {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'Menu');
      const categories = Array.isArray(content.categories) ? content.categories : [];
      const id = sectionId(content);
      return `
        <section class="menu categories-tabs" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading">${heading}</h2>
          <div class="menu-categories">
            ${categories.map((cat) => `
              <div class="menu-category">
                <h3>${esc(cat.label || '')}</h3>
                <ul class="menu-items">
                  ${Array.isArray(cat.items) ? cat.items.map((it) => `<li><span>${esc(it.name || '')}</span><span>${esc(it.price || '')}</span><p>${esc(it.description || '')}</p></li>`).join('') : ''}
                </ul>
              </div>
            `).join('')}
          </div>
        </section>
      `;
    },
    css: `
      .menu.categories-tabs { padding:calc(var(--space-unit) * 3) 0; background:var(--bg); color:var(--ink); }
      .menu.categories-tabs > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .menu h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 2); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); text-align:center; }
      .menu-categories { display:flex; flex-wrap:wrap; gap:calc(var(--space-unit) * 1.5); justify-content:center; }
      .menu-category { min-width:240px; }
      .menu-category h3 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 1); font-size:clamp(1.25rem,1.5vw + 0.5rem,1.5rem); color:var(--brand); border-bottom:2px solid var(--brand); padding-bottom:calc(var(--space-unit) * 0.5); }
      .menu-items { list-style:none; margin:0; padding:0; }
      .menu-items li { display:flex; justify-content:space-between; gap:calc(var(--space-unit) * 1); border-bottom:1px solid var(--muted); padding:calc(var(--space-unit) * 0.75) 0; font-family:var(--font-body); font-size:clamp(0.95rem,1.1vw + 0.4rem,1.1rem); }
      .menu-items li:last-child { border-bottom:none; }
    `,
  },
  'two-column-list': {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'Menu');
      const items = Array.isArray(content.items) ? content.items : [];
      const id = sectionId(content);
      return `
        <section class="menu two-column-list" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading">${heading}</h2>
          <ul class="menu-list">
            ${items.map((it) => `
              <li class="menu-item"><span class="item-name">${esc(it.name || '')}</span><span class="item-price">${esc(it.price || '')}</span><p>${esc(it.description || '')}</p></li>
            `).join('')}
          </ul>
        </section>
      `;
    },
    css: `
      .menu.two-column-list { padding:calc(var(--space-unit) * 3) 0; background:var(--surface); color:var(--ink); }
      .menu.two-column-list > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .menu h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 2); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); text-align:center; }
      .menu-list { list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:calc(var(--space-unit) * 1.5); }
      .menu-item { background:var(--bg); border:1px solid var(--muted); border-radius:var(--radius); padding:calc(var(--space-unit) * 1); }
      .item-name { font-family:var(--font-display); font-size:clamp(1.1rem,1.25vw + 0.4rem,1.25rem); color:var(--ink); }
      .item-price { font-family:var(--font-display); font-weight:700; color:var(--brand); }
      .menu-item p { font-family:var(--font-body); margin:calc(var(--space-unit) * 0.5) 0 0; font-size:clamp(0.9rem,1vw + 0.3rem,1rem); line-height:1.5; color:var(--muted); }
    `,
  },
};
