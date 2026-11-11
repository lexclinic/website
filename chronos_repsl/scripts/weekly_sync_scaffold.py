#!/usr/bin/env python3
"""
LexClinic Hybrid HTML + JSON Weekly Sync Compiler & Hub Synchronizer
====================================================================
Eliminates O(N^2) token bloat and template drift during weekly /event/ and /101/ syncs
while preserving full LLM semantic HTML authoring for bespoke pedagogical content.
"""

import argparse
import html
import json
import re
from pathlib import Path

CACHE_BUST = "20261025_v23"
NL = chr(10)


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or "media-item"


def load_html_slot(spec: dict, key: str, base_dir: Path) -> str:
    file_key = f"{key}_file"
    if spec.get(file_key):
        fpath = (base_dir / spec[file_key]).resolve()
        return fpath.read_text(encoding="utf-8").strip()
    return spec.get(key, "").strip()


def validate_html_fragment(fragment: str, context_label: str, target_class_id: str = None) -> list:
    """Pre-flight check on LLM-authored HTML fragments before page compilation."""
    errors = []
    if not fragment:
        return errors

    # 1. Rule 08 check: forbid inline min-width > 340px
    for match in re.finditer(r'style="[^"]*min-width:\s*(\d+)px[^"]*"', fragment, re.IGNORECASE):
        px = int(match.group(1))
        if px > 340:
            errors.append(
                f"[{context_label}] Rule 08 violation: inline min-width: {px}px > 340px breaks narrow mobile viewports (<=768px). Use CSS class .idea-table or responsive grid."
            )

    # 2. Rule 07 check: forbid direct copy-paste quiz-expert href without progressive gate
    if 'href="quiz-expert/"' in fragment:
        errors.append(
            f"[{context_label}] Rule 07 violation: direct href='quiz-expert/' found; use progressive quiz CTA with data-progressive-quiz-cid."
        )

    # 3. Class-number copypasta check in headings
    if target_class_id:
        for m in re.finditer(r"<h[1-4][^>]*>.*?\b(?:Class|Lesson)\s+(\d+\.\d+)\b.*?</h[1-4]>", fragment, re.DOTALL):
            found_cid = m.group(1)
            if found_cid != target_class_id:
                errors.append(
                    f"[{context_label}] Copypasta violation: heading references Class/Lesson {found_cid} inside target Class {target_class_id}."
                )

    return errors


