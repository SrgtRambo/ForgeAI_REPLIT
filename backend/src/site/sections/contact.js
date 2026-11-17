// Contact section.
// Variants: form-split (form left, details right), form-centered.

const space = (d) => ({ compact: '0.85rem', regular: '1rem', airy: '1.25rem' }[d] || '1rem');
const radius = (r) => ({ sharp: '0.25rem', soft: '0.75rem', round: '1.5rem' }[r] || '0.75rem');
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c])); }
function sectionId(content) { return `contact-${esc((content.sectionId || 'contact').toLowerCase().replace(/[^a-z0-9]+/g,'-'))}`; }

export const type = 'contact';
export const variants = {
  'form-split': {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'Get in touch');
      const body = esc(content.body || '');
      const form = content.form || {};
      const id = sectionId(content);
      return `
        <section class="contact form-split" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading">${heading}</h2>
          ${body ? `<p class="contact-body">${body}</p>` : ''}
          <div class="contact-inner">
            <div class="contact-form">
              <form id="${id}-form" novalidate>
                ${renderFields(form.fields, id)}
                <button type="submit" class="btn">${esc(form.submitLabel || 'Send message')}</button>
                <p id="${id}-message" class="form-message" role="status" aria-live="polite"></p>
              </form>
            </div>
            <div class="contact-details">
              ${content.details ? `<div class="detail">${esc(content.details)}</div>` : ''}
            </div>
          </div>
          <p id="${id}-success" class="success-message" hidden>${esc(form.successMessage || 'Thanks! Your message has been sent.')}</p>
        </section>
      `;
    },
    css: `
      .contact.form-split { padding:calc(var(--space-unit) * 3) 0; background:var(--bg); color:var(--ink); }
      .contact.form-split > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .contact h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 1); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); }
      .contact-body { font-family:var(--font-body); margin:0 0 calc(var(--space-unit) * 2); font-size:clamp(1rem,1.25vw + 0.5rem,1.25rem); line-height:1.6; color:var(--ink); max-width:60ch; }
      .contact-inner { display:flex; flex-direction:column; gap:calc(var(--space-unit) * 2); }
      .contact-form { background:var(--surface); border:1px solid var(--muted); border-radius:var(--radius); padding:calc(var(--space-unit) * 1.5); }
      .form-message { font-family:var(--font-body); font-size:clamp(0.9rem,1vw + 0.3rem,1rem); margin-top:calc(var(--space-unit) * 0.75); min-height:1.2em; }
      .success-message { font-family:var(--font-body); font-weight:600; color:var(--brand); margin-top:calc(var(--space-unit) * 1); }
      @media (min-width:700px) {
        .contact-inner { flex-direction:row; }
        .contact-form { flex:1; max-width:480px; }
      }
      .btn { display:inline-block; background:var(--brand); color:#ffffff; text-decoration:none; padding:0.6rem calc(var(--space-unit) * 1.5); border-radius:var(--radius); font-family:var(--font-body); font-weight:600; font-size:clamp(0.9rem,1vw + 0.3rem,1rem); border:none; cursor:pointer; width:100%; }
      .btn:focus-visible { outline:2px solid var(--brand); outline-offset:2px; }
    `,
  },
  'form-centered': {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'Get in touch');
      const body = esc(content.body || '');
      const form = content.form || {};
      const id = sectionId(content);
      return `
        <section class="contact form-centered" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading">${heading}</h2>
          ${body ? `<p class="contact-body">${body}</p>` : ''}
          <div class="contact-form">
            <form id="${id}-form" novalidate>
              ${renderFields(form.fields, id)}
              <button type="submit" class="btn">${esc(form.submitLabel || 'Send message')}</button>
              <p id="${id}-message" class="form-message" role="status" aria-live="polite"></p>
            </form>
          </div>
          <p id="${id}-success" class="success-message" hidden>${esc(form.successMessage || 'Thanks! Your message has been sent.')}</p>
        </section>
      `;
    },
    css: `
      .contact.form-centered { padding:calc(var(--space-unit) * 3) 0; background:var(--surface); color:var(--ink); }
      .contact.form-centered > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .contact h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 1); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); text-align:center; }
      .contact-body { font-family:var(--font-body); margin:0 auto calc(var(--space-unit) * 2); font-size:clamp(1rem,1.25vw + 0.5rem,1.25rem); line-height:1.6; color:var(--ink); max-width:60ch; text-align:center; }
      .contact-form { background:var(--bg); border:1px solid var(--muted); border-radius:var(--radius); padding:calc(var(--space-unit) * 1.5); max-width:520px; margin:0 auto; }
      .form-message { font-family:var(--font-body); font-size:clamp(0.9rem,1vw + 0.3rem,1rem); margin-top:calc(var(--space-unit) * 0.75); min-height:1.2em; }
      .success-message { font-family:var(--font-body); font-weight:600; color:var(--brand); margin-top:calc(var(--space-unit) * 1); text-align:center; }
      .btn { display:inline-block; background:var(--brand); color:#ffffff; text-decoration:none; padding:0.6rem calc(var(--space-unit) * 1.5); border-radius:var(--radius); font-family:var(--font-body); font-weight:600; font-size:clamp(0.9rem,1vw + 0.3rem,1rem); border:none; cursor:pointer; width:100%; }
      .btn:focus-visible { outline:2px solid var(--brand); outline-offset:2px; }
    `,
  },
};

function renderFields(fields, id) {
  const list = Array.isArray(fields) ? fields : [];
  return list.map((field, i) => {
    const fieldId = `${id}-field-${i}`;
    const required = field.required ? ' required' : '';
    const options = field.type === 'select' && Array.isArray(field.options)
      ? field.options.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('')
      : '';
    const tag = field.type === 'textarea' ? 'textarea' : field.type === 'select' ? 'select' : 'input';
    const inputHtml = field.type === 'textarea'
      ? `<textarea id="${fieldId}" name="${esc(field.name)}"${required}>${esc(field.value || '')}</textarea>`
      : field.type === 'select'
        ? `<select id="${fieldId}" name="${esc(field.name)}"${required}>${options}</select>`
        : `<input type="${esc(field.type)}" id="${fieldId}" name="${esc(field.name)}"${required}>`;
    return `<div class="form-field"><label for="${fieldId}">${esc(field.label)}</label>${inputHtml}</div>`;
  }).join('');
}
