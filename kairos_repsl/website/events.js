/*
  LexClinic Education Platform — Live Google Calendar Events, Category Filter & Privacy Renderer
  Build Version: 20261025_v8
*/

window.filterEventsByCategory = function(category, btnEl) {
  const buttons = document.querySelectorAll('.event-cat-filter-btn');
  buttons.forEach(b => {
    const isSelected = (b === btnEl) || (b.getAttribute('data-cat') === category);
    b.style.background = isSelected ? 'var(--accent-gold)' : 'rgba(30, 41, 59, 0.85)';
    b.style.color = isSelected ? '#0a1128' : '#cbd5e1';
    b.style.borderColor = isSelected ? 'var(--accent-gold)' : '#475569';
    b.style.fontWeight = isSelected ? '800' : '600';
  });

  const cards = document.querySelectorAll('[data-event-category]');
  cards.forEach(card => {
    const cardCat = card.getAttribute('data-event-category') || 'all';
    if (category === 'all' || cardCat.split(',').includes(category)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
};

document.addEventListener('DOMContentLoaded', async () => {
  const upcomingContainer = document.getElementById('upcoming-sessions-grid');
  if (!upcomingContainer) return;

  try {
    const response = await fetch('/events.json?v=20261025_v8');
    if (!response.ok) return;
    const events = await response.json();

    const upcomingEvents = events.filter(e => e.is_upcoming).slice(0, 4);
    if (!upcomingEvents || upcomingEvents.length === 0) return;

    const userEmail = window.getSanitizedEmail ? window.getSanitizedEmail() : "";
    const isLexClinicMember = userEmail.toLowerCase().endsWith("@lex.clinic");

    const catLabels = {
      class: '🎓 Socratic Class',
      interview: '🎙️ Interview',
      director_call: '🏛️ Director Call',
      partner_call: '🌐 Partner / Root Node Call'
    };

    let html = '';

    upcomingEvents.forEach((item, index) => {
      const isNextUp = index === 0;
      const isDirectorCall = item.is_private;
      const meetUrl = item.meet_url;
      const calUrl = item.url;
      const cat = item.category || (isDirectorCall ? 'director_call' : 'class');
      const catLabel = catLabels[cat] || '📅 Event';

      const cardStyle = isNextUp
        ? 'border: 2px solid var(--accent-gold); background: rgba(10, 17, 40, 0.9); padding: 1.5rem;'
        : 'border: 1px solid var(--border-color); background: rgba(10, 17, 40, 0.6); padding: 1.5rem;';

      const titleColor = isNextUp ? 'var(--accent-gold)' : 'var(--accent-cyan)';

      let meetButtonHtml = '';

      if (!isDirectorCall) {
        if (meetUrl) {
          meetButtonHtml = `<a href="${meetUrl}" target="_blank" rel="noopener" class="btn btn-primary" style="background: var(--accent-gold); color: #0a1128; font-weight: 800; font-size: 0.92rem; padding: 0.55rem 1rem;">🎥 Join Live Google Meet ➔</a>`;
        }
      } else {
        if (isLexClinicMember) {
          if (meetUrl) {
            meetButtonHtml = `<a href="${meetUrl}" target="_blank" rel="noopener" class="btn btn-primary" style="background: #34d399; color: #0a1128; font-weight: 800; font-size: 0.92rem; padding: 0.55rem 1rem;">🔒 Join Director Google Meet (${userEmail.split('@')[0]}) ➔</a>`;
          }
        } else {
          meetButtonHtml = `<a href="javascript:void(0)" onclick="window.openNavLoginModal(event)" class="btn btn-outline" style="border-color: #fbbf24; color: #fbbf24; font-size: 0.85rem; padding: 0.5rem 0.85rem;">🔒 Google Meet Link Reserved for @lex.clinic Directors</a>`;
        }
      }

      html += `
        <div class="card pillar-card event-list-card" data-event-category="${cat}" style="${cardStyle}">
          <div class="event-date-tag" style="color: ${titleColor}; font-weight: 700; margin-bottom: 0.5rem;">📅 ${item.date} • ${catLabel}</div>
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
