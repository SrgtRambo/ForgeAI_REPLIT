// Testimonials section.
// Variants: quote-large, cards. Only generated when quotes are supplied.

const space = (d) => ({ compact: '0.85rem', regular: '1rem', airy: '1.25rem' }[d] || '1rem');
const radius = (r) => ({ sharp: '0.25rem', soft: '0.75rem', round: '1.5rem' }[r] || '0.75rem');
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c])); }
function sectionId(content) { return `testimonials-${esc((content.sectionId || 'testimonials').toLowerCase().replace(/[^a-z0-9]+/g,'-'))}`; }

export const type = 'testimonials';
export const variants = {
  'quote-large': {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'What people say');
      const quotes = Array.isArray(content.quotes) ? content.quotes : [];
      if (!quotes.length) return '';
      const id = sectionId(content);
      return `
        <section class="testimonials quote-large" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading">${heading}</h2>
          <div class="testimonials-wrap">
            ${quotes.map((q) => `<blockquote class="quote"><p>${esc(q.text || q.quote || '')}</p><p class="quote-author">${esc(q.name || '')}${q.role ? `, ${esc(q.role)}` : ''}</p></blockquote>`).join('')}
          </div>
        </section>
      `;
    },
    css: `
      .testimonials.quote-large { padding:calc(var(--space-unit) * 3) 0; background:var(--surface); color:var(--ink); }
      .testimonials.quote-large > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .testimonials h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 2); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); text-align:center; }
      .testimonials-wrap { display:flex; flex-direction:column; gap:calc(var(--space-unit) * 1.5); }
      blockquote.quote { margin:0; padding:calc(var(--space-unit) * 1.5); border-left:4px solid var(--brand); background:var(--bg); border-radius:0 var(--radius) var(--radius) 0; }
      blockquote.quote p { font-family:var(--font-display); font-style:italic; margin:0 0 calc(var(--space-unit) * 0.75); font-size:clamp(1.1rem,1.25vw + 0.4rem,1.25rem); color:var(--ink); }
      .quote-author { font-family:var(--font-body); margin:0; font-size:clamp(0.9rem,1vw + 0.3rem,1rem); color:var(--muted); }
    `,
  },
  cards: {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'What people say');
      const quotes = Array.isArray(content.quotes) ? content.quotes : [];
      if (!quotes.length) return '';
      const id = sectionId(content);
      return `
        <section class="testimonials cards" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading">${heading}</h2>
          <div class="testimonials-grid">
            ${quotes.map((q) => `
              <article class="testimonial-card">
                <p class="testimonial-text">${esc(q.text || q.quote || '')}</p>
                <p class="testimonial-author">${esc(q.name || '')}</p>
                ${q.role ? `<p class="testimonial-role">${esc(q.role)}</p>` : ''}
              </article>
            `).join('')}
          </div>
        </section>
      `;
    },
    css: `
      .testimonials.cards { padding:calc(var(--space-unit) * 3) 0; background:var(--bg); color:var(--ink); }
      .testimonials.cards > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .testimonials h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 2); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); text-align:center; }
      .testimonials-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:calc(var(--space-unit) * 1.5); }
      .testimonial-card { background:var(--surface); border:1px solid var(--muted); border-radius:var(--radius); padding:calc(var(--space-unit) * 1.5); }
      .testimonial-text { font-family:var(--font-body); font-style:italic; margin:0 0 calc(var(--space-unit) * 1); font-size:clamp(0.95rem,1.1vw + 0.4rem,1.1rem); line-height:1.5; color:var(--ink); }
      .testimonial-author { font-family:var(--font-display); margin:0 0 0.25rem; font-size:clamp(1rem,1vw + 0.4rem,1.1rem); color:var(--ink); }
      .testimonial-role { font-family:var(--font-body); margin:0; font-size:clamp(0.85rem,1vw + 0.25rem,0.95rem); color:var(--muted); }
    `,
  },
};
