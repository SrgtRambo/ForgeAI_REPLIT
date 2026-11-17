// Process section.
// Variants: steps-horizontal, steps-vertical.

const space = (d) => ({ compact: '0.85rem', regular: '1rem', airy: '1.25rem' }[d] || '1rem');
const radius = (r) => ({ sharp: '0.25rem', soft: '0.75rem', round: '1.5rem' }[r] || '0.75rem');
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c])); }
function sectionId(content) { return `process-${esc((content.sectionId || 'process').toLowerCase().replace(/[^a-z0-9]+/g,'-'))}`; }

export const type = 'process';
export const variants = {
  'steps-horizontal': {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'How it works');
      const steps = Array.isArray(content.steps) ? content.steps : [];
      const id = sectionId(content);
      return `
        <section class="process steps-horizontal" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading">${heading}</h2>
          <ol class="steps">
            ${steps.map((step, i) => `
              <li class="step">
                <span class="step-num">${i + 1}</span>
                <div class="step-text"><h3>${esc(step.heading || step.title || `Step ${i + 1}`)}</h3><p>${esc(step.body || step.description || '')}</p></div>
              </li>
            `).join('')}
          </ol>
        </section>
      `;
    },
    css: `
      .process.steps-horizontal { padding:calc(var(--space-unit) * 3) 0; background:var(--bg); color:var(--ink); }
      .process.steps-horizontal > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .process h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 2); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); text-align:center; }
      .steps { display:flex; flex-wrap:wrap; justify-content:center; gap:calc(var(--space-unit) * 1.5); list-style:none; margin:0; padding:0; }
      .step { text-align:center; min-width:180px; }
      .step-num { font-family:var(--font-display); font-weight:700; font-size:clamp(1.5rem,2vw,2rem); color:var(--brand); display:block; margin-bottom:calc(var(--space-unit) * 0.75); }
      .step h3 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 0.5); font-size:clamp(1.1rem,1.25vw + 0.4rem,1.25rem); color:var(--ink); }
      .step p { font-family:var(--font-body); margin:0; font-size:clamp(0.9rem,1vw + 0.3rem,1rem); line-height:1.5; color:var(--ink); }
    `,
  },
  'steps-vertical': {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'How it works');
      const steps = Array.isArray(content.steps) ? content.steps : [];
      const id = sectionId(content);
      return `
        <section class="process steps-vertical" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading">${heading}</h2>
          <ol class="steps-vert">
            ${steps.map((step, i) => `
              <li class="step-vert">
                <span class="step-num">${i + 1}</span>
                <div class="step-text"><h3>${esc(step.heading || step.title || `Step ${i + 1}`)}</h3><p>${esc(step.body || step.description || '')}</p></div>
              </li>
            `).join('')}
          </ol>
        </section>
      `;
    },
    css: `
      .process.steps-vertical { padding:calc(var(--space-unit) * 3) 0; background:var(--surface); color:var(--ink); }
      .process.steps-vertical > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .process h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 2); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); }
      .steps-vert { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:calc(var(--space-unit) * 1.5); }
      .step-vert { display:flex; gap:calc(var(--space-unit) * 1.25); align-items:flex-start; border-bottom:1px solid var(--muted); padding-bottom:calc(var(--space-unit) * 1); }
      .step-num { font-family:var(--font-display); font-weight:700; font-size:clamp(1.5rem,2vw,2rem); color:var(--brand); min-width:2rem; flex-shrink:0; }
      .step-vert h3 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 0.5); font-size:clamp(1.1rem,1.25vw + 0.4rem,1.25rem); color:var(--ink); }
      .step-vert p { font-family:var(--font-body); margin:0; font-size:clamp(0.9rem,1vw + 0.3rem,1rem); line-height:1.5; color:var(--ink); }
    `,
  },
};