def render_common_head(title: str, description: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <meta name="description" content="{html.escape(description, quote=True)}">
  <link rel="stylesheet" href="/styles.css?v={CACHE_BUST}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="/js/audio-player.js?v={CACHE_BUST}"></script>
  <script src="/js/auth.js?v={CACHE_BUST}"></script>
  <script src="/js/media-tracker-miniapp.js?v={CACHE_BUST}"></script>
  <script src="/js/watch-tracker.js?v={CACHE_BUST}"></script>
  <script src="/js/modules/ui-interactive-controls.js?v={CACHE_BUST}"></script>
  <script src="/script.js?v={CACHE_BUST}" defer></script>
  <link rel="icon" type="image/png" href="/favicon.png?v={CACHE_BUST}">
  <link rel="shortcut icon" href="/favicon.ico?v={CACHE_BUST}">
  <link rel="manifest" href="/manifest.webmanifest">
  <meta name="theme-color" content="#0a1128">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="LexClinic">
  <link rel="apple-touch-icon" href="/icon-192.png">
</head>"""


def render_common_header(active_section: str = "") -> str:
    ev_cls = ' class="active-link"' if active_section == "event" else ""
    c101_cls = ' class="active-link"' if active_section == "101" else ""
    return f"""<body>

  <!-- Unified Fixed Header Wrapper -->
  <header class="fixed-header-wrapper">
    <div class="top-disclaimer-bar">
      <span>⚖️ <strong>LEGAL DISCLAIMER:</strong> LexClinic Education, Inc. is applying for 501(c)(3) tax-exempt status. Materials, software runtimes, and APIs are for educational research and do not constitute formal legal advice. <a href="/help/#disclaimer">Read Full Disclaimer ➔</a></span>
    </div>
    <nav class="navbar">
      <div class="nav-container">
        <a href="/index.html" class="brand-logo">
          <span class="logo-icon">⚖️</span>
          <span class="logo-text">Lex<span class="highlight">Clinic</span></span>
        </a>
        <nav class="nav-links" id="nav-links">
          <a href="/event/"{ev_cls}>Event</a>
          <a href="/101"{c101_cls}>101</a>
          <a href="/interview/">Interview</a>
          <a href="/collaborate/">Collaborate</a>
          <a href="/fiduciary/">Fiduciary</a>
          <a href="/attest/">Attest</a>
          <a href="/help/">Help</a>
          <a href="/repo/">Repo</a>
          <a href="/erc7827/">ERC-7827</a>
          <a href="/nft/">NFT</a>
          <a href="https://www.youtube.com/watch?v={CACHE_BUST}&list=PLbPukKwpmk5E" target="_blank" rel="noopener" class="btn-social" title="Subscribe on YouTube">YouTube</a>
          <a href="https://open.spotify.com/show/0348ivoLaNfKBq1HeIYC9b" target="_blank" rel="noopener" class="btn-spotify" title="Follow on Spotify">Spotify</a>
          <a href="https://www.linkedin.com/company/lexclinic" target="_blank" rel="noopener" class="btn-social" title="Follow on LinkedIn">LinkedIn</a>
          <a href="javascript:void(0)" onclick="event.preventDefault(); window.openNavLoginModal(event); return false;" id="nav-login-btn" style="background: #fbbf24; color: #0a1128; font-weight: 800; font-size: 0.88rem; padding: 0.35rem 0.85rem; border-radius: 6px; margin-left: 0.35rem; text-decoration: none; border: 2px solid #f59e0b; box-shadow: 0 0 10px rgba(251, 191, 36, 0.4); display: inline-block;">Login</a>
        </nav>
        <button class="mobile-toggle" id="mobile-toggle" aria-label="Toggle navigation">
          ☰
        </button>
      </div>
    </nav>
  </header>"""


def render_common_footer() -> str:
    return """  <!-- Footer -->
  <footer class="footer">
    <div class="container footer-content">
      <p>© 2026 LexClinic Education Inc. Delaware non-profit applying for 501(c)(3) tax-exempt status. Open public goods published under AGPL-3.0 &amp; Creative Commons Attribution-ShareAlike 4.0.</p>
      <p class="disclaimer" style="margin-top: 0.5rem; font-size: 0.78rem; color: #94a3b8; line-height: 1.5;">
        <strong>Educational &amp; Open-Source Disclaimer:</strong> LexClinic Education, Inc. is a Delaware non-profit corporation applying for 501(c)(3) tax-exempt status. All materials, software runtimes, and APIs are published for educational research under AGPL-3.0 and do not constitute formal legal advice or an attorney-client relationship. <a href="/help/#disclaimer" style="color: var(--accent-cyan); text-decoration: underline;">Read full disclaimer ➔</a>
      </p>
    </div>
  </footer>

</body>
</html>
"""


def render_video_card(slug: str, heading: str, youtube_id: str, iframe_id: str = None, description_html: str = "") -> str:
    frame_id = iframe_id or f"yt_frame_{slug}"
    desc_block = f"{NL}        {description_html}{NL}" if description_html else ""
    return f"""      <div class="card pillar-card" id="{slug}" style="border: 2px solid var(--accent-cyan); margin-bottom: 2rem;">
        <h3 style="color: var(--accent-cyan); font-size: 1.25rem; margin-bottom: 0.75rem;">
          {heading}
        </h3>{desc_block}
        <div class="media-playback-meter-container" style="margin-top: 0.5rem; margin-bottom: 0.85rem; background: rgba(15, 23, 42, 0.9); border: 1px solid #334155; border-radius: 8px; padding: 0.85rem; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.4rem;">
            <span class="meter-status-text" style="font-size: 0.88rem; font-weight: 700; color: #cbd5e1;">🎥 Unwatched Video Clip</span>
            <span class="meter-auth-hint" style="font-size: 0.8rem; color: #94a3b8;">🔒 Log in to save watch tracker</span>
          </div>
          <div style="width: 100%; height: 8px; background: rgba(30, 41, 59, 0.8); border-radius: 4px; overflow: hidden; border: 1px solid #475569;">
            <div class="meter-fill-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38bdf8, #34d399); transition: width 0.4s ease;"></div>
          </div>
        </div>
        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; border: 1px solid var(--border-color); background: #000; margin-bottom: 0.75rem;">
          <iframe id="{frame_id}" loading="lazy" src="https://www.youtube.com/embed/{youtube_id}?enablejsapi=1" allow="autoplay; fullscreen" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allowfullscreen></iframe>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; background: rgba(15, 23, 42, 0.8); padding: 0.65rem 0.85rem; border-radius: 6px; border: 1px solid #334155;">
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--accent-cyan); margin-right: 0.25rem;">Speed:</span>
            <button type="button" onclick="window.setVideoSpeed('{slug}', 1.0, this)" class="btn-speed" style="padding: 0.25rem 0.55rem; font-size: 0.78rem; background: var(--accent-cyan); color: #0a1128; font-weight: 800; border: 1px solid var(--accent-cyan); border-radius: 4px; cursor: pointer;">1.0x</button>
            <button type="button" onclick="window.setVideoSpeed('{slug}', 1.25, this)" class="btn-speed" style="padding: 0.25rem 0.55rem; font-size: 0.78rem; background: rgba(30, 41, 59, 0.8); color: #e2e8f0; font-weight: 600; border: 1px solid #334155; border-radius: 4px; cursor: pointer;">1.25x</button>
            <button type="button" onclick="window.setVideoSpeed('{slug}', 1.5, this)" class="btn-speed" style="padding: 0.25rem 0.55rem; font-size: 0.78rem; background: rgba(30, 41, 59, 0.8); color: #e2e8f0; font-weight: 600; border: 1px solid #334155; border-radius: 4px; cursor: pointer;">1.5x</button>
            <button type="button" onclick="window.setVideoSpeed('{slug}', 1.75, this)" class="btn-speed" style="padding: 0.25rem 0.55rem; font-size: 0.78rem; background: rgba(30, 41, 59, 0.8); color: #e2e8f0; font-weight: 600; border: 1px solid #334155; border-radius: 4px; cursor: pointer;">1.75x</button>
            <button type="button" onclick="window.setVideoSpeed('{slug}', 2.0, this)" class="btn-speed" style="padding: 0.25rem 0.55rem; font-size: 0.78rem; background: rgba(30, 41, 59, 0.8); color: #e2e8f0; font-weight: 600; border: 1px solid #334155; border-radius: 4px; cursor: pointer;">2.0x</button>
          </div>
          <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
            <button type="button" onclick="const iframe = this.closest('.card, .pillar-card').querySelector('iframe'); if (iframe) {{ if (iframe.requestFullscreen) iframe.requestFullscreen(); else if (iframe.webkitRequestFullscreen) iframe.webkitRequestFullscreen(); }}" class="btn" style="padding: 0.25rem 0.65rem; font-size: 0.78rem; background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); border-radius: 4px; cursor: pointer; font-weight: 700;">⤢ Expand Fullscreen</button>
            <button type="button" onclick="window.openMediaCommentModal('{slug}', event)" class="btn btn-comment-{slug}" style="padding: 0.25rem 0.65rem; font-size: 0.78rem; background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); border-radius: 4px; cursor: pointer; font-weight: 700;">💬 Notes</button>
            <button type="button" onclick="window.openMediaApprovalModal('{slug}', event)" class="btn btn-approval-{slug}" style="padding: 0.25rem 0.65rem; font-size: 0.78rem; background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); border-radius: 4px; cursor: pointer; font-weight: 700;">👍 Approval</button>
            <button type="button" onclick="window.openNavLoginModal(event)" class="btn btn-unlogged-prompt" style="padding: 0.25rem 0.65rem; font-size: 0.78rem; background: rgba(251, 191, 36, 0.15); color: #fbbf24; border: 1px solid #f59e0b; border-radius: 4px; cursor: pointer; font-weight: 700; display: inline-block;">🔒 Login for Notes &amp; Approvals</button> <button type="button" onclick="window.copyCardDirectLink('{slug}', this)" class="btn btn-copy-link" style="padding: 0.25rem 0.65rem; font-size: 0.78rem; background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); border-radius: 4px; cursor: pointer; font-weight: 700;">🔗 Copy Direct Link</button>
          </div>
        </div>
      </div>"""


def render_event_page(spec: dict, base_dir: Path) -> str:
    date_str = spec["event_date"]
    class_id = spec["class_id"]
    lesson_title = spec["lesson_title"]
    page_title = spec.get(
        "page_title", f"LexClinic 2026 — Lesson {class_id}: {lesson_title} | LexClinic"
    )
    meta_desc = spec["meta_description"]
    hero_title = spec.get("hero_title", f"LexClinic 2026 — Lesson {class_id}: {lesson_title}")
    hero_subtitle_html = load_html_slot(spec, "hero_subtitle_html", base_dir) or html.escape(meta_desc)
    overview_html = load_html_slot(spec, "overview_html", base_dir)
    custom_sections_html = load_html_slot(spec, "custom_sections_html", base_dir)

    takeaways_html = load_html_slot(spec, "takeaways_html", base_dir)
    if not takeaways_html and spec.get("takeaways"):
        tiles = []
        for t in spec["takeaways"]:
            t_heading = t["heading_html"] if "heading_html" in t else html.escape(t["heading"])
            t_body = t["body_html"] if "body_html" in t else html.escape(t["body"])
            tiles.append(
                f"""          <div style="background: rgba(10, 17, 40, 0.7); border: 1px solid var(--border-color); padding: 1rem; border-radius: 8px;">
            <h4 style="color: var(--accent-cyan); margin-bottom: 0.4rem;">{t_heading}</h4>
            <p style="font-size: 0.92rem; color: #cbd5e1; margin: 0;">{t_body}</p>
          </div>"""
            )
        takeaways_html = (
            '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">'
            + NL
            + NL.join(tiles)
            + NL
            + "        </div>"
        )

    errors = []
    for slot_name, frag in [
        ("hero_subtitle_html", hero_subtitle_html),
        ("overview_html", overview_html),
        ("takeaways_html", takeaways_html),
        ("custom_sections_html", custom_sections_html),
    ]:
        errors.extend(validate_html_fragment(frag, f"event/{date_str}:{slot_name}", class_id))
    if errors:
        raise ValueError("HTML Fragment Validation Failed: " + "; ".join(errors))

    audio_slug = spec["audio_slug"]
    audio_title = spec["audio_title"]

    clip_cards = []
    for idx, clip in enumerate(spec["clips"], start=1):
        c_slug = clip["slug"]
        c_title = clip["title"]
        c_yt = clip["youtube_id"]
        c_frame_id = clip.get("iframe_id", f"yt_frame_{c_slug}")
        c_desc = clip.get("description_html", "")
        if c_desc:
            errs = validate_html_fragment(c_desc, f"event/{date_str}:clip[{idx}]", class_id)
            if errs:
                raise ValueError("Clip HTML Validation Failed: " + "; ".join(errs))
        clip_cards.append(render_video_card(c_slug, c_title, c_yt, c_frame_id, c_desc))

    clips_joined = (NL + NL).join(clip_cards)
    clips_count = len(spec["clips"])
    custom_block = f"{NL}      {custom_sections_html}{NL}" if custom_sections_html else ""

    return f"""{render_common_head(page_title, meta_desc)}
{render_common_header("event")}

  <!-- Hero Section -->
  <section class="hero page-hero">
    <div class="container hero-content">
      <h1 class="hero-title">{hero_title}</h1>
      <p class="hero-subtitle">{hero_subtitle_html}</p>
      <div class="hero-actions" style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
        <a href="/101/{class_id}/" class="btn btn-primary" style="background: var(--accent-cyan); color: #0a1128; font-weight: 800;">📘 Companion 101 Module (Class {class_id}) ➔</a>
        <a href="/101/{class_id}/quiz-learned/" data-progressive-quiz-cid="{class_id}" data-learned-href="/101/{class_id}/quiz-learned/" data-expert-href="/101/{class_id}/quiz-expert/" class="btn btn-primary" style="background: var(--accent-gold); color: #0a1128; font-weight: 800;">📘 Take 5-Q Learned Quiz ➔</a>
        <a href="/event/" class="btn btn-outline">← Back to Events Hub</a>
      </div>
    </div>
  </section>

  <!-- Main Content -->
  <section class="section">
    <div class="container">

      <!-- 1. Session Overview Card -->
      <div class="card pillar-card" style="margin-bottom: 2rem;">
        <h2 style="color: var(--accent-gold); font-size: 1.4rem; margin-bottom: 0.75rem;">
          Socratic Session Overview &amp; Key Takeaways
        </h2>
        {overview_html}

        {takeaways_html}
      </div>{custom_block}

      <!-- 2. Native Audio Player Card -->
      <div class="card pillar-card" id="{audio_slug}" style="border: 2px solid #1ed760; margin-bottom: 2rem;">

        <h3 style="color: #1ed760; font-size: 1.25rem; margin-bottom: 0.75rem;">
          {audio_title}
        </h3>

        <div class="media-playback-meter-container" style="margin-top: 0.5rem; margin-bottom: 0.85rem; background: rgba(15, 23, 42, 0.9); border: 1px solid #334155; border-radius: 8px; padding: 0.85rem; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.4rem;">
            <span class="meter-status-text" style="font-size: 0.88rem; font-weight: 700; color: #cbd5e1;">🎧 Unwatched Audio Track</span>
            <span class="meter-auth-hint" style="font-size: 0.8rem; color: #94a3b8;">🔒 Log in to save watch tracker</span>
          </div>
          <div style="width: 100%; height: 8px; background: rgba(30, 41, 59, 0.8); border-radius: 4px; overflow: hidden; border: 1px solid #475569;">
            <div class="meter-fill-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38bdf8, #34d399); transition: width 0.4s ease;"></div>
          </div>
        </div>

        <audio id="audio-player-{audio_slug}" controls style="width: 100%; margin-bottom: 0.75rem; accent-color: #1ed760;" preload="metadata">
          <source src="audio.m4a" type="audio/mp4">
          Your browser does not support native audio playback.
        </audio>

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; background: rgba(15, 23, 42, 0.8); padding: 0.65rem 0.85rem; border-radius: 6px; border: 1px solid #334155;">
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <span style="font-size: 0.82rem; font-weight: 700; color: #1ed760; margin-right: 0.25rem;">Speed:</span>
            <button type="button" onclick="window.setAudioSpeed('audio-player-{audio_slug}', 1.0, this)" class="btn-speed" style="padding: 0.25rem 0.55rem; font-size: 0.78rem; background: #1ed760; color: #0a1128; font-weight: 800; border: 1px solid #1ed760; border-radius: 4px; cursor: pointer;">1.0x</button>
            <button type="button" onclick="window.setAudioSpeed('audio-player-{audio_slug}', 1.25, this)" class="btn-speed" style="padding: 0.25rem 0.55rem; font-size: 0.78rem; background: rgba(30, 41, 59, 0.8); color: #e2e8f0; font-weight: 600; border: 1px solid #334155; border-radius: 4px; cursor: pointer;">1.25x</button>
            <button type="button" onclick="window.setAudioSpeed('audio-player-{audio_slug}', 1.5, this)" class="btn-speed" style="padding: 0.25rem 0.55rem; font-size: 0.78rem; background: rgba(30, 41, 59, 0.8); color: #e2e8f0; font-weight: 600; border: 1px solid #334155; border-radius: 4px; cursor: pointer;">1.5x</button>
            <button type="button" onclick="window.setAudioSpeed('audio-player-{audio_slug}', 1.75, this)" class="btn-speed" style="padding: 0.25rem 0.55rem; font-size: 0.78rem; background: rgba(30, 41, 59, 0.8); color: #e2e8f0; font-weight: 600; border: 1px solid #334155; border-radius: 4px; cursor: pointer;">1.75x</button>
            <button type="button" onclick="window.setAudioSpeed('audio-player-{audio_slug}', 2.0, this)" class="btn-speed" style="padding: 0.25rem 0.55rem; font-size: 0.78rem; background: rgba(30, 41, 59, 0.8); color: #e2e8f0; font-weight: 600; border: 1px solid #334155; border-radius: 4px; cursor: pointer;">2.0x</button>
          </div>
          <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
            <button type="button" onclick="window.openMediaCommentModal('{audio_slug}', event)" class="btn btn-comment-{audio_slug}" style="padding: 0.25rem 0.65rem; font-size: 0.78rem; background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); border-radius: 4px; cursor: pointer; font-weight: 700;">💬 Notes</button>
            <button type="button" onclick="window.openMediaApprovalModal('{audio_slug}', event)" class="btn btn-approval-{audio_slug}" style="padding: 0.25rem 0.65rem; font-size: 0.78rem; background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); border-radius: 4px; cursor: pointer; font-weight: 700;">👍 Approval</button>
            <button type="button" onclick="window.openNavLoginModal(event)" class="btn btn-unlogged-prompt" style="padding: 0.25rem 0.65rem; font-size: 0.78rem; background: rgba(251, 191, 36, 0.15); color: #fbbf24; border: 1px solid #f59e0b; border-radius: 4px; cursor: pointer; font-weight: 700; display: inline-block;">🔒 Login for Notes &amp; Approvals</button> <button type="button" onclick="window.copyCardDirectLink('{audio_slug}', this)" class="btn btn-copy-link" style="padding: 0.25rem 0.65rem; font-size: 0.78rem; background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); border-radius: 4px; cursor: pointer; font-weight: 700;">🔗 Copy Direct Link</button>
          </div>
        </div>
      </div>

      <!-- 3. Session Explainer Video Clips ({clips_count} Modules) -->
      <h2 style="color: var(--accent-gold); font-size: 1.5rem; margin-bottom: 1.25rem;">
        🎥 Session Explainer Video Clips ({clips_count} Modules)
      </h2>

