// Feature section.
// Variants: image-left, image-right, stacked.

const space = (d) => ({ compact: '0.85rem', regular: '1rem', airy: '1.25rem' }[d] || '1rem');
const radius = (r) => ({ sharp: '0.25rem', soft: '0.75rem', round: '1.5rem' }[r] || '0.75rem');
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c])); }
function imgUrl(ctx, id) { return (ctx.images && ctx.images[id]) || ''; }
function sectionId(content) { return `feature-${esc((content.sectionId || 'feature').toLowerCase().replace(/[^a-z0-9]+/g,'-'))}`; }

export const type = 'feature';
export const variants = {
  'image-left': {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || '');
      const body = esc(content.body || '');
      const imageId = content.imageId || '';
      const url = imgUrl(ctx, imageId);
      const alt = esc(content.imageAlt || '');
      const hasImage = Boolean(url && alt);
      const id = sectionId(content);
      return `
        <section class="feature image-left" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <div class="feature-inner">
            ${hasImage ? `<div class="feature-image"><img src="${esc(url)}" alt="${alt}" loading="lazy" decoding="async"></div>` : ''}
            <div class="feature-text">
              <h2 id="${id}-heading">${heading}</h2>
              ${body ? `<p>${body}</p>` : ''}
            </div>
          </div>
        </section>
      `;
    },
    css: `
      .feature.image-left { padding:calc(var(--space-unit) * 3) 0; background:var(--bg); color:var(--ink); }
      .feature.image-left > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .feature-inner { display:flex; flex-direction:column; gap:calc(var(--space-unit) * 2); align-items:center; }
      .feature-image { border-radius:var(--radius); overflow:hidden; background:var(--surface); width:100%; max-width:480px; }
      .feature-image img { width:100%; height:auto; display:block; border-radius:var(--radius); }
      .feature-text { text-align:center; }
      .feature-text h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 1); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); }
      .feature-text p { font-family:var(--font-body); margin:0; font-size:clamp(1rem,1.25vw + 0.5rem,1.25rem); line-height:1.6; color:var(--ink); max-width:60ch; }
      @media (min-width:700px) {
        .feature-inner { flex-direction:row; text-align:left; }
        .feature-text { max-width:55ch; }
      }
    `,
  },
  'image-right': {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || '');
      const body = esc(content.body || '');
      const imageId = content.imageId || '';
      const url = imgUrl(ctx, imageId);
      const alt = esc(content.imageAlt || '');
      const hasImage = Boolean(url && alt);
      const id = sectionId(content);
      return `
        <section class="feature image-right" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <div class="feature-inner">
            <div class="feature-text">
              <h2 id="${id}-heading">${heading}</h2>
              ${body ? `<p>${body}</p>` : ''}
            </div>
            ${hasImage ? `<div class="feature-image"><img src="${esc(url)}" alt="${alt}" loading="lazy" decoding="async"></div>` : ''}
          </div>
        </section>
      `;
    },
    css: `
      .feature.image-right { padding:calc(var(--space-unit) * 3) 0; background:var(--surface); color:var(--ink); }
      .feature.image-right > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .feature-inner { display:flex; flex-direction:column; gap:calc(var(--space-unit) * 2); align-items:center; }
      .feature-image { border-radius:var(--radius); overflow:hidden; background:var(--bg); width:100%; max-width:480px; }
      .feature-image img { width:100%; height:auto; display:block; border-radius:var(--radius); }
      .feature-text { text-align:center; }
      .feature-text h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 1); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); }
      .feature-text p { font-family:var(--font-body); margin:0; font-size:clamp(1rem,1.25vw + 0.5rem,1.25rem); line-height:1.6; color:var(--ink); max-width:60ch; }
      @media (min-width:700px) {
        .feature-inner { flex-direction:row-reverse; text-align:left; }
        .feature-text { max-width:55ch; }
      }
    `,
  },
  stacked: {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || '');
      const body = esc(content.body || '');
      const imageId = content.imageId || '';
      const url = imgUrl(ctx, imageId);
      const alt = esc(content.imageAlt || '');
      const hasImage = Boolean(url && alt);
      const id = sectionId(content);
      return `
        <section class="feature stacked" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <div class="feature-inner">
            <div class="feature-text">
              <h2 id="${id}-heading">${heading}</h2>
              ${body ? `<p>${body}</p>` : ''}
            </div>
            ${hasImage ? `<div class="feature-image"><img src="${esc(url)}" alt="${alt}" loading="lazy" decoding="async"></div>` : ''}
          </div>
        </section>
      `;
    },
    css: `
      .feature.stacked { padding:calc(var(--space-unit) * 3) 0; background:var(--bg); color:var(--ink); }
      .feature.stacked > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .feature-inner { display:flex; flex-direction:column; gap:calc(var(--space-unit) * 2); align-items:center; }
      .feature-image { border-radius:var(--radius); overflow:hidden; background:var(--surface); width:100%; max-width:480px; }
      .feature-image img { width:100%; height:auto; display:block; border-radius:var(--radius); }
      .feature-text { text-align:center; }
      .feature-text h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 1); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); }
      .feature-text p { font-family:var(--font-body); margin:0; font-size:clamp(1rem,1.25vw + 0.5rem,1.25rem); line-height:1.6; color:var(--ink); max-width:60ch; }
    `,
  },
};
