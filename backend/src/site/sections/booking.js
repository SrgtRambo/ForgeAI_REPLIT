// Booking section.
// Variant: inline-form (date, time, party or service, name, contact).
// Submissions save to localStorage and show successMessage.

const space = (d) => ({ compact: '0.85rem', regular: '1rem', airy: '1.25rem' }[d] || '1rem');
const radius = (r) => ({ sharp: '0.25rem', soft: '0.75rem', round: '1.5rem' }[r] || '0.75rem');
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c])); }
function sectionId(content) { return `booking-${esc((content.sectionId || 'booking').toLowerCase().replace(/[^a-z0-9]+/g,'-'))}`; }

export const type = 'booking';
export const variants = {
  'inline-form': {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'Book an appointment');
      const body = esc(content.body || '');
      const form = content.form || {};
      const id = sectionId(content);
      const fields = [
        { name: 'bookingDate', label: 'Date', type: 'date', required: true },
        { name: 'bookingTime', label: 'Time', type: 'time', required: true },
        { name: 'partySize', label: content.partyLabel || 'Party size', type: 'select', required: true, options: ['1','2','3','4','5','6+'] },
        { name: 'service', label: content.serviceLabel || 'Service', type: 'select', required: false, options: (content.services || []).slice(0, 8) },
        { name: 'customerName', label: 'Your name', type: 'text', required: true },
        { name: 'customerContact', label: 'Phone or email', type: 'tel', required: true },
      ];
      return `
        <section class="booking inline-form" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading">${heading}</h2>
          ${body ? `<p class="booking-body">${body}</p>` : ''}
          <form id="${id}-form" novalidate>
            ${fields.map((f) => {
              const options = f.type === 'select' && Array.isArray(f.options)
                ? f.options.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('')
                : '';
              return `<div class="form-field"><label for="${id}-${f.name}">${esc(f.label)}</label>${f.type === 'select' ? `<select id="${id}-${f.name}" name="${f.name}"${f.required ? ' required' : ''}>${options}</select>` : `<input type="${f.type}" id="${id}-${f.name}" name="${f.name}"${f.required ? ' required' : ''}>`}</div>`;
            }).join('')}
            <button type="submit" class="btn">${esc(form.submitLabel || 'Request booking')}</button>
            <p id="${id}-message" class="form-message" role="status" aria-live="polite"></p>
          </form>
          <p id="${id}-success" class="success-message" hidden>${esc(form.successMessage || 'Thanks! Your booking request has been received.')}</p>
        </section>
      `;
    },
    css: `
      .booking.inline-form { padding:calc(var(--space-unit) * 3) 0; background:var(--bg); color:var(--ink); }
      .booking.inline-form > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .booking h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 1); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); text-align:center; }
      .booking-body { font-family:var(--font-body); margin:0 auto calc(var(--space-unit) * 2); font-size:clamp(1rem,1.25vw + 0.5rem,1.25rem); line-height:1.6; color:var(--ink); max-width:60ch; text-align:center; }
      .booking form { background:var(--surface); border:1px solid var(--muted); border-radius:var(--radius); padding:calc(var(--space-unit) * 1.5); max-width:520px; margin:0 auto; }
      .form-field { display:flex; flex-direction:column; gap:calc(var(--space-unit) * 0.35); margin-bottom:calc(var(--space-unit) * 1); }
      .form-field label { font-family:var(--font-body); font-weight:600; font-size:clamp(0.9rem,1vw + 0.3rem,1rem); color:var(--ink); }
      .form-field input, .form-field select { font:inherit; padding:0.55rem; border:1px solid var(--muted); border-radius:var(--radius); background:var(--bg); color:var(--ink); font-size:clamp(0.95rem,1vw + 0.4rem,1rem); }
      .form-field input:focus-visible, .form-field select:focus-visible { outline:2px solid var(--brand); outline-offset:2px; }
      .form-message { font-family:var(--font-body); font-size:clamp(0.9rem,1vw + 0.3rem,1rem); margin-top:calc(var(--space-unit) * 0.75); min-height:1.2em; }
      .success-message { font-family:var(--font-body); font-weight:600; color:var(--brand); margin-top:calc(var(--space-unit) * 1); text-align:center; }
      .btn { display:inline-block; background:var(--brand); color:#ffffff; text-decoration:none; padding:0.6rem calc(var(--space-unit) * 1.5); border-radius:var(--radius); font-family:var(--font-body); font-weight:600; font-size:clamp(0.9rem,1vw + 0.3rem,1rem); border:none; cursor:pointer; width:100%; }
      .btn:focus-visible { outline:2px solid var(--brand); outline-offset:2px; }
    `,
  },
};