{clips_joined}

      <!-- 4. Bottom Actions -->
      <div style="margin-top: 2.5rem; display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; justify-content: center;">
        <a href="/101/{class_id}/quiz-learned/" data-progressive-quiz-cid="{class_id}" data-learned-href="/101/{class_id}/quiz-learned/" data-expert-href="/101/{class_id}/quiz-expert/" class="btn btn-primary" style="background: var(--accent-gold); color: #0a1128; font-weight: 800; font-size: 1.02rem; padding: 0.75rem 1.4rem;">📘 Take 5-Q Learned Quiz ➔</a>
        <a href="/event/" class="btn btn-outline" style="font-size: 1.05rem; padding: 0.75rem 1.75rem;">← Back to Events Hub</a>
      </div>

    </div>
  </section>

  <script>
    (function() {{
      try {{
        if (localStorage.getItem('lexclinic_quiz_reset_20261111_v2') !== '1') {{
          const rawSubs = JSON.parse(localStorage.getItem('lexclinic_quiz_submissions') || '[]');
          const subs = Array.isArray(rawSubs) ? rawSubs : Object.values(rawSubs);
          const cleaned = subs.filter(s => {{
            if (!s) return false;
            const sc = String(s.score || '');
            if (sc.split('/').length > 2) return false;
            const cid = String(s.class_id || '');
            const ts = String(s.timestamp || '');
            if ((cid === '6.1' || cid === '6.2' || cid === 'class_6.1' || cid === 'class_6.2') && (!ts || ts < '2026-11-11T00:00:00.000Z')) return false;
            return true;
          }});
          localStorage.setItem('lexclinic_quiz_submissions', JSON.stringify(cleaned));
          if (localStorage.removeItem) {{
            localStorage.removeItem('lexclinic_quiz_answers_6.2');
            localStorage.removeItem('lexclinic_quiz_answers_6.1');
          }} else {{
            localStorage.setItem('lexclinic_quiz_answers_6.2', '{{}}');
            localStorage.setItem('lexclinic_quiz_answers_6.1', '{{}}');
          }}
          localStorage.setItem('lexclinic_quiz_reset_20261111_v2', '1');
        }}
      }} catch (e) {{}}
    }})();
  </script>

{render_common_footer()}"""


def render_101_module_page(spec: dict, base_dir: Path) -> str:
    class_id = spec["class_id"]
    cid_underscored = class_id.replace(".", "_")
    lesson_title = spec["lesson_title"]
    full_heading = f"Class {class_id}: {lesson_title}"
    page_title = f"{full_heading} | LexClinic Education"
    meta_desc = spec["meta_description"]
    video_slug = spec.get("video_slug") or slugify(full_heading)
    youtube_id = spec["youtube_id"]
    spotify_id = spec["spotify_id"]

    hero_subtitle_html = load_html_slot(spec, "hero_subtitle_html", base_dir)
    overview_html = load_html_slot(spec, "overview_html", base_dir)
    custom_sections_html = load_html_slot(spec, "custom_sections_html", base_dir)

    errors = []
    for slot_name, frag in [
        ("hero_subtitle_html", hero_subtitle_html),
        ("overview_html", overview_html),
        ("custom_sections_html", custom_sections_html),
    ]:
        errors.extend(validate_html_fragment(frag, f"101/{class_id}:{slot_name}", class_id))
    if errors:
        raise ValueError("101 HTML Fragment Validation Failed: " + "; ".join(errors))

    socratic = spec.get("socratic_companion") or {}
    soc_href = socratic.get("href", "")
    has_recorded_socratic = bool(soc_href and re.match(r"^/event/\d{4}-\d{2}-\d{2}/$", soc_href))

    hero_soc_btn = ""
    socratic_card_block = ""
    bottom_soc_btn = ""
    if has_recorded_socratic:
        soc_btn_label = socratic["button_label"]
        soc_badge = socratic["badge_text"]
        soc_desc = socratic["description_html"]
        hero_soc_btn = f'{NL}        <a href="{soc_href}" class="btn btn-outline">{soc_btn_label}</a>'
        socratic_card_block = f"""
      <!-- Live Socratic Cohort Companion Card -->
      <div class="card pillar-card" id="card_101_{cid_underscored}_socratic_companion" style="border: 2px solid var(--accent-cyan); background: rgba(15, 23, 42, 0.9); max-width: 960px; margin: 0 auto 2rem auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div style="flex: 1; min-width: 260px;">
            <div style="color: var(--accent-cyan); font-weight: 700; font-size: 0.85rem; margin-bottom: 0.25rem;">{soc_badge}</div>
            <h3 style="color: #e2e8f0; font-size: 1.2rem; margin: 0 0 0.4rem 0;">Class {class_id} Live Cohort Discussion &amp; Q&amp;A</h3>
            <p style="color: #cbd5e1; font-size: 0.94rem; margin: 0; line-height: 1.5;">{soc_desc}</p>
          </div>
          <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
            <a href="{soc_href}" class="btn btn-outline" style="border-color: var(--accent-cyan); color: var(--accent-cyan); font-weight: 800; padding: 0.6rem 1.2rem; border-radius: 6px;">{soc_btn_label}</a>
          </div>
        </div>
      </div>"""
        bottom_soc_btn = f'{NL}        <a href="{soc_href}" class="btn btn-outline" style="font-size: 1.02rem; padding: 0.75rem 1.4rem;">{soc_btn_label}</a>'

    video_card = render_video_card(video_slug, full_heading, youtube_id)
    custom_block = f"{NL}      {custom_sections_html}{NL}" if custom_sections_html else ""

    return f"""{render_common_head(page_title, meta_desc)}
{render_common_header("101")}

  <!-- Hero Section -->
  <section class="hero page-hero">
    <div class="container hero-content">
      <h1 class="hero-title">{full_heading}</h1>
      <p class="hero-subtitle">
        {hero_subtitle_html}
      </p>
      <div class="hero-actions" style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
        <a href="/101/{class_id}/quiz-learned/" data-progressive-quiz-cid="{class_id}" data-learned-href="/101/{class_id}/quiz-learned/" data-expert-href="/101/{class_id}/quiz-expert/" class="btn btn-primary" style="background: var(--accent-gold); color: #0a1128; font-weight: 800; font-size: 1.02rem; padding: 0.75rem 1.4rem;">📘 Take 5-Q Learned Quiz ➔</a>{hero_soc_btn}
        <a href="/101" class="btn btn-outline">← Back to 101 Hub</a>
      </div>
    </div>
  </section>

  <!-- Main Content -->
  <section class="section">
    <div class="container">
      
      <!-- Lesson Overview Tile -->
      <div class="card pillar-card" style="margin-bottom: 2rem;">
        <h2 style="color: var(--accent-gold); font-size: 1.4rem; margin-bottom: 0.75rem;">
          Lesson Overview: {full_heading}
        </h2>
        {overview_html}
      </div>{custom_block}

      <!-- Video Lecture Card -->
{video_card}

      <!-- Official Spotify Episode Embed Card -->
      <div class="card pillar-card" id="card_101_{cid_underscored}_spotify" style="border: 2px solid #1db954; max-width: 960px; margin: 0 auto 2rem auto;">
        <h3 style="color: #1db954; font-size: 1.25rem; margin-bottom: 0.75rem;">
          {full_heading} — Official Spotify Podcast Episode
        </h3>
        <div style="border-radius: 12px; overflow: hidden;">
          <iframe style="border-radius:12px" src="https://open.spotify.com/embed/episode/{spotify_id}?utm_source=generator&theme=0" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
        </div>
      </div>{socratic_card_block}

      <!-- Bottom Action Navigation -->
      <div style="margin-top: 2.5rem; display: flex; gap: 0.85rem; flex-wrap: wrap; align-items: center; justify-content: center;">
        <a href="/101/{class_id}/quiz-learned/" data-progressive-quiz-cid="{class_id}" data-learned-href="/101/{class_id}/quiz-learned/" data-expert-href="/101/{class_id}/quiz-expert/" class="btn btn-primary" style="background: var(--accent-gold); color: #0a1128; font-weight: 800; font-size: 1.02rem; padding: 0.75rem 1.4rem;">📘 Take 5-Q Learned Quiz ➔</a>{bottom_soc_btn}
        <a href="/101" class="btn btn-outline" style="font-size: 1.02rem; padding: 0.75rem 1.4rem;">⬅ Back to 101 Hub</a>
      </div>

    </div>
  </section>

