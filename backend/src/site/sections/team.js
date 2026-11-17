// Team section.
// Variants: initial-cards, photo-cards (photo-cards requires photoImageId for each member; falls back to initial-cards).
// Stock photos are never used as staff portraits — missing photos show initials avatars with "Add your team photos".

const space = (d) => ({ compact: '0.85rem', regular: '1rem', airy: '1.25rem' }[d] || '1rem');
const radius = (r) => ({ sharp: '0.25rem', soft: '0.75rem', round: '1.5rem' }[r] || '0.75rem');
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c])); }
function imgUrl(ctx, id) { return (ctx.images && ctx.images[id]) || ''; }
function initials(name) { return String(name ?? '').split(/\s+/).map((w) => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '?'; }
function sectionId(content) { return `team-${esc((content.sectionId || 'team').toLowerCase().replace(/[^a-z0-9]+/g,'-'))}`; }

export const type = 'team';
export const variants = {
  'initial-cards': {
    render(ctx) {
      const { content, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'Meet the team');
      const members = Array.isArray(content.members) ? content.members : [];
      const id = sectionId(content);
      return `
        <section class="team initial-cards" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading">${heading}</h2>
          <div class="team-grid">
            ${members.map((m) => `
              <article class="team-card">
                <div class="avatar initials" aria-hidden="true">${initials(m.name)}</div>
                <h3>${esc(m.name || '')}</h3>
                <p class="role">${esc(m.role || '')}</p>
                ${m.bio ? `<p class="bio">${esc(m.bio)}</p>` : ''}
              </article>
            `).join('')}
            ${members.length === 0 ? `<p class="team-note">Add your team photos.</p>` : ''}
          </div>
        </section>
      `;
    },
    css: `
      .team.initial-cards { padding:calc(var(--space-unit) * 3) 0; background:var(--bg); color:var(--ink); }
      .team.initial-cards > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .team h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 2); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); text-align:center; }
      .team-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:calc(var(--space-unit) * 1.5); }
      .team-card { text-align:center; background:var(--surface); border:1px solid var(--muted); border-radius:var(--radius); padding:calc(var(--space-unit) * 1.25); }
      .avatar { width:72px; height:72px; border-radius:50%; background:var(--brand); color:#ffffff; font-family:var(--font-display); font-weight:700; font-size:clamp(1.5rem,2vw,2rem); display:flex; align-items:center; justify-content:center; margin:0 auto calc(var(--space-unit) * 0.75); }
      .team-card h3 { font-family:var(--font-display); margin:0 0 0.25rem; font-size:clamp(1.1rem,1.25vw + 0.4rem,1.25rem); color:var(--ink); }
      .role { font-family:var(--font-body); margin:0 0 calc(var(--space-unit) * 0.75); font-size:clamp(0.9rem,1vw + 0.3rem,1rem); color:var(--muted); }
      .bio { font-family:var(--font-body); margin:0; font-size:clamp(0.85rem,1vw + 0.25rem,0.95rem); line-height:1.5; color:var(--ink); }
      .team-note { grid-column:1/-1; text-align:center; color:var(--muted); font-family:var(--font-body); font-size:clamp(0.9rem,1vw + 0.3rem,1rem); }
    `,
  },
  'photo-cards': {
    render(ctx) {
      const { content, images, density, radius: rad } = ctx;
      const heading = esc(content.heading || 'Meet the team');
      const members = Array.isArray(content.members) ? content.members : [];
      const allHavePhotos = members.every((m) => m.photoImageId && images && images[m.photoImageId]);
      const id = sectionId(content);
      if (!allHavePhotos) {
        // Fall back to initial-cards when any member lacks a real photo.
        return variants['initial-cards'].render(ctx);
      }
      return `
        <section class="team photo-cards" style="--space-unit:${space(density)};--radius:${radius(rad)};" aria-labelledby="${id}-heading">
          <h2 id="${id}-heading">${heading}</h2>
          <div class="team-grid">
            ${members.map((m) => {
              const url = imgUrl(ctx, m.photoImageId);
              const alt = esc(m.photoAlt || m.name || 'Team member');
              return `
                <article class="team-card">
                  <div class="avatar photo"><img src="${esc(url)}" alt="${alt}" loading="lazy" decoding="async"></div>
                  <h3>${esc(m.name || '')}</h3>
                  <p class="role">${esc(m.role || '')}</p>
                  ${m.bio ? `<p class="bio">${esc(m.bio)}</p>` : ''}
                </article>
              `;
            }).join('')}
          </div>
        </section>
      `;
    },
    css: `
      .team.photo-cards { padding:calc(var(--space-unit) * 3) 0; background:var(--bg); color:var(--ink); }
      .team.photo-cards > * { max-width:1120px; margin:0 auto; padding:0 var(--space-unit); }
      .team h2 { font-family:var(--font-display); margin:0 0 calc(var(--space-unit) * 2); font-size:clamp(1.5rem,2vw + 0.75rem,2rem); color:var(--ink); text-align:center; }
      .team-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:calc(var(--space-unit) * 1.5); }
      .team-card { text-align:center; background:var(--surface); border:1px solid var(--muted); border-radius:var(--radius); padding:calc(var(--space-unit) * 1.25); }
      .avatar.photo { width:72px; height:72px; border-radius:50%; overflow:hidden; background:var(--surface); margin:0 auto calc(var(--space-unit) * 0.75); border:2px solid var(--brand); }
      .avatar.photo img { width:100%; height:100%; object-fit:cover; display:block; border-radius:50%; }
      .team-card h3 { font-family:var(--font-display); margin:0 0 0.25rem; font-size:clamp(1.1rem,1.25vw + 0.4rem,1.25rem); color:var(--ink); }
      .role { font-family:var(--font-body); margin:0 0 calc(var(--space-unit) * 0.75); font-size:clamp(0.9rem,1vw + 0.3rem,1rem); color:var(--muted); }
      .bio { font-family:var(--font-body); margin:0; font-size:clamp(0.85rem,1vw + 0.25rem,0.95rem); line-height:1.5; color:var(--ink); }
    `,
  },
};
