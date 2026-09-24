# 📅 LexClinic Calendar Review & Maintenance Protocol

**Scope**: `lex_clinic_website_mgit/repo_mgit/kairos_mgit/calendar/`  
**Route Namespace**: `https://lex.clinic/calendar/`  

---

## 1. Daily Review Protocol

Every agent instance or maintainer reviewing `lex.clinic/calendar` must perform the following automated daily checks:

1. **Google Calendar API Audit**:
   * Query `kyle@lex.clinic` primary calendar and `Lex.Clinic` group calendar using the authorized Google Cloud SDK (`gcloud auth application-default print-access-token`).
   * Identify newly added or modified events for the current month and upcoming weeks.

2. **Google Drive Recording & Transcript Scan**:
   * Query Google Drive for newly created `.mp4` video recordings, `.m4a` audio files, or `Notes by Gemini` Google Docs associated with recent Meet sessions.
   * Verify public read permissions (`anyone with link`) on new recording files.

3. **Event State Transitioning**:
   * **Upcoming ➔ Expired/Past**: Once an event's date/time passes, transition its status in `calendar.html` and `events.json`.

---

## 2. Event Page Structure: Upcoming vs. Past Sessions

All session pages are organized cleanly under the **`/calendar/`** namespace (e.g. `lex.clinic/calendar/event-clinic-misc-2026-08-24.html`).

### **A. Upcoming Events**
* **Primary Call-To-Action**: **`Add to Google Calendar 📅`** (linking directly to the Google Calendar `https://www.google.com/calendar/event?eid=...` invitation).
* **Content**: Displays the meeting date, time zone, agenda, and Google Meet joining details.
* **No Speculative Media**: Zero fake video players, zero fake transcripts, zero demo code blocks.

### **B. Past / Expired Sessions**
* **Primary Call-To-Action**:
  * **If Video/Audio Recorded**: **`Watch Video Recording 🎥`** or **`Open Audio in Google Drive 🎧`** (linking directly to the public Google Drive watch URL).
  * **If No Video Recorded**: Button displays **`No Video Recorded 🚫`** (disabled button or notes doc link).
* **Content**:
  * Embedded responsive HTML5 / Google Drive player for all watchable media clips.
  * Direct Google Docs link for Gemini Meeting Notes & Transcripts.
  * Socratic key takeaways and code primitives.

---

## 3. Route Namespace Organization

```
kairos_mgit/
├── calendar.html                                  # Main Calendar Landing Hub
└── calendar/                                      # Event Pages Route Namespace
    ├── event-clinic-misc-2026-08-24.html          # Aug 24 Clinic Misc (6 Media Clips)
    ├── event-clinic-exp-wit-2026-08-22.html      # Aug 22 Clinic + Exp. Wit
    ├── event-lexclinic-directors-2026-08-21.html  # Aug 21 Directors Session (No Video)
    ├── event-lexclinic-2026-08-20.html          # Aug 20 Socratic Session
    ├── event-lexclinic-2026-08-13.html          # Aug 13 Courseware Session
    └── event-lexclinic-2026-09-03.html          # Sep 03 Upcoming Session
```