{render_common_footer()}"""


def render_question_card(qnum: int, q: dict, require_input: bool = True) -> str:
    req_attr = " required" if require_input else ""
    prompt = q["prompt"]
    opt_a = q["options"]["A"]
    opt_b = q["options"]["B"]
    opt_c = q["options"]["C"]
    return f"""          <div class="quiz-question-card" data-qnum="{qnum}" style="background: rgba(10, 17, 40, 0.6); border: 1px solid var(--border-color); border-radius: 8px; padding: 1.25rem; margin-bottom: 1.25rem;">
            <h4 style="color: var(--accent-cyan); font-size: 1.05rem; margin-bottom: 0.75rem;">{qnum}. {prompt}</h4>
            <label style="display: block; margin-bottom: 0.5rem; color: #e2e8f0; cursor: pointer;"><input type="radio" name="q{qnum}" value="A"{req_attr}> A) {opt_a}</label>
            <label style="display: block; margin-bottom: 0.5rem; color: #e2e8f0; cursor: pointer;"><input type="radio" name="q{qnum}" value="B"{req_attr}> B) {opt_b}</label>
            <label style="display: block; margin-bottom: 0.5rem; color: #e2e8f0; cursor: pointer;"><input type="radio" name="q{qnum}" value="C"{req_attr}> C) {opt_c}</label>
          </div>"""


def render_quiz_page(spec: dict, mode: str) -> str:
    class_id = spec["class_id"]
    cid_nodot = class_id.replace(".", "")
    cid_hyphen = class_id.replace(".", "-")
    full_title = f"Class {class_id}: {spec['lesson_title']}"
    questions = spec["questions"]
    if len(questions) != 20:
        raise ValueError(f"Class {class_id} spec must provide exactly 20 questions (found {len(questions)})")

    for idx, q in enumerate(questions, start=1):
        for m in re.finditer(r"\bClass\s+(\d+\.\d+)\b", q["prompt"]):
            if m.group(1) != class_id:
                raise ValueError(
                    f"Copypasta detected in Class {class_id} Q{idx}: prompt references Class {m.group(1)} ('{q['prompt']}')"
                )

    if mode in ("learned", "smart"):
        page_title = f"5-Question Learned Quiz — {full_title} | LexClinic"
        meta_desc = f"📘 Learned Tier Assessment (5 Questions) — {full_title}"
        heading_text = f"5-Question Learned Quiz — {full_title}"
        subtext = "Pass this 5-question Learned Check (4/5 or 5/5) to earn your Learned Tier Keccak-256 Attestation and unlock the 20-Question Expert Quiz."
        card_id = f"quiz-{cid_hyphen}-learned" if mode == "learned" else f"quiz-{cid_hyphen}-smart"
        submit_label = "Submit 5-Question Learned Quiz &amp; Generate Keccak-256 Attestation ➔"
    else:
        page_title = f"20-Question Expert Quiz — {full_title} | LexClinic"
        meta_desc = f"🎓 Expert Tier Mastery Assessment (20 Questions) — {full_title}"
        heading_text = f"20-Question Expert Quiz — {full_title}"
        subtext = "Complete all 20 Socratic questions below (16/20+ to pass). Any answers from your 5-Question Learned Quiz are automatically pre-filled."
        card_id = f"quiz-{cid_hyphen}-expert"
        submit_label = "Submit 20-Question Expert Quiz &amp; Generate Keccak-256 Attestation ➔"

    q1_to_5 = NL.join(render_question_card(i, questions[i - 1], require_input=True) for i in range(1, 6))

    mastery_block = ""
    if mode == "expert":
        q6_to_20 = NL.join(render_question_card(i, questions[i - 1], require_input=True) for i in range(6, 21))
        mastery_block = f"""
          <div id="mastery-questions-container" style="display: block; border-top: 2px dashed var(--accent-cyan); padding-top: 1.5rem; margin-top: 1.5rem;">
            <h3 style="color: var(--accent-cyan); font-size: 1.25rem; margin-bottom: 1rem;">🎓 Expert Mastery Questions (Questions 6–20)</h3>
{q6_to_20}
          </div>"""
    elif mode == "smart":
        q6_to_20 = NL.join(render_question_card(i, questions[i - 1], require_input=False) for i in range(6, 21))
        mastery_block = f"""
          <div id="mastery-questions-container" style="display: none; border-top: 2px dashed var(--accent-cyan); padding-top: 1.5rem; margin-top: 1.5rem;">
            <h3 style="color: var(--accent-cyan); font-size: 1.25rem; margin-bottom: 1rem;">🎓 Stage 2 Unlocked: Questions 6–20 (20-Question Expert Quiz)</h3>
{q6_to_20}
          </div>"""

    return f"""{render_common_head(page_title, meta_desc)}
{render_common_header("")}

  <!-- Hero Section -->
  <section class="hero page-hero">
    <div class="container hero-content">
      <h1 class="hero-title">{heading_text}</h1>
      <p class="hero-subtitle">{subtext}</p>
      <div class="hero-actions" style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
        <a href="/101/{class_id}/quiz-learned/" data-progressive-quiz-cid="{class_id}" data-learned-href="/101/{class_id}/quiz-learned/" data-expert-href="/101/{class_id}/quiz-expert/" class="btn btn-primary" style="padding: 0.6rem 1.25rem; border-radius: 8px; text-decoration: none; background: var(--accent-gold); color: #0a1128; font-weight: 800;">📘 5-Q Learned Quiz ➔</a>
        <a href="/101/{class_id}/" class="btn btn-outline">⬅ Back to Class {class_id} Lesson</a>
      </div>
    </div>
  </section>

  <!-- Main Quiz Area -->
  <section class="section">
    <div class="container">
      <div class="card pillar-card event-module-card" id="{card_id}" style="border: 2px solid var(--accent-gold);">

        <!-- Quiz Header & Review Control Bar (Notes & Approval — No Copy Direct Link needed since each quiz has its own dedicated URL) -->
        <div class="module-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #334155;">
          <div style="flex: 1; min-width: 260px;">
            <h2 id="quiz-stage-heading" style="color: var(--accent-gold); margin: 0 0 0.35rem 0;">{heading_text}</h2>
            <p id="quiz-stage-subtext" style="color: #94a3b8; font-size: 0.95rem; margin: 0;">{subtext}</p>
          </div>
          <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap; background: rgba(15, 23, 42, 0.85); padding: 0.55rem 0.85rem; border-radius: 6px; border: 1px solid #334155;">
            <span style="font-size: 0.8rem; font-weight: 700; color: #94a3b8; margin-right: 0.25rem;">Quiz Review:</span>
            <button type="button" onclick="window.openMediaCommentModal('{card_id}', event)" class="btn btn-comment-{card_id}" style="padding: 0.3rem 0.75rem; font-size: 0.8rem; background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); border-radius: 4px; cursor: pointer; font-weight: 700;">💬 Notes</button>
            <button type="button" onclick="window.openMediaApprovalModal('{card_id}', event)" class="btn btn-approval-{card_id}" style="padding: 0.3rem 0.75rem; font-size: 0.8rem; background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); border-radius: 4px; cursor: pointer; font-weight: 700;">👍 Approval</button>
            <button type="button" onclick="window.openNavLoginModal(event)" class="btn btn-unlogged-prompt" style="padding: 0.3rem 0.75rem; font-size: 0.8rem; background: rgba(251, 191, 36, 0.15); color: #fbbf24; border: 1px solid #f59e0b; border-radius: 4px; cursor: pointer; font-weight: 700; display: inline-block;">🔒 Login for Notes &amp; Approvals</button>
          </div>
        </div>

        <!-- Prerequisite Gate Banner (Shown on quiz-expert if 5-Q Learned Quiz is not yet passed) -->
        <div id="expert-prerequisite-lock-banner" style="display: none; margin-bottom: 1.5rem; padding: 1.35rem; background: rgba(245, 158, 11, 0.12); border: 2px solid #f59e0b; border-radius: 8px; text-align: center;">
          <h3 style="color: #fbbf24; margin: 0 0 0.5rem 0; font-size: 1.2rem;">🔒 Prerequisite Required: Pass the 5-Question Learned Quiz First</h3>
          <p style="color: #e2e8f0; margin: 0 0 1.15rem 0; font-size: 0.95rem;">
            The 20-Question Expert Quiz is unlocked by scoring at least 4 / 5 (80%) on the 5-Question Learned Quiz.
          </p>
          <a href="/101/{class_id}/quiz-learned/" class="btn btn-primary" style="background: var(--accent-gold); color: #0a1128; font-weight: 800; padding: 0.7rem 1.5rem; border-radius: 6px; text-decoration: none;">
            📘 Take 5-Question Learned Quiz (/101/{class_id}/quiz-learned/) ➔
          </a>
        </div>

        <!-- Prior Completion / Unlocked Banner -->
        <div id="prior-completion-banner" style="display: none; margin-bottom: 1.5rem; padding: 1.15rem 1.35rem; background: rgba(52, 211, 153, 0.12); border: 2px solid #34d399; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h4 id="prior-completion-title" style="color: #34d399; margin: 0 0 0.25rem 0; font-size: 1.05rem;">✅ 5-Question Learned Quiz Already Passed!</h4>
              <p id="prior-completion-text" style="color: #e2e8f0; margin: 0; font-size: 0.92rem;">You have already unlocked the 20-Question Expert Quiz.</p>
            </div>
            <a href="/101/{class_id}/quiz-expert/" id="prior-completion-expert-link" class="btn btn-primary" style="background: var(--accent-cyan); color: #0a1128; font-weight: 800; padding: 0.6rem 1.25rem; border-radius: 6px; text-decoration: none;">
              Open 20-Question Expert Quiz (/101/{class_id}/quiz-expert/) ➔
            </a>
          </div>
        </div>

        <form id="quiz-{cid_nodot}-form" onsubmit="window.submitQuiz(event)">
