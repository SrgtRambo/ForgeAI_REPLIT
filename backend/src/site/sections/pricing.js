// Pricing section.
// Variants: three-tier, single-plan.

const space = (d) => ({ compact: '0.85rem', regular: '1rem', airy: '1.25rem' }[d] || '1rem');
const radius = (r) => ({ sharp: '0.25rem', soft: '0.75rem', round: '1.5rem' }[r] || '0.75rem');
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c])); }
function sectionId(content) { return `pricing-${esc((content.sectionId || 'pricing').toLowerCase().replace(/[^a-z0-9]+/g,'-'))}`; }

export const type = 'pricing';
export const variants = {
  'three-tier': {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'Pricing');
      const plans = Array.isArray(content.plans) ? content.plans : [];
      const id = sectionId(content);
      return `
        <section class="pricing three-tier" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading">${heading}</h2>
          <div class="pricing-grid">
            ${plans.map((plan) => `
              <div class="pricing-card${plan.featured ? ' featured' : ''}">
                <h3>${esc(plan.name || '')}</h3>
                <div class="price">${esc(plan.price || '')}</div>
                <p>${esc(plan.description || '')}</p>
                <ul class="plan-features">
                  ${Array.isArray(plan.features) ? plan.features.map((f) => `<li>✓ ${esc(f)}</li>`).join('') : ''}
                </ul>
                ${plan.buttonLabel ? `<a href="${esc(plan.buttonHref || '#')}" class="btn">${esc(plan.buttonLabel)}</a>` : ''}
              </div>
            `).join('')}
          </div>
        </section>
      `;
    },
    css: `
      .pricing.three-tier { padding:calc(var(--space-unit) * 3) 0; background:var(--bg); color:var(--ink); }
      .pricing.three-tier > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .pricing h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 2); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); text-align:center; }
      .pricing-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:calc(var(--space-unit) * 1.5); }
      .pricing-card { background:var(--surface); border:1px solid var(--muted); border-radius:var(--radius); padding:calc(var(--space-unit) * 1.5); text-align:center; }
      .pricing-card.featured { border-color:var(--brand); box-shadow:0 0 20px rgba(0,0,0,0.08); }
      .pricing-card h3 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 0.75); font-size:clamp(1.25rem,1.5vw + 0.5rem,1.5rem); color:var(--ink); }
      .price { font-family:var(--font-display); font-weight:700; font-size:clamp(1.75rem,3vw + 0.5rem,2.5rem); color:var(--brand); margin:0 0 calc(var(--space-unit) * 1); }
      .pricing-card p { font-family:var(--font-body); margin:0 0 calc(var(--space-unit) * 1); font-size:clamp(0.95rem,1.1vw + 0.4rem,1.1rem); line-height:1.5; color:var(--ink); }
      .plan-features { list-style:none; margin:0 0 calc(var(--space-unit) * 1.5); padding:0; text-align:left; }
      .plan-features li { font-family:var(--font-body); font-size:clamp(0.9rem,1vw + 0.3rem,1rem); margin:0 0 calc(var(--space-unit) * 0.5); color:var(--ink); }
      .btn { display:inline-block; background:var(--brand); color:#ffffff; text-decoration:none; padding:0.6rem calc(var(--space-unit) * 1.5); border-radius:var(--radius); font-family:var(--font-body); font-weight:600; font-size:clamp(0.9rem,1vw + 0.3rem,1rem); }
      .btn:focus-visible { outline:2px solid var(--brand); outline-offset:2px; }
    `,
  },
  'single-plan': {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'Pricing');
      const plan = content.plan || {};
      const id = sectionId(content);
      return `
        <section class="pricing single-plan" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading">${heading}</h2>
          <div class="single-pricing">
            <h3>${esc(plan.name || '')}</h3>
            <div class="price">${esc(plan.price || '')}</div>
            <p>${esc(plan.description || '')}</p>
            <ul class="plan-features">
              ${Array.isArray(plan.features) ? plan.features.map((f) => `<li>✓ ${esc(f)}</li>`).join('') : ''}
            </ul>
            ${plan.buttonLabel ? `<a href="${esc(plan.buttonHref || '#')}" class="btn">${esc(plan.buttonLabel)}</a>` : ''}
          </div>
        </section>
      `;
    },
    css: `
      .pricing.single-plan { padding:calc(var(--space-unit) * 3) 0; background:var(--surface); color:var(--ink); }
      .pricing.single-plan > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .pricing h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 2); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); text-align:center; }
      .single-pricing { background:var(--bg); border:1px solid var(--muted); border-radius:var(--radius); padding:calc(var(--space-unit) * 2); text-align:center; max-width:520px; margin-left:auto; margin-right:auto; }
      .single-pricing h3 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 0.75); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); }
      .price { font-family:var(--font-display); font-weight:700; font-size:clamp(2rem,4vw + 1rem,3rem); color:var(--brand); margin:0 0 calc(var(--space-unit) * 1); }
      .single-pricing p { font-family:var(--font-body); margin:0 0 calc(var(--space-unit) * 1); font-size:clamp(1rem,1.25vw + 0.5rem,1.25rem); line-height:1.6; color:var(--ink); }
      .plan-features { list-style:none; margin:0 0 calc(var(--space-unit) * 1.5); padding:0; text-align:left; display:inline-block; }
      .plan-features li { font-family:var(--font-body); font-size:clamp(0.9rem,1vw + 0.3rem,1rem); margin:0 0 calc(var(--space-unit) * 0.5); color:var(--ink); }
      .btn { display:inline-block; background:var(--brand); color:#ffffff; text-decoration:none; padding:0.6rem calc(var(--space-unit) * 1.5); border-radius:var(--radius); font-family:var(--font-body); font-weight:600; font-size:clamp(0.9rem,1vw + 0.3rem,1rem); }
      .btn:focus-visible { outline:2px solid var(--brand); outline-offset:2px; }
    `,
  },
};
