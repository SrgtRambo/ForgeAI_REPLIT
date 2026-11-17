// Navigation section.
// Variants: split (logo left, links + CTA right), centered (logo above links), minimal (logo + one CTA).

const space = (d) => ({ compact: '0.85rem', regular: '1rem', airy: '1.25rem' }[d] || '1rem');
const radius = (r) => ({ sharp: '0.25rem', soft: '0.75rem', round: '1.5rem' }[r] || '0.75rem');

function navLinks(ctx) {
  const { content, palette } = ctx;
  const links = Array.isArray(content.links) ? content.links : [];
  const cta = content.ctaLabel ? `<a href="${content.ctaHref || '#'}" class="nav-cta">${esc(content.ctaLabel)}</a>` : '';
  return `
    <nav class="nav-links" aria-label="Primary navigation">
      ${links.map((l) => `<a href="${esc(l.href || '#')}">${esc(l.label)}</a>`).join('')}
    </nav>
    ${cta}
  `;
}

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c])); }

export const type = 'nav';
export const variants = {
  split: {
    render(ctx) {
      const { content, palette, density, radius: rad } = ctx;
      const brand = esc(content.brand || ctx.content.businessName || 'Forge AI');
      return `
        <section class="nav-section split" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="nav-heading">
          <h2 id="nav-heading" class="sr-only">Primary navigation</h2>
          <div class="nav-inner">
            <div class="nav-brand">${brand}</div>
            ${navLinks(ctx)}
          </div>
        </section>
      `;
    },
    css: `
      .nav-section { display:flex; align-items:center; padding:calc(var(--space-unit) * 1.5) 0; border-bottom:1px solid var(--muted); background:var(--surface); }
      .nav-inner { display:flex; align-items:center; justify-content:space-between; max-width:1120px; margin:0 auto; padding:0 var(--space-unit); gap:var(--space-unit); }
      .nav-brand { font-family:var(--font-display); font-weight:700; color:var(--ink); font-size:clamp(1.25rem,1.5vw + 0.5rem,1.75rem); text-decoration:none; }
      .nav-links { display:flex; gap:calc(var(--space-unit) * 1.5); align-items:center; list-style:none; margin:0; padding:0; }
      .nav-links a { color:var(--ink); text-decoration:none; font-family:var(--font-body); font-size:clamp(0.9rem,1vw + 0.5rem,1.05rem); }
      .nav-links a:focus-visible { outline:2px solid var(--brand); outline-offset:2px; border-radius:var(--radius); }
      .nav-cta { background:var(--brand); color:#ffffff; padding:0.5rem calc(var(--space-unit) * 1.5); border-radius:var(--radius); text-decoration:none; font-family:var(--font-body); font-weight:600; font-size:clamp(0.85rem,1vw + 0.25rem,1rem); }
      .nav-cta:focus-visible { outline:2px solid var(--brand); outline-offset:2px; }
    `,
  },
  centered: {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const brand = esc(content.brand || ctx.content.businessName || 'Forge AI');
      return `
        <section class="nav-section centered" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="nav-heading">
          <h2 id="nav-heading" class="sr-only">Primary navigation</h2>
          <div class="nav-inner centered-inner">
            <div class="nav-brand">${brand}</div>
          </div>
          ${navLinks(ctx)}
        </section>
      `;
    },
    css: `
      .nav-section.centered { text-align:center; padding:calc(var(--space-unit) * 1.5) 0; border-bottom:1px solid var(--muted); background:var(--surface); }
      .centered-inner { max-width:1120px; margin:0 auto calc(var(--space-unit) * 1.5); padding:0 var(--space-unit); }
      .nav-brand { font-family:var(--font-display); font-weight:700; color:var(--ink); font-size:clamp(1.25rem,1.5vw + 0.5rem,1.75rem); margin-bottom:calc(var(--space-unit) * 0.75); display:block; }
      .nav-links { justify-content:center; gap:calc(var(--space-unit) * 1.5); flex-wrap:wrap; }
      .nav-links a { color:var(--ink); text-decoration:none; font-family:var(--font-body); font-size:clamp(0.9rem,1vw + 0.5rem,1.05rem); }
      .nav-links a:focus-visible { outline:2px solid var(--brand); outline-offset:2px; border-radius:var(--radius); }
    `,
  },
  minimal: {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const brand = esc(content.brand || ctx.content.businessName || 'Forge AI');
      const ctaLabel = esc(content.ctaLabel || 'Contact');
      const ctaHref = esc(content.ctaHref || '#');
      return `
        <section class="nav-section minimal" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="nav-heading">
          <h2 id="nav-heading" class="sr-only">Primary navigation</h2>
          <div class="nav-inner minimal-inner">
            <div class="nav-brand">${brand}</div>
            <a href="${ctaHref}" class="nav-cta">${ctaLabel}</a>
          </div>
        </section>
      `;
    },
    css: `
      .nav-section.minimal { padding:calc(var(--space-unit) * 1.25) 0; border-bottom:1px solid var(--muted); background:var(--surface); }
      .minimal-inner { display:flex; align-items:center; justify-content:space-between; max-width:1120px; margin:0 auto; padding:0 var(--space-unit); gap:var(--space-unit); }
      .nav-brand { font-family:var(--font-display); font-weight:700; color:var(--ink); font-size:clamp(1.25rem,1.5vw + 0.5rem,1.75rem); text-decoration:none; }
      .nav-cta { color:var(--brand); text-decoration:none; font-family:var(--font-body); font-weight:600; font-size:clamp(0.9rem,1vw + 0.5rem,1rem); border:1px solid var(--brand); padding:0.4rem calc(var(--space-unit) * 1.25); border-radius:var(--radius); }
      .nav-cta:focus-visible { outline:2px solid var(--brand); outline-offset:2px; }
    `,
  },
};