<div id="core-questions-container">
{q1_to_5}
          </div>{mastery_block}

          <div style="text-align: center; margin-top: 2rem;">
            <button type="submit" id="submit-quiz-btn" class="btn btn-primary" style="background: var(--accent-gold); color: #0a1128; font-weight: 800; padding: 0.85rem 2.25rem; font-size: 1.1rem; border-radius: 8px; cursor: pointer;">
              {submit_label}
            </button>
          </div>
        </form>

        <!-- Result & Next-Stage Offer Card -->
        <div id="quiz-result-card" style="display: none; margin-top: 2rem; background: rgba(15, 23, 42, 0.95); border: 2px solid #34d399; border-radius: 8px; padding: 1.5rem;">
          <h3 id="quiz-result-title" style="color: #34d399; margin-bottom: 0.75rem;"></h3>
          <p id="quiz-score-summary" style="color: #e2e8f0; font-size: 1.05rem; margin-bottom: 1rem;"></p>

          <div id="quiz-hash-box" style="background: #020617; border: 1px solid #334155; padding: 1rem; border-radius: 6px; font-family: 'Fira Code', monospace; word-break: break-all; margin-bottom: 1.25rem;">
            <span style="color: #94a3b8; font-size: 0.82rem;">Keccak-256 Attestation Payload Hash:</span>
            <div id="quiz-payload-hash" style="color: var(--accent-cyan); font-weight: 700; margin-top: 0.25rem;"></div>
          </div>

          <div id="unlock-20q-offer-box" style="display: none; background: rgba(56, 189, 248, 0.12); border: 2px solid var(--accent-cyan); border-radius: 8px; padding: 1.25rem; margin-bottom: 1.25rem; text-align: center;">
            <h4 style="color: var(--accent-cyan); font-size: 1.15rem; margin-bottom: 0.5rem;">🚀 Ready for the 20-Question Expert Quiz?</h4>
            <p style="color: #e2e8f0; font-size: 0.95rem; margin-bottom: 1rem;">
              You passed the 5-Question Learned Quiz! Your Learned Attestation is recorded. Click below to proceed to the dedicated 20-Question Expert Quiz (`/101/{class_id}/quiz-expert/`).
            </p>
            <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
              <a href="/101/{class_id}/quiz-expert/" class="btn btn-primary" style="background: var(--accent-cyan); color: #0a1128; font-weight: 800; padding: 0.75rem 1.75rem; font-size: 1.02rem; border-radius: 8px; text-decoration: none;">
                Proceed to 20-Question Expert Quiz (/101/{class_id}/quiz-expert/) ➔
              </a>
              <button type="button" onclick="window.unlockMasteryQuiz()" class="btn btn-outline" style="padding: 0.75rem 1.25rem; font-size: 0.95rem;">
                Or Expand Q6–Q20 Inline Here ⬇
              </button>
            </div>
          </div>

          <!-- Legacy result IDs for compatibility -->
          <div id="quiz-results" style="display:none;"><span id="score-text"></span></div>

          <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
            <a href="/attest/" class="btn btn-outline" style="border-color: #34d399; color: #34d399;">View Public Student Attestation Ledger ➔</a>
            <a href="/101/{class_id}/" class="btn btn-outline">⬅ Back to Class {class_id} Lesson</a>
          </div>
        </div>

      </div>
    </div>
  </section>

  <script>
    (function() {{
      const CLASS_ID = "{class_id}";
      const TIER_MODE = "{mode}";
      const LEARNED_URL = "/101/{class_id}/quiz-learned/";
      const EXPERT_URL = "/101/{class_id}/quiz-expert/";
      const TITLE = "{full_title}";
      const FORM_ID = "quiz-{cid_nodot}-form";
      let currentStage = (TIER_MODE === "expert") ? 2 : 1;

      function unlockMasteryQuiz() {{
        currentStage = 2;
        const masteryContainer = document.getElementById('mastery-questions-container');
        if (!masteryContainer && TIER_MODE === 'learned' && typeof window !== 'undefined' && window.location) {{
          window.location.href = EXPERT_URL;
          return;
        }}
        if (masteryContainer) {{
          masteryContainer.style.display = 'block';
          const radios = masteryContainer.querySelectorAll('input[type="radio"]');
          radios.forEach(r => r.setAttribute('required', 'required'));
        }}
        const hEl = document.getElementById('quiz-stage-heading');
        if (hEl) hEl.innerText = '20-Question Expert Quiz — ' + TITLE;
        const sEl = document.getElementById('quiz-stage-subtext');
        if (sEl) sEl.innerText = 'Complete all 20 Socratic questions below to earn your 20/20 Expert Mastery Attestation.';
        const bEl = document.getElementById('submit-quiz-btn');
        if (bEl) bEl.innerHTML = 'Submit 20-Question Expert Quiz &amp; Generate Keccak-256 Attestation ➔';
        const oEl = document.getElementById('unlock-20q-offer-box');
        if (oEl) oEl.style.display = 'none';
      }}
      window.unlockMasteryQuiz = unlockMasteryQuiz;

      function restoreSavedQuizState() {{
        try {{
          if (localStorage.getItem('lexclinic_quiz_reset_20261111_v2') !== '1') {{
            const rawInit = JSON.parse(localStorage.getItem('lexclinic_quiz_submissions') || '[]');
            const initSubs = Array.isArray(rawInit) ? rawInit : Object.values(rawInit);
            const cleanedInit = initSubs.filter(s => {{
              if (!s) return false;
              const sc = String(s.score || '');
              if (sc.split('/').length > 2) return false;
              const cid = String(s.class_id || '');
              const ts = String(s.timestamp || '');
              if ((cid === '6.1' || cid === '6.2' || cid === 'class_6.1' || cid === 'class_6.2') && (!ts || ts < '2026-11-11T00:00:00.000Z')) return false;
              return true;
            }});
            localStorage.setItem('lexclinic_quiz_submissions', JSON.stringify(cleanedInit));
            if (localStorage.removeItem) {{
              localStorage.removeItem('lexclinic_quiz_answers_6.2');
              localStorage.removeItem('lexclinic_quiz_answers_6.1');
            }}
            localStorage.setItem('lexclinic_quiz_reset_20261111_v2', '1');
          }}

          const savedAnswers = JSON.parse(localStorage.getItem('lexclinic_quiz_answers_' + CLASS_ID) || '{{}}');
          const form = document.getElementById(FORM_ID);
          if (form && savedAnswers && typeof savedAnswers === 'object') {{
            Object.keys(savedAnswers).forEach(qKey => {{
              const val = savedAnswers[qKey];
              if (val && form.querySelector) {{
                const radio = form.querySelector(`input[name="${{qKey}}"][value="${{val.toUpperCase()}}"]`);
                if (radio) radio.checked = true;
              }}
            }});
          }}

          const userEmail = (window.getSanitizedEmail ? window.getSanitizedEmail() : '') || (localStorage.getItem('lexclinic_user_email') || '').toLowerCase().trim();
          const rawSubs = JSON.parse(localStorage.getItem('lexclinic_quiz_submissions') || '[]');
          const localSubs = Array.isArray(rawSubs) ? rawSubs : Object.values(rawSubs);
          const matching = localSubs.filter(s => s && (s.class_id === CLASS_ID || s.class_id === 'class_' + CLASS_ID || s.class_id === CLASS_ID + '_learned' || s.class_id === CLASS_ID + '_expert'));

          const hasPassedLearned = matching.some(s => {{
            const sc = String(s.score || '');
            if (sc.includes('/')) {{
              const parts = sc.split('/').map(Number);
              if (parts.length > 2) return false;
              return parts[0] >= 4;
            }}
            return Number(sc) >= 4;
          }});

          if (hasPassedLearned) {{
            const lockBanner = document.getElementById('expert-prerequisite-lock-banner');
            if (lockBanner) lockBanner.style.display = 'none';
            if (form && form.style) form.style.display = 'block';
            const banner = document.getElementById('prior-completion-banner');
            if (banner) banner.style.display = 'block';
            if (TIER_MODE === 'smart') {{
              unlockMasteryQuiz();
              if (window.location && window.location.pathname && !window.location.pathname.includes('quiz-expert') && !window.location.pathname.includes('quiz-learned')) {{
                if (window.history && window.history.replaceState) {{
                  window.history.replaceState({{}}, '', EXPERT_URL);
                }}
              }}
            }}
          }} else if (TIER_MODE === 'expert') {{
            const lockBanner = document.getElementById('expert-prerequisite-lock-banner');
            if (lockBanner) lockBanner.style.display = 'block';
            if (form && form.style) form.style.display = 'none';
          }}

          if (userEmail && window.fetch) {{
            window.fetch('/api/user-attest?email=' + encodeURIComponent(userEmail))
              .then(r => r.ok ? r.json() : null)
              .then(data => {{
                if (!data || !Array.isArray(data.submissions)) return;
                const remoteMatch = data.submissions.filter(s => s && (s.class_id === CLASS_ID || s.class_id === 'class_' + CLASS_ID));
                const remotePassedLearned = remoteMatch.some(s => {{
                  const sc = String(s.score || '');
                  if (sc.includes('/')) {{
                    const parts = sc.split('/').map(Number);
                    if (parts.length > 2) return false;
                    return parts[0] >= 4;
                  }}
                  return Number(sc) >= 4;
                }});
                if (remotePassedLearned) {{
                  const lockBanner = document.getElementById('expert-prerequisite-lock-banner');
                  if (lockBanner) lockBanner.style.display = 'none';
                  if (form && form.style) form.style.display = 'block';
                  const banner = document.getElementById('prior-completion-banner');
                  if (banner) banner.style.display = 'block';
                  if (TIER_MODE === 'smart') {{
                    unlockMasteryQuiz();
                  }}
                }}
              }})
              .catch(() => {{}});
          }}
        }} catch (e) {{}}
      }}

      async function submitQuiz(event) {{
        if (event && event.preventDefault) event.preventDefault();
        const form = document.getElementById(FORM_ID) || document.getElementById('quiz-form');
        const totalQuestions = (TIER_MODE === "learned") ? 5 : (currentStage === 1 ? 5 : 20);
        let score = 0;
        const collectedAnswers = {{}};

        for (let i = 1; i <= totalQuestions; i++) {{
          let val = '';
          if (form) {{
            const selected = form.querySelector ? form.querySelector(`input[name="q${{i}}"]:checked`) : null;
            if (selected && selected.value) {{
              val = selected.value;
            }} else if (form['q' + i] && form['q' + i].value) {{
              val = form['q' + i].value;
            }}
          }}
          collectedAnswers['q' + i] = val;
          const card = form && form.querySelector ? form.querySelector(`.quiz-question-card[data-qnum="${{i}}"]`) : null;
          if (val && val.toUpperCase() === 'A') {{
            score++;
            if (card && card.style) card.style.borderColor = '#34d399';
          }} else {{
            if (card && card.style) card.style.borderColor = '#f87171';
          }}
        }}

        try {{
          const prevAnswers = JSON.parse(localStorage.getItem('lexclinic_quiz_answers_' + CLASS_ID) || '{{}}');
          localStorage.setItem('lexclinic_quiz_answers_' + CLASS_ID, JSON.stringify({{ ...prevAnswers, ...collectedAnswers }}));
        }} catch (e) {{}}

        const passed = (totalQuestions === 5) ? (score >= 4) : (score >= 16);
        const userEmail = (window.getSanitizedEmail ? window.getSanitizedEmail() : "") || (localStorage.getItem("lexclinic_user_email") || "").trim() || "student@lex.clinic";
        const timestamp = new Date().toISOString();
        const resultCard = document.getElementById('quiz-result-card');
        const resultTitle = document.getElementById('quiz-result-title');
        const scoreSummary = document.getElementById('quiz-score-summary');
        const hashBox = document.getElementById('quiz-hash-box');
        const offerBox = document.getElementById('unlock-20q-offer-box');

        if (resultCard) resultCard.style.display = 'block';

        if (!passed) {{
          if (resultCard) resultCard.style.borderColor = '#f59e0b';
          if (resultTitle) {{
            resultTitle.style.color = '#fbbf24';
            resultTitle.innerText = `⚠️ Score: ${{score}} / ${{totalQuestions}} — Pass Threshold Not Met`;
          }}
          if (scoreSummary) {{
            scoreSummary.innerText = totalQuestions === 5
              ? `You scored ${{score}} / 5. Score at least 4 / 5 (80%) to pass the Learned Check and unlock the 20-Question Expert Quiz. Review the highlighted questions above and submit again!`
              : `You scored ${{score}} / 20. Score at least 16 / 20 (80%) to earn the Expert Mastery Attestation. Review the highlighted questions above and submit again!`;
          }}
          if (hashBox) hashBox.style.display = 'none';
          if (offerBox) offerBox.style.display = 'none';
          if (resultCard && resultCard.scrollIntoView) resultCard.scrollIntoView({{ behavior: 'smooth', block: 'nearest' }});
          return;
        }}

        if (resultCard) resultCard.style.borderColor = '#34d399';
        if (resultTitle) resultTitle.style.color = '#34d399';
        if (hashBox) hashBox.style.display = 'block';

        const rawPayload = `${{userEmail}}|${{CLASS_ID}}|score_${{score}}_${{totalQuestions}}|${{timestamp}}`;
        let payloadHash = "0x" + Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('');
        if (window.crypto && window.crypto.subtle) {{
          try {{
            const msgUint8 = new TextEncoder().encode(rawPayload);
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            payloadHash = "0x" + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          }} catch (e) {{}}
        }}

        const tierLabel = totalQuestions === 5 ? "Learned Quiz (5-Q)" : "Expert Quiz (20-Q)";
        const submissionData = {{
          email: userEmail,
          class_id: CLASS_ID,
          tier: totalQuestions === 5 ? "learned" : "expert",
          score: `${{score}}/${{totalQuestions}}`,
          answered: totalQuestions,
          total: totalQuestions,
          payload_hash: payloadHash,
          timestamp: timestamp,
          summary: `${{TITLE}} (${{tierLabel}}) - Score: ${{score}}/${{totalQuestions}}`
        }};

        try {{
          const rawSubs = JSON.parse(localStorage.getItem("lexclinic_quiz_submissions") || "[]");
          const localSubs = Array.isArray(rawSubs) ? rawSubs : Object.values(rawSubs);
          const filtered = localSubs.filter(s => !(s && s.email === userEmail && (s.class_id === CLASS_ID || s.class_id === "class_" + CLASS_ID)));
          filtered.push(submissionData);
          localStorage.setItem("lexclinic_quiz_submissions", JSON.stringify(filtered));
        }} catch (e) {{}}

        try {{
          await fetch('/api/submit-quiz', {{
            method: 'POST',
            headers: {{ 'Content-Type': 'application/json' }},
            body: JSON.stringify(submissionData)
          }});
        }} catch (err) {{}}

        if (resultTitle) {{
          resultTitle.innerText = totalQuestions === 5
            ? '🎉 5-Question Learned Quiz Passed & Cryptographically Verified!'
            : '🏆 20-Question Expert Quiz Passed & Cryptographically Verified!';
        }}
        if (scoreSummary) {{
          scoreSummary.innerText = `Score: ${{score}} / ${{totalQuestions}} (${{Math.round((score / totalQuestions) * 100)}}%) [${{tierLabel}}] — Recorded for ${{userEmail}}`;
        }}
        const hashEl = document.getElementById('quiz-payload-hash');
        if (hashEl) hashEl.innerText = payloadHash;

        const legacyRes = document.getElementById('quiz-results');
        if (legacyRes) legacyRes.style.display = 'block';
        const legacyScore = document.getElementById('score-text');
        if (legacyScore) legacyScore.innerText = `Score: ${{score}} / ${{totalQuestions}} (${{payloadHash}})`;

        if (totalQuestions === 5 && offerBox) {{
          offerBox.style.display = 'block';
        }} else if (offerBox) {{
          offerBox.style.display = 'none';
        }}

        if (resultCard && resultCard.scrollIntoView) resultCard.scrollIntoView({{ behavior: 'smooth', block: 'nearest' }});
      }}

      window.submitQuiz = submitQuiz;
      window.submitQuiz{cid_nodot} = window.submitQuiz; window.unlockMasteryQuiz{cid_nodot} = window.unlockMasteryQuiz;

      restoreSavedQuizState();
      if (document.addEventListener) {{
        document.addEventListener('DOMContentLoaded', restoreSavedQuizState);
      }}
    }})();
  </script>

