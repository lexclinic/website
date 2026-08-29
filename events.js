document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');

  try {
    const response = await fetch('events.json');
    if (!response.ok) return;
    const events = await response.json();

    const selectedEvent = events.find(e => e.id === eventId) || events[0];

    if (!selectedEvent) return;

    const titleEl = document.getElementById('event-title');
    const subtitleEl = document.getElementById('event-subtitle');
    const dateBadgeEl = document.getElementById('event-date-badge');
    const heroActionsEl = document.getElementById('event-hero-actions');
    const contentBodyEl = document.getElementById('event-content-body');

    if (titleEl) titleEl.textContent = selectedEvent.title;
    if (subtitleEl) subtitleEl.textContent = selectedEvent.summary;
    if (dateBadgeEl) {
      const typeLabel = selectedEvent.type === 'upcoming' ? '🔔 Upcoming Event' : (selectedEvent.type === 'today' ? '🔥 Today\'s Session' : '📜 Past Session');
      dateBadgeEl.textContent = `${typeLabel} • ${selectedEvent.date} (${selectedEvent.time})`;
    }

    // Hero Actions Buttons
    if (heroActionsEl) {
      let heroButtonsHTML = '';
      if (selectedEvent.googleCalendarUrl) {
        heroButtonsHTML += `<a href="${selectedEvent.googleCalendarUrl}" target="_blank" rel="noopener" class="btn btn-primary">Google Calendar Event 📅</a>`;
      }
      if (selectedEvent.driveRecordingUrl) {
        heroButtonsHTML += `<a href="${selectedEvent.driveRecordingUrl}" target="_blank" rel="noopener" class="btn btn-primary">Watch Recording on Google Drive 🎥</a>`;
      }
      if (selectedEvent.driveNotesUrl) {
        heroButtonsHTML += `<a href="${selectedEvent.driveNotesUrl}" target="_blank" rel="noopener" class="btn btn-outline">Read Notes on Google Docs 📄</a>`;
      }
      if (selectedEvent.youtubeUrl) {
        heroButtonsHTML += `<a href="${selectedEvent.youtubeUrl}" target="_blank" rel="noopener" class="btn btn-outline">Watch 101 Playlist 🎥</a>`;
      }
      if (selectedEvent.spotifyUrl) {
        heroButtonsHTML += `<a href="${selectedEvent.spotifyUrl}" target="_blank" rel="noopener" class="btn btn-spotify-hero">Listen on Spotify 🎧</a>`;
      }
      heroActionsEl.innerHTML = heroButtonsHTML;
    }

    // Render Event Content Body
    if (contentBodyEl) {
      let bodyHTML = '';

      if (selectedEvent.type === 'upcoming') {
        bodyHTML += `
          <div class="card event-module-card">
            <div class="module-header">
              <span class="badge-tag">Calendar Event</span>
              <h2>Upcoming Meeting Details</h2>
            </div>
            <p style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 1.5rem;">
              This session is scheduled on Google Calendar for <strong>${selectedEvent.date} at ${selectedEvent.time}</strong>.
            </p>
            <div class="card-actions">
              <a href="${selectedEvent.googleCalendarUrl}" target="_blank" rel="noopener" class="btn btn-primary">Open Google Calendar Invitation 📅</a>
            </div>
          </div>
        `;
      }

      // Multiple Watchable Session Recordings
      if (selectedEvent.recordings && selectedEvent.recordings.length > 0) {
        bodyHTML += `
          <div class="card event-module-card">
            <div class="module-header">
              <span class="badge-tag">Watchable Media</span>
              <h2>Session Recordings & Media Clips (${selectedEvent.recordings.length} Clips)</h2>
            </div>
            <div style="display: flex; flex-direction: column; gap: 2rem;">
              ${selectedEvent.recordings.map((rec, index) => `
                <div style="background: rgba(10, 17, 40, 0.6); border: 1px solid var(--border-color); border-radius: 8px; padding: 1.25rem;">
                  <h3 style="color: var(--accent-cyan); font-size: 1.1rem; margin-bottom: 0.75rem;">${index + 1}. ${rec.title}</h3>
                  <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 6px; border: 1px solid var(--border-color); background: #000; margin-bottom: 0.85rem;">
                    <iframe src="${rec.embedUrl}" allow="autoplay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allowfullscreen></iframe>
                  </div>
                  <a href="${rec.watchUrl}" target="_blank" rel="noopener" class="btn btn-outline" style="font-size: 0.85rem; padding: 0.4rem 0.9rem;">Open Video in Google Drive 🎥</a>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      // Single Watchable Media Player Embed
      if (selectedEvent.mediaEmbedUrl && (!selectedEvent.recordings || selectedEvent.recordings.length === 0)) {
        bodyHTML += `
          <div class="card event-module-card">
            <div class="module-header">
              <span class="badge-tag">Watchable Media</span>
              <h2>Session Recording & Media Player</h2>
            </div>
            <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; border: 1px solid var(--border-color); background: #000; margin-bottom: 1rem;">
              <iframe src="${selectedEvent.mediaEmbedUrl}" allow="autoplay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allowfullscreen></iframe>
            </div>
          </div>
        `;
      }

      if (selectedEvent.transcript) {
        bodyHTML += `
          <div class="card event-module-card">
            <div class="module-header">
              <span class="badge-tag">Socratic Notes</span>
              <h2>Meeting Notes & Takeaways</h2>
            </div>
            <div class="transcript-content">
              <p style="white-space: pre-line; color: var(--text-main); font-size: 1.05rem; line-height: 1.7;">${selectedEvent.transcript}</p>
            </div>
          </div>
        `;
      }

      bodyHTML += `
        <div class="card event-module-card">
          <div class="module-header">
            <span class="badge-tag">Media & Drive Links</span>
            <h2>LexClinic Drive & Courseware Resources</h2>
          </div>
          <div class="resource-links">
            ${selectedEvent.driveRecordingUrl ? `<a href="${selectedEvent.driveRecordingUrl}" target="_blank" rel="noopener" class="info-tag">🎥 Google Drive Recording</a>` : ''}
            ${selectedEvent.driveNotesUrl ? `<a href="${selectedEvent.driveNotesUrl}" target="_blank" rel="noopener" class="info-tag">📄 Google Docs Notes</a>` : ''}
            <a href="https://www.youtube.com/watch?v=ONwiUkc_tt4&list=PLbPukKwpmk5E" target="_blank" rel="noopener" class="info-tag">🎥 Legal Engineering 101 Playlist</a>
            <a href="https://open.spotify.com/show/0348ivoLaNfKBq1HeIYC9b" target="_blank" rel="noopener" class="info-tag">🎧 LexClinic Spotify Show</a>
            <a href="erc7827.html" class="info-tag">📄 ERC-7827 Standard Specification</a>
          </div>
        </div>
      `;

      contentBodyEl.innerHTML = bodyHTML;
    }

  } catch (err) {
    console.log('Events detail running in static mode:', err);
  }
});
