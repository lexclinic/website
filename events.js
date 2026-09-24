/*
  LexClinic Education Platform — Live Google Calendar Events & Privacy Renderer
  Build Version: 20260829_2440
*/

document.addEventListener('DOMContentLoaded', async () => {
  const upcomingContainer = document.getElementById('upcoming-sessions-grid');
  if (!upcomingContainer) return;

  try {
    const response = await fetch('/events.json?v=20260829_2440');
    if (!response.ok) return;
    const events = await response.json();

    // Limit display to the NEXT THREE upcoming events only
    const upcomingEvents = events.filter(e => e.is_upcoming).slice(0, 3);
    if (!upcomingEvents || upcomingEvents.length === 0) return;

    const userEmail = window.getSanitizedEmail ? window.getSanitizedEmail() : "";
    const isLexClinicMember = userEmail.toLowerCase().endsWith("@lex.clinic");

    let html = '';

    upcomingEvents.forEach((item, index) => {
      const isNextUp = index === 0;
      const isDirectorCall = item.is_private;
      const meetUrl = item.meet_url;
      const calUrl = item.url;

      const cardStyle = isNextUp 
        ? 'border: 2px solid var(--accent-gold); background: rgba(10, 17, 40, 0.9);'
        : 'border: 1px solid var(--border-color); background: rgba(10, 17, 40, 0.6);';

      const titleColor = isNextUp ? 'var(--accent-gold)' : 'var(--accent-cyan)';

      let meetButtonHtml = '';

      if (!isDirectorCall) {
        // Public 101 Session -> Open Google Meet Link for Everyone
        if (meetUrl) {
          meetButtonHtml = `<a href="${meetUrl}" target="_blank" rel="noopener" class="btn btn-primary" style="background: var(--accent-gold); color: #0a1128; font-weight: 800; font-size: 0.92rem; padding: 0.55rem 1rem;">🎥 Join Live Google Meet ➔</a>`;
        }
      } else {
        // Restricted Governance / Director Call -> Only visible to @lex.clinic domain users
        if (isLexClinicMember) {
          if (meetUrl) {
            meetButtonHtml = `<a href="${meetUrl}" target="_blank" rel="noopener" class="btn btn-primary" style="background: #34d399; color: #0a1128; font-weight: 800; font-size: 0.92rem; padding: 0.55rem 1rem;">🔒 Join Director Google Meet (${userEmail.split('@')[0]}) ➔</a>`;
          }
        } else {
          meetButtonHtml = `<a href="javascript:void(0)" onclick="openNavLoginModal(event)" class="btn btn-outline" style="border-color: #fbbf24; color: #fbbf24; font-size: 0.85rem; padding: 0.5rem 0.85rem;">🔒 Google Meet Link Reserved for @lex.clinic Directors</a>`;
        }
      }

      html += `
        <div class="card pillar-card event-list-card" style="${cardStyle}">
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem;">
            ${isNextUp ? '<span class="status-badge today-badge">🔥 NEXT UPCOMING SESSION</span>' : '<span class="status-badge notebook-available">📅 Scheduled</span>'}
            ${isDirectorCall ? '<span class="status-badge" style="background: rgba(251, 191, 36, 0.2); color: #fbbf24; border: 1px solid #f59e0b;">🔒 Director Call</span>' : '<span class="status-badge media-available">🌐 Public 101 Class</span>'}
          </div>
          <div class="event-date-tag" style="color: ${titleColor}; font-weight: 700; margin-bottom: 0.5rem;">📅 ${item.date}</div>
          <h3 style="color: ${titleColor}; font-size: 1.25rem; margin-bottom: 0.75rem;">${item.title}</h3>
          <p style="margin-bottom: 1.25rem; font-size: 0.95rem; color: var(--text-main); line-height: 1.5;">
            ${item.description}
          </p>
          <div class="card-actions" style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            ${meetButtonHtml}
            ${calUrl ? `<a href="${calUrl}" target="_blank" rel="noopener" class="btn btn-outline" style="font-size: 0.88rem;">Add to Google Calendar 📅</a>` : ''}
          </div>
        </div>
      `;
    });

    upcomingContainer.innerHTML = html;

  } catch (err) {
    console.log('Error rendering live upcoming events:', err);
  }
});
