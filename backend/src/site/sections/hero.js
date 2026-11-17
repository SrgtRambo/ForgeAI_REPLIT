// Hero section.
// Variants: split-image (text left, image right), full-bleed (image background, text overlay with scrim), editorial (large heading, offset image, stat row).

const space = (d) => ({ compact: '0.85rem', regular: '1rem', airy: '1.25rem' }[d] || '1rem');
const radius = (r) => ({ sharp: '0.25rem', soft: '0.75rem', round: '1.5rem' }[r] || '0.75rem');
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c])); }
function imgUrl(ctx, id) { return (ctx.images && ctx.images[id]) || ''; }

export const type = 'hero';
export const variants = {
  'split-image': {
    render(ctx) {
      const { content, palette, density, radius: rad, motion } = ctx;
      const heading = esc(content.heading || 'Your business, online.');
      const body = esc(content.body || '');
      const imageId = content.imageId || '';
      const url = imgUrl(ctx, imageId);
      const alt = esc(content.imageAlt || '');
      const hasImage = Boolean(url && alt);
      return `
        <section class="hero split-image" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="hero-heading">
          <h1 id="hero-heading">${heading}</h1>
          ${body ? `<p class="hero-body">${body}</p>` : ''}
          ${hasImage ? `<div class="hero-image"><img src="${esc(url)}" alt="${alt}" loading="lazy" decoding="async"></div>` : ''}
        </section>
      `;
    },
    css: `
      .hero.split-image { padding:calc(var(--space-unit) * 3) 0; background:var(--bg); color:var(--ink); }
      .hero.split-image > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .hero h1 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 1.25); font-size:clamp(1.75rem,3vw + 1rem,3rem); line-height:1.15; color:var(--ink); }
      .hero-body { font-family:var(--font-body); margin:0 0 calc(var(--space-unit) * 2); font-size:clamp(1rem,1.25vw + 0.5rem,1.25rem); line-height:1.6; color:var(--ink); max-width:60ch; }
      .hero-image { margin-top:calc(var(--space-unit) * 2); border-radius:var(--radius); overflow:hidden; background:var(--surface); }
      .hero-image img { width:100%; height:auto; display:block; border-radius:var(--radius); }
      @media (min-width:700px) {
        .hero.split-image { display:grid; grid-template-columns:1fr 1fr; gap:calc(var(--space-unit) * 2); align-items:center; }
        .hero-image { margin-top:0; }
      }
    `,
  },
  'full-bleed': {
    render(ctx) {
      const { content, palette, density, radius: rad, motion } = ctx;
      const heading = esc(content.heading || 'Your business, online.');
      const body = esc(content.body || '');
      const imageId = content.imageId || '';
      const url = imgUrl(ctx, imageId);
      const alt = esc(content.imageAlt || '');
      const hasImage = Boolean(url && alt);
      return `
        <section class="hero full-bleed" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="hero-heading">
          ${hasImage ? `<div class="hero-bg"><img src="${esc(url)}" alt="${alt}" loading="lazy" decoding="async"></div>` : ''}
          <div class="hero-content">
            <h1 id="hero-heading">${heading}</h1>
            ${body ? `<p class="hero-body">${body}</p>` : ''}
          </div>
        </section>
      `;
    },
    css: `
      .hero.full-bleed { position:relative; padding:0; overflow:hidden; background:var(--surface); color:var(--ink); }
      .hero-bg { position:absolute; inset:0; z-index:0; }
      .hero-bg img { width:100%; height:100%; object-fit:cover; display:block; }
      .hero-bg::after { content:''; position:absolute; inset:0; background:rgba(0,0,0,0.35); }
      .hero-content { position:relative; z-index:1; padding:calc(var(--space-unit) * 4) var(--space-unit); max-width:1120px; margin:0 auto; text-align:center; }
      .hero-content h1 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 1.25); font-size:clamp(1.75rem,3vw + 1rem,3rem); line-height:1.15; color:#ffffff; }
      .hero-body { font-family:var(--font-body); margin:0 auto calc(var(--space-unit) * 2); font-size:clamp(1rem,1.25vw + 0.5rem,1.25rem); line-height:1.6; color:#ffffff; max-width:60ch; }
    `,
  },
  editorial: {
    render(ctx) {
      const { content, palette, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'Your business, online.');
      const body = esc(content.body || '');
      const stat = esc(content.stat || '');
      const statLabel = esc(content.statLabel || '');
      const imageId = content.imageId || '';
      const url = imgUrl(ctx, imageId);
      const alt = esc(content.imageAlt || '');
      const hasImage = Boolean(url && alt);
      return `
        <section class="hero editorial" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="hero-heading">
          <h1 id="hero-heading">${heading}</h1>
          ${body ? `<p class="hero-body">${body}</p>` : ''}
          ${stat ? `<div class="hero-stat"><strong>${stat}</strong><span>${statLabel}</span></div>` : ''}
          ${hasImage ? `<div class="hero-image"><img src="${esc(url)}" alt="${alt}" loading="lazy" decoding="async"></div>` : ''}
        </section>
      `;
    },
    css: `
      .hero.editorial { padding:calc(var(--space-unit) * 3) 0; background:var(--bg); color:var(--ink); }
      .hero.editorial > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .hero h1 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 1.25); font-size:clamp(2rem,4vw + 1rem,3.5rem); line-height:1.1; color:var(--ink); }
      .hero-body { font-family:var(--font-body); margin:0 0 calc(var(--space-unit) * 1.5); font-size:clamp(1rem,1.25vw + 0.5rem,1.25rem); line-height:1.6; color:var(--ink); max-width:55ch; }
      .hero-stat { margin:calc(var(--space-unit) * 2) 0; padding:calc(var(--space-unit) * 1.25); background:var(--surface); border-radius:var(--radius); text-align:center; }
      .hero-stat strong { font-family:var(--font-display); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--brand); display:block; }
      .hero-stat span { font-family:var(--font-body); color:var(--muted); font-size:clamp(0.85rem,1vw + 0.25rem,1rem); }
      .hero-image { margin-top:calc(var(--space-unit) * 2); border-radius:var(--radius); overflow:hidden; background:var(--surface); }
      .hero-image img { width:100%; height:auto; display:block; border-radius:var(--radius); }
      @media (min-width:700px) {
        .hero.editorial { display:grid; grid-template-columns:1fr 320px; gap:calc(var(--space-unit) * 3); align-items:start; }
        .hero-image { margin-top:0; }
      }
    `,
  },
};