{render_common_footer()}"""


def render_101_hub_card(spec: dict) -> str:
    class_id = spec["class_id"]
    lesson_title = spec["lesson_title"]
    is_odd = class_id.endswith(".1")
    accent = "var(--accent-cyan)" if is_odd else "var(--accent-gold)"
    default_icon = "⚖️" if is_odd else "🎥"
    icon = spec.get("hub_card_icon", default_icon)
    hub_summary_html = spec.get("hub_card_summary_html") or html.escape(spec["meta_description"])
    socratic = spec.get("socratic_companion") or {}
    soc_href = socratic.get("href", "")
    soc_btn = socratic.get("button_label", "")
    has_recorded_socratic = bool(soc_href and re.match(r"^/event/\d{4}-\d{2}-\d{2}/$", soc_href))
    soc_link_html = (
        f' <a href="{soc_href}" class="btn btn-outline" style="font-size: 0.84rem; padding: 0.45rem 0.85rem; border-color: var(--accent-cyan); color: var(--accent-cyan);">{soc_btn}</a>'
        if has_recorded_socratic
        else ""
    )

    return f"""        <!-- Class {class_id} Card -->
        <div class="card pillar-card" style="border: 2px solid {accent};">
          <div class="card-icon">{icon}</div>
          <div class="event-date-tag" style="color: {accent}; font-weight: 600; margin-bottom: 0.5rem;">Lesson {class_id}</div>
          <h3 style="color: {accent}; margin-bottom: 0.5rem;">Class {class_id}: {lesson_title}</h3>
          <p style="margin-bottom: 1.25rem;">
            {hub_summary_html}
          </p>
          <div class="card-actions" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <a href="/101/{class_id}/" class="btn btn-primary" style="font-size: 0.86rem; padding: 0.45rem 0.9rem;">📘 Open Module {class_id} ➔</a>{soc_link_html}
            <a href="/101/{class_id}/quiz-learned/" data-progressive-quiz-cid="{class_id}" data-learned-href="/101/{class_id}/quiz-learned/" data-expert-href="/101/{class_id}/quiz-expert/" class="btn btn-outline" style="font-size: 0.84rem; padding: 0.45rem 0.85rem; border-color: var(--accent-gold); color: var(--accent-gold);">📘 Take 5-Q Learned Quiz ➔</a>
          </div>
        </div>"""


def upsert_101_hub_card(web_dir: Path, spec: dict) -> None:
    hub_path = web_dir / "101" / "index.html"
    if not hub_path.exists():
        return
    content = hub_path.read_text(encoding="utf-8")
    class_id = spec["class_id"]
    new_card = render_101_hub_card(spec)

    card_pattern = re.compile(
        rf'([ 	]*<!-- Class {re.escape(class_id)} Card -->\s*<div class="card pillar-card".*?</div>\s*</div>)',
        re.DOTALL,
    )
    if card_pattern.search(content):
        content = card_pattern.sub(new_card, content, count=1)
        hub_path.write_text(content, encoding="utf-8")
        return

    all_cards = list(re.finditer(r"[ 	]*<!-- Class (\d+\.\d+) Card -->", content))
    target_val = tuple(map(int, class_id.split(".")))
    insert_pos = None
    for m in all_cards:
        c_val = tuple(map(int, m.group(1).split(".")))
        if c_val > target_val:
            insert_pos = m.start()
            break

    if insert_pos is not None:
        content = content[:insert_pos] + new_card + NL + NL + content[insert_pos:]
    else:
        last_card_end = content.rfind("<!-- Class ")
        if last_card_end != -1:
            end_div = re.search(r"</div>\s*</div>", content[last_card_end:])
            if end_div:
                pos = last_card_end + end_div.end()
                content = content[:pos] + NL + NL + new_card + content[pos:]
    hub_path.write_text(content, encoding="utf-8")


def sync_101_attest_and_linter(web_dir: Path, spec: dict) -> None:
    """Idempotently registers Class X.Y in /attest/index.html and Linter Rules 04 & 07."""
    cid = spec["class_id"]
    cid_under = cid.replace(".", "_")
    lesson_title = spec["lesson_title"]
    yt_id = spec["youtube_id"]
    sp_id = spec["spotify_id"]

    # 1. /attest/index.html
    attest_path = web_dir / "attest" / "index.html"
    if attest_path.exists():
        att_raw = attest_path.read_text(encoding="utf-8")
        entry_line = (
            f'      {{ id: "{cid}", aliases: ["{cid}", "class_{cid}", "class_{cid_under}"], '
            f'title: "Class {cid}: {lesson_title}", category: "Legal Engineering 101", '
            f'totalQuestions: 20, url: "/101/{cid}/quiz.html", '
            f'learnedUrl: "/101/{cid}/quiz-learned/", expertUrl: "/101/{cid}/quiz-expert/" }},'
        )
        existing_pat = re.compile(rf'^[ \t]*\{{\s*id:\s*"{re.escape(cid)}".*?\}},?$', re.MULTILINE)
        if existing_pat.search(att_raw):
            att_raw = existing_pat.sub(entry_line, att_raw, count=1)
        else:
            anchor = '      { id: "101", aliases: ["101", "101-all"]'
            if anchor in att_raw:
                att_raw = att_raw.replace(anchor, entry_line + NL + anchor, 1)
        attest_path.write_text(att_raw, encoding="utf-8")

    # 2. .linter/rules/04-spotify-101-embeds.js
    r04_path = web_dir / ".linter" / "rules" / "04-spotify-101-embeds.js"
    if r04_path.exists():
        r04_raw = r04_path.read_text(encoding="utf-8")
        if f'mod: "{cid}"' not in r04_raw:
            new_item = f'    {{ mod: "{cid}", yt: "{yt_id}", spotify: "{sp_id}" }}'
            r04_raw = re.sub(
                r'(\{\s*mod:\s*"\d+\.\d+",\s*yt:\s*"[^"]+",\s*spotify:\s*"[^"]+"\s*\})\s*(\n\s*\];)',
                rf"\1,{NL}{new_item}\2",
                r04_raw,
                count=1,
            )
            r04_path.write_text(r04_raw, encoding="utf-8")

    # 3. .linter/rules/07-attest-contracts.js
    r07_path = web_dir / ".linter" / "rules" / "07-attest-contracts.js"
    if r07_path.exists():
        r07_raw = r07_path.read_text(encoding="utf-8")
        key_str = f'"/101/{cid}/quiz.html": "class_{cid}"'
        if key_str not in r07_raw:
            r07_raw = re.sub(
                r'("/101/\d+\.\d+/quiz\.html":\s*"class_\d+\.\d+")',
                rf"\1,{NL}    {key_str}",
                r07_raw,
                count=1,
            )
            r07_path.write_text(r07_raw, encoding="utf-8")


def sync_event_hubs_and_linter(web_dir: Path, spec: dict) -> None:
    """
    Idempotently synchronizes companion 101 links, monthly archive (/event/YYYY-MM/index.html),
    main event hub (/event/index.html), and Linter Rule 05 when --update-hub is passed with --compile-event.
    """
    event_date = spec["event_date"]
    month_str = event_date[:7]
    class_id = spec["class_id"]
    lesson_title = spec["lesson_title"]
    from datetime import datetime as _dt
    default_short = _dt.strptime(event_date, "%Y-%m-%d").strftime("%b %-d")
    short_date = spec.get("short_date", default_short)
    clips_count = len(spec.get("clips", []))
    first_yt = spec["clips"][0]["youtube_id"] if spec.get("clips") else ""
    summary_html = spec.get(
        "hub_card_summary_html",
        f"Live cohort Socratic discussion &amp; {clips_count} explainer clips accompanying <strong>Legal Engineering 101 Class {class_id}</strong>.",
    )

    # 1. Flip 101/<class_id>/index.html & 101/index.html companion Socratic buttons to recorded event URL
    mod_idx = web_dir / "101" / class_id / "index.html"
    if mod_idx.exists():
        m_raw = mod_idx.read_text(encoding="utf-8")
        m_raw = re.sub(
            r'<a href="/event/"([^>]*)>🔥[^<]*Live Socratic Session[^<]*</a>',
            f'<a href="/event/{event_date}/"\\1>🗣️ {short_date} Socratic Recording ➔</a>',
            m_raw,
        )
        mod_idx.write_text(m_raw, encoding="utf-8")

    hub_101 = web_dir / "101" / "index.html"
    if hub_101.exists():
        h_raw = hub_101.read_text(encoding="utf-8")
        card_pat = re.compile(
            rf'(<!-- Class {re.escape(class_id)} Card -->.*?<a href="/101/{re.escape(class_id)}/"[^>]*>[^<]*</a>\s*)'
            rf'<a href="[^"]*"([^>]*)>[^<]*</a>',
            re.DOTALL,
        )
        if card_pat.search(h_raw):
            h_raw = card_pat.sub(
                rf'\1<a href="/event/{event_date}/"\2>🗣️ {short_date} Socratic Recording ➔</a>',
                h_raw,
                count=1,
            )
            hub_101.write_text(h_raw, encoding="utf-8")

    # 2. Upsert card into /event/<YYYY-MM>/index.html
    month_idx = web_dir / "event" / month_str / "index.html"
    if month_idx.exists():
        m_html = month_idx.read_text(encoding="utf-8")
        if f'/event/{event_date}/' not in m_html:
            month_card = f"""          <div class="card pillar-card event-list-card" data-event-category="class" style="border: 2px solid var(--accent-gold); background: rgba(10, 17, 40, 0.85); padding: 1.5rem;">
            <div class="event-date-tag" style="color: var(--accent-gold); font-weight: 700; margin-bottom: 0.4rem;">{short_date}, 2026 • 🎓 101 Live Socratic Session (Class {class_id})</div>
            <h3 style="color: var(--accent-gold); font-size: 1.3rem; margin-bottom: 0.75rem;">LexClinic 2026 — Lesson {class_id}: {lesson_title}</h3>
            <p style="margin-bottom: 1.25rem; color: #cbd5e1; line-height: 1.6;">
              {summary_html}
            </p>
            <div class="card-actions" style="display: flex; gap: 0.65rem; flex-wrap: wrap;">
              <a href="/event/{event_date}/" class="btn btn-primary" style="background: var(--accent-gold); color: #0a1128; font-weight: 800; padding: 0.5rem 1.05rem; border-radius: 6px; font-size: 0.88rem;">🗣️ Open Event Recording ➔</a><a href="/101/{class_id}/" class="btn btn-outline" style="padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.88rem;">📘 101 Module {class_id} ➔</a><a href="/101/{class_id}/quiz-learned/" data-progressive-quiz-cid="{class_id}" data-learned-href="/101/{class_id}/quiz-learned/" data-expert-href="/101/{class_id}/quiz-expert/" class="btn btn-outline" style="padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.88rem;">📘 Take 5-Q Learned Quiz ➔</a>
            </div>
          </div>"""
            m_html = m_html.replace(
                '<div class="grid grid-2" style="gap: 1.5rem;">',
                '<div class="grid grid-2" style="gap: 1.5rem;">' + NL + NL + month_card,
                1,
            )
            month_idx.write_text(m_html, encoding="utf-8")

    # 3. Rotate #recent-three-events-grid in /event/index.html if not already present
    ev_hub = web_dir / "event" / "index.html"
    if ev_hub.exists():
        eh_raw = ev_hub.read_text(encoding="utf-8")
        if f'/event/{event_date}/' not in eh_raw:
            grid_pat = re.compile(
                r'(<div class="grid grid-3" id="recent-three-events-grid"[^>]*>\s*)(.*?)(\s*</div>\s*</div>\s*</div>\s*</section>)',
                re.DOTALL,
            )
            gm = grid_pat.search(eh_raw)
            if gm:
                cards_block = gm.group(2)
                card_matches = list(
                    re.finditer(
                        r'(?:<!-- Recent Class \d+:.*?-->\s*)?<div class="card pillar-card event-list-card"[^>]*data-default-recent="true"[^>]*>.*?</div>\s*</div>',
                        cards_block,
                        re.DOTALL,
                    )
                )
                kept_cards = []
                for idx, cm in enumerate(card_matches[:2], start=2):
                    c_txt = cm.group(0)
                    c_txt = re.sub(r"<!-- Recent Class \d+:", f"<!-- Recent Class {idx}:", c_txt)
                    c_txt = c_txt.replace("border: 2px solid var(--accent-gold); background: rgba(10, 17, 40, 0.95);", "border: 1px solid var(--border-color); background: rgba(10, 17, 40, 0.8);")
                    c_txt = re.sub(r'(<div class="event-date-tag" style="color:\s*)var\(--accent-gold\)', r"\1var(--accent-cyan)", c_txt)
                    c_txt = re.sub(r'(<h3 style="color:\s*)var\(--accent-gold\)', r"\1var(--accent-cyan)", c_txt)
                    kept_cards.append("          " + c_txt.strip())

                new_recent_card = f"""          <!-- Recent Class 1: {short_date}, 2026 (Class {class_id}) -->
          <div class="card pillar-card event-list-card" data-event-category="class" data-default-recent="true" style="border: 2px solid var(--accent-gold); background: rgba(10, 17, 40, 0.95); padding: 1.5rem;">
            <div class="event-date-tag" style="color: var(--accent-gold); font-weight: 700; margin-bottom: 0.4rem;">{short_date}, 2026 • 🎓 101 Live Socratic Session (Class {class_id})</div>
            <h3 style="color: var(--accent-gold); font-size: 1.25rem; margin-bottom: 0.75rem;">Lesson {class_id}: {lesson_title}</h3>
            <p style="margin-bottom: 1.25rem; color: #cbd5e1; line-height: 1.6; font-size: 0.95rem;">
              {summary_html}
            </p>
            <div class="card-actions" style="display: flex; gap: 0.55rem; flex-wrap: wrap;">
              <a href="/event/{event_date}/" class="btn btn-primary" style="background: var(--accent-gold); color: #0a1128; font-weight: 800; padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.88rem;">🗣️ Event Recording ➔</a>
              <a href="/101/{class_id}/" class="btn btn-outline" style="padding: 0.5rem 0.95rem; border-radius: 6px; font-size: 0.88rem; border-color: var(--accent-cyan); color: var(--accent-cyan);">📘 101 Module {class_id} ➔</a>
            </div>
          </div>"""
                all_three = (NL + NL).join([new_recent_card] + kept_cards)
                eh_raw = eh_raw[: gm.start(2)] + NL + all_three + NL + eh_raw[gm.end(2) :]
                ev_hub.write_text(eh_raw, encoding="utf-8")

    # 4. Register in .linter/rules/05-event-pages-contracts.js
    r05_path = web_dir / ".linter" / "rules" / "05-event-pages-contracts.js"
    if r05_path.exists():
        r05_raw = r05_path.read_text(encoding="utf-8")
        if f'date: "{event_date}"' not in r05_raw:
            new_ev_line = (
                f'    {{ date: "{event_date}", month: "{month_str}", mod: "{class_id}", '
                f'minClips: {clips_count}, mustHaveYt: "{first_yt}", inRecent3: true }}'
            )
            r05_raw = re.sub(
                r'(\{\s*date:\s*"\d{4}-\d{2}-\d{2}".*?inRecent3:\s*(?:true|false)\s*\})\s*(\n\s*\];)',
                rf"\1,{NL}{new_ev_line}\2",
                r05_raw,
                count=1,
            )
            # Ensure only the last 3 entries in requiredEvents have inRecent3: true
            ev_lines = list(re.finditer(r'\{\s*date:\s*"\d{4}-\d{2}-\d{2}".*?inRecent3:\s*(true|false)\s*\}', r05_raw))
            for idx, m in enumerate(ev_lines):
                should_be_recent = idx >= len(ev_lines) - 3
                old_block = m.group(0)
                new_block = re.sub(r"inRecent3:\s*(?:true|false)", f"inRecent3: {'true' if should_be_recent else 'false'}", old_block)
                r05_raw = r05_raw.replace(old_block, new_block, 1)
            r05_path.write_text(r05_raw, encoding="utf-8")


def extract_event_spec(web_dir: Path, event_date: str) -> dict:
    ev_path = web_dir / "event" / event_date / "index.html"
    raw = ev_path.read_text(encoding="utf-8")

    title_m = re.search(r"<title>(.*?)</title>", raw, re.DOTALL)
    desc_m = re.search(r'<meta name="description" content="(.*?)">', raw)
    h1_m = re.search(r'<h1 class="hero-title">(.*?)</h1>', raw, re.DOTALL)
    sub_m = re.search(r'<p class="hero-subtitle">\s*(.*?)\s*</p>', raw, re.DOTALL)
    cid_m = re.search(r'data-progressive-quiz-cid="(\d+\.\d+)"', raw)
    class_id = cid_m.group(1) if cid_m else "6.2"

    lesson_m = re.search(rf"Lesson {re.escape(class_id)}:\s*(.*)", h1_m.group(1).strip() if h1_m else "")
    lesson_title = lesson_m.group(1).strip() if lesson_m else ""

    ov_card_m = re.search(
        r'Socratic Session Overview &amp; Key Takeaways\s*</h2>\s*(<p.*?</p>)\s*(<div style="display: grid;.*?</div>\s*</div>)\s*</div>',
        raw,
        re.DOTALL,
    )
    overview_html = ov_card_m.group(1).strip() if ov_card_m else ""
    takeaways_html = ov_card_m.group(2).strip() if ov_card_m else ""

    audio_m = re.search(
        r'<!-- 2\. Native Audio Player Card -->\s*<div class="card pillar-card" id="([^"]+)"[^>]*>\s*<h3[^>]*>\s*(.*?)\s*</h3>',
        raw,
        re.DOTALL,
    )
    audio_slug = audio_m.group(1).strip() if audio_m else "session-audio"
    audio_title = audio_m.group(2).strip() if audio_m else "Full Session Audio Stream"

    clips = []
    clips_section = raw.split("<!-- 3. Explainer Video Clips -->")[-1].split("<!-- 4. Bottom Actions -->")[0]
    for cm in re.finditer(
        r'<div class="card pillar-card" id="([^"]+)"[^>]*>\s*<h3[^>]*>\s*(.*?)\s*</h3>.*?<iframe id="([^"]+)"[^>]*src="https://www\.youtube\.com/embed/([^"?]+)',
        clips_section,
        re.DOTALL,
    ):
        clips.append(
            {
                "slug": cm.group(1).strip(),
                "title": cm.group(2).strip(),
                "iframe_id": cm.group(3).strip(),
                "youtube_id": cm.group(4).strip(),
            }
        )

    return {
        "type": "socratic_event",
        "event_date": event_date,
        "class_id": class_id,
        "lesson_title": lesson_title,
        "page_title": title_m.group(1).strip() if title_m else "",
        "meta_description": html.unescape(desc_m.group(1).strip()) if desc_m else "",
        "hero_title": h1_m.group(1).strip() if h1_m else "",
        "hero_subtitle_html": sub_m.group(1).strip() if sub_m else "",
        "overview_html": overview_html,
        "takeaways_html": takeaways_html,
        "audio_slug": audio_slug,
        "audio_title": audio_title,
        "clips": clips,
    }


def extract_101_spec(web_dir: Path, class_id: str) -> dict:
    mod_path = web_dir / "101" / class_id / "index.html"
    exp_path = web_dir / "101" / class_id / "quiz-expert" / "index.html"
    hub_path = web_dir / "101" / "index.html"

    raw = mod_path.read_text(encoding="utf-8")
    exp_raw = exp_path.read_text(encoding="utf-8")
    hub_raw = hub_path.read_text(encoding="utf-8") if hub_path.exists() else ""

    h1_m = re.search(r'<h1 class="hero-title">Class \d+\.\d+:\s*(.*?)</h1>', raw, re.DOTALL)
    lesson_title = h1_m.group(1).strip() if h1_m else ""
    desc_m = re.search(r'<meta name="description" content="(.*?)">', raw)
    sub_m = re.search(r'<p class="hero-subtitle">\s*(.*?)\s*</p>', raw, re.DOTALL)
    ov_m = re.search(r"Lesson Overview: Class \d+\.\d+:.*?</h2>\s*(<p.*?</p>)\s*</div>", raw, re.DOTALL)

    vid_m = re.search(
        r'<!-- Video Lecture Card -->\s*<div class="card pillar-card" id="([^"]+)".*?youtube\.com/embed/([^"?]+)',
        raw,
        re.DOTALL,
    )
    sp_m = re.search(r'open\.spotify\.com/embed/episode/([^"?]+)', raw)

    soc_m = re.search(
        r'id="card_101_[^"]+_socratic_companion".*?<div style="color: var\(--accent-cyan\); font-weight: 700; font-size: 0\.85rem; margin-bottom: 0\.25rem;">(.*?)</div>.*?<p style="color: #cbd5e1; font-size: 0\.94rem; margin: 0; line-height: 1\.5;">(.*?)</p>.*?<a href="([^"]+)"[^>]*>(.*?)</a>',
        raw,
        re.DOTALL,
    )

    hub_card_m = re.search(
        rf'<!-- Class {re.escape(class_id)} Card -->\s*<div class="card pillar-card"[^>]*>\s*<div class="card-icon">(.*?)</div>.*?<p style="margin-bottom: 1\.25rem;">\s*(.*?)\s*</p>',
        hub_raw,
        re.DOTALL,
    )

    questions = []
    for qm in re.finditer(
        r'<div class="quiz-question-card" data-qnum="(\d+)"[^>]*>\s*<h4[^>]*>\d+\.\s*(.*?)</h4>\s*'
        r'<label[^>]*><input[^>]*value="A"[^>]*>\s*A\)\s*(.*?)</label>\s*'
        r'<label[^>]*><input[^>]*value="B"[^>]*>\s*B\)\s*(.*?)</label>\s*'
        r'<label[^>]*><input[^>]*value="C"[^>]*>\s*C\)\s*(.*?)</label>',
        exp_raw,
        re.DOTALL,
    ):
        questions.append(
            {
                "prompt": qm.group(2).strip(),
                "options": {
                    "A": qm.group(3).strip(),
                    "B": qm.group(4).strip(),
                    "C": qm.group(5).strip(),
                },
            }
        )

    return {
        "type": "module_101",
        "class_id": class_id,
        "lesson_title": lesson_title,
        "meta_description": html.unescape(desc_m.group(1).strip()) if desc_m else "",
        "hero_subtitle_html": sub_m.group(1).strip() if sub_m else "",
        "overview_html": ov_m.group(1).strip() if ov_m else "",
        "video_slug": vid_m.group(1).strip() if vid_m else slugify(f"Class {class_id} {lesson_title}"),
        "youtube_id": vid_m.group(2).strip() if vid_m else "",
        "spotify_id": sp_m.group(1).strip() if sp_m else "",
        "hub_card_icon": hub_card_m.group(1).strip() if hub_card_m else ("⚖️" if class_id.endswith(".1") else "🎥"),
        "hub_card_summary_html": hub_card_m.group(2).strip() if hub_card_m else "",
        "socratic_companion": {
            "badge_text": soc_m.group(1).strip() if soc_m else "",
            "description_html": soc_m.group(2).strip() if soc_m else "",
            "href": soc_m.group(3).strip() if soc_m else "/event/",
            "button_label": soc_m.group(4).strip() if soc_m else "🔥 Upcoming Live Socratic Session ➔",
        },
        "questions": questions,
    }


def main():
    parser = argparse.ArgumentParser(description="LexClinic Hybrid HTML + JSON Weekly Sync Compiler")
    parser.add_argument("--web-dir", default="kairos_repsl/website", help="Path to website root directory")
    parser.add_argument("--compile-event", help="Path to Socratic Event JSON spec to compile")
    parser.add_argument("--compile-101", help="Path to 101 Module JSON spec to compile (landing page + 3 quiz routes)")
    parser.add_argument("--update-hub", action="store_true", help="Also upsert the Class X.Y card in /101/index.html")
    parser.add_argument("--extract-event", help="Extract JSON spec from existing /event/<YYYY-MM-DD>/index.html")
    parser.add_argument("--extract-101", help="Extract JSON spec from existing /101/<X.Y>/ module & quizzes")
    parser.add_argument("--out", help="Output path for extracted JSON spec")
    args = parser.parse_args()

    web_dir = Path(args.web_dir).resolve()

    if args.extract_event:
        spec = extract_event_spec(web_dir, args.extract_event)
        out_str = json.dumps(spec, indent=2, ensure_ascii=False) + NL
        if args.out:
            out_path = Path(args.out)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(out_str, encoding="utf-8")
            print(f"✅ Extracted Event Spec -> {out_path}")
        else:
            print(out_str)
        return

    if args.extract_101:
        spec = extract_101_spec(web_dir, args.extract_101)
        out_str = json.dumps(spec, indent=2, ensure_ascii=False) + NL
        if args.out:
            out_path = Path(args.out)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(out_str, encoding="utf-8")
            print(f"✅ Extracted 101 Module Spec -> {out_path}")
        else:
            print(out_str)
        return

    if args.compile_event:
        spec_path = Path(args.compile_event).resolve()
        spec = json.loads(spec_path.read_text(encoding="utf-8"))
        html_out = render_event_page(spec, spec_path.parent)
        out_file = web_dir / "event" / spec["event_date"] / "index.html"
        out_file.parent.mkdir(parents=True, exist_ok=True)
        out_file.write_text(html_out, encoding="utf-8")
        if args.update_hub:
            sync_event_hubs_and_linter(web_dir, spec)
        print(f"✅ Compiled Socratic Event page -> {out_file}")

    if args.compile_101:
        spec_path = Path(args.compile_101).resolve()
        spec = json.loads(spec_path.read_text(encoding="utf-8"))
        cid = spec["class_id"]
        mod_dir = web_dir / "101" / cid
        (mod_dir / "quiz-learned").mkdir(parents=True, exist_ok=True)
        (mod_dir / "quiz-expert").mkdir(parents=True, exist_ok=True)

        (mod_dir / "index.html").write_text(render_101_module_page(spec, spec_path.parent), encoding="utf-8")
        (mod_dir / "quiz-learned" / "index.html").write_text(render_quiz_page(spec, "learned"), encoding="utf-8")
        (mod_dir / "quiz-expert" / "index.html").write_text(render_quiz_page(spec, "expert"), encoding="utf-8")
        (mod_dir / "quiz.html").write_text(render_quiz_page(spec, "smart"), encoding="utf-8")
        if args.update_hub:
            upsert_101_hub_card(web_dir, spec)
            sync_101_attest_and_linter(web_dir, spec)
        print(f"✅ Compiled 101 Module {cid} (index.html + quiz-learned + quiz-expert + quiz.html) -> {mod_dir}")


if __name__ == "__main__":
    main()
