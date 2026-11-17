// Gallery section.
// Variants: masonry, grid.

const space = (d) => ({ compact: '0.85rem', regular: '1rem', airy: '1.25rem' }[d] || '1rem');
const radius = (r) => ({ sharp: '0.25rem', soft: '0.75rem', round: '1.5rem' }[r] || '0.75rem');
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c])); }
function imgUrl(ctx, id) { return (ctx.images && ctx.images[id]) || ''; }
function sectionId(content) { return `gallery-${esc((content.sectionId || 'gallery').toLowerCase().replace(/[^a-z0-9]+/g,'-'))}`; }

export const type = 'gallery';
export const variants = {
  masonry: {
    render(ctx) {
      const { content, images, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'Gallery');
      const items = Array.isArray(content.items) ? content.items : [];
      const id = sectionId(content);
      return `
        <section class="gallery masonry" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading">${heading}</h2>
          <div class="gallery-masonry">
            ${items.map((item) => {
              const url = imgUrl(ctx, item.imageId);
              const alt = esc(item.alt || '');
              return `<figure class="gallery-item"><img src="${esc(url)}" alt="${alt}" loading="lazy" decoding="async"><figcaption>${esc(item.caption || '')}</figcaption></figure>`;
            }).join('')}
          </div>
        </section>
      `;
    },
    css: `
      .gallery.masonry { padding:calc(var(--space-unit) * 3) 0; background:var(--bg); color:var(--ink); }
      .gallery.masonry > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .gallery h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 2); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); text-align:center; }
      .gallery-masonry { column-count:2; column-gap:calc(var(--space-unit) * 1); }
      .gallery-item { display:inline-block; width:100%; margin-bottom:calc(var(--space-unit) * 1); break-inside:avoid; }
      .gallery-item img { width:100%; height:auto; display:block; border-radius:var(--radius); background:var(--surface); }
      .gallery-item figcaption { font-family:var(--font-body); margin:calc(var(--space-unit) * 0.5) 0 0; font-size:clamp(0.85rem,1vw + 0.25rem,0.95rem); color:var(--muted); }
      @media (min-width:700px) { .gallery-masonry { column-count:3; } }
    `,
  },
  grid: {
    render(ctx) {
      const { content, images, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'Gallery');
      const items = Array.isArray(content.items) ? content.items : [];
      const id = sectionId(content);
      return `
        <section class="gallery grid" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading">${heading}</h2>
          <div class="gallery-grid">
            ${items.map((item) => {
              const url = imgUrl(ctx, item.imageId);
              const alt = esc(item.alt || '');
              return `<figure class="gallery-item"><img src="${esc(url)}" alt="${alt}" loading="lazy" decoding="async"><figcaption>${esc(item.caption || '')}</figcaption></figure>`;
            }).join('')}
          </div>
        </section>
      `;
    },
    css: `
      .gallery.grid { padding:calc(var(--space-unit) * 3) 0; background:var(--surface); color:var(--ink); }
      .gallery.grid > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .gallery h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 2); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); text-align:center; }
      .gallery-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:calc(var(--space-unit) * 1); }
      .gallery-item { border-radius:var(--radius); overflow:hidden; background:var(--bg); }
      .gallery-item img { width:100%; height:auto; display:block; border-radius:var(--radius); }
      .gallery-item figcaption { font-family:var(--font-body); margin:calc(var(--space-unit) * 0.5) 0 0; font-size:clamp(0.85rem,1vw + 0.25rem,0.95rem); color:var(--muted); }
    `,
  },
};
