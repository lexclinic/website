#!/usr/bin/env python3
"""
LexClinic Sovereign Voice Cloning & Media Re-Voicing Engine (Kyle MacLean Smith)
================================================================================
Extracts clean solo reference voice datasets of Kyle MacLean Smith from recorded
Google Meet sessions and provides local zero-shot Text-to-Speech (XTTS-v2 / YourTTS)
and Video/Audio Re-Voicing (FreeVC24 speech-to-speech & Whisper->XTTS dubbing)
for lex.clinic courseware and event media.

Usage:
  1. Extract clean reference voice dataset from Google Meet recording:
     python3 kyle_voice_engine.py extract

  2. Generate speech in Kyle's voice from text or script file:
     python3 kyle_voice_engine.py tts --text "Welcome to LexClinic 101..." --out sample_kyle.m4a

  3. Re-voice an existing explainer MP4/M4A into Kyle's voice:
     python3 kyle_voice_engine.py revoice --input clip.mp4 --out clip_kyle.mp4 --mode dub
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

os.environ["PATH"] = "/home/mgit/.local/bin:" + os.environ.get("PATH", "")
os.environ["COQUI_TOS_AGREED"] = "1"

FFMPEG_BIN = shutil.which("ffmpeg") or "/home/mgit/.local/bin/ffmpeg"
FFPROBE_BIN = shutil.which("ffprobe") or "/home/mgit/.local/bin/ffprobe"

DEFAULT_CORPUS_DIR = Path("/home/mgit/lex_clinic_stage_repsl/blob_repsl/kairos_repsl/voice_corpus/kyle_smith")
DEFAULT_CACHE_DIR = Path("/home/mgit/.gemini/tmp/mgit/voice_cache")

# 10 verified 100%-solo uninterrupted segments of Kyle MacLean Smith from Lesson 6.2 (Nov 5, 2026)
# Exclusively from transcript blocks where set(speakers) == {"Kyle Smith"} (0 interjections from others)
LESSON_6_2_DRIVE_ID = "1HSrbJN8zKlN5ucE_b0zssy00gE82OuM_"
KYLE_SOLO_SEGMENTS = [
    {"id": "solo_01_novelty_map", "start": "00:11:25", "duration": 30, "topic": "101 Curriculum Idea Map Intro"},
    {"id": "solo_02_goldfarb_dom_a", "start": "00:22:08", "duration": 30, "topic": "Charles Goldfarb & SGML Document Object Model (Part 1)"},
    {"id": "solo_03_goldfarb_dom_b", "start": "00:22:40", "duration": 30, "topic": "Charles Goldfarb & SGML Document Object Model (Part 2)"},
    {"id": "solo_04_ens_factories_a", "start": "00:29:00", "duration": 30, "topic": "ENS Factories vs Sovereign Smart Contracts (Part 1)"},
    {"id": "solo_05_ens_factories_b", "start": "00:29:32", "duration": 30, "topic": "ENS Factories vs Sovereign Smart Contracts (Part 2)"},
    {"id": "solo_06_agent_np_domain_a", "start": "00:30:18", "duration": 30, "topic": "Agent .np Non-Person Safe Harbor & Compliance (Part 1)"},
    {"id": "solo_07_agent_np_domain_b", "start": "00:30:50", "duration": 30, "topic": "Agent .np Non-Person Safe Harbor & Compliance (Part 2)"},
    {"id": "solo_08_kairos_pith", "start": "00:39:40", "duration": 30, "topic": "Kairos vs Chronos & Pith in Content Generation"},
    {"id": "solo_09_qgov_remedies_a", "start": "00:43:45", "duration": 30, "topic": "Q Governance & Lawful Crypto Remedies (Part 1)"},
    {"id": "solo_10_qgov_remedies_b", "start": "00:44:17", "duration": 30, "topic": "Q Governance & Lawful Crypto Remedies (Part 2)"},
]


def get_drive_access_token() -> str:
    g_tok_path = os.path.expanduser("~/.config/lexclinic_google_token.json")
    with open(g_tok_path, "r", encoding="utf-8") as f:
        gtd = json.load(f)
    g_data = urllib.parse.urlencode({
        "client_id": gtd["client_id"],
        "client_secret": gtd["client_secret"],
        "refresh_token": gtd["refresh_token"],
        "grant_type": "refresh_token",
    }).encode("utf-8")
    req = urllib.request.Request(gtd["token_uri"], data=g_data, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        g_access = json.loads(r.read().decode("utf-8"))["access_token"]
    gtd["token"] = g_access
    with open(g_tok_path, "w", encoding="utf-8") as f:
        json.dump(gtd, f, indent=2)
    return g_access


def download_drive_file(file_id: str, dest_path: Path) -> Path:
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    if dest_path.exists() and dest_path.stat().st_size > 1_000_000:
        print(f"  [cached] {dest_path} ({dest_path.stat().st_size / 1024 / 1024:.2f} MB)")
        return dest_path
    token = get_drive_access_token()
    print(f"  Downloading Google Meet recording {file_id} -> {dest_path}...")
    req = urllib.request.Request(
        f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media",
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp, open(dest_path, "wb") as out_f:
        shutil.copyfileobj(resp, out_f)
    print(f"  Downloaded {dest_path.stat().st_size / 1024 / 1024:.2f} MB")
    return dest_path


def get_audio_duration(audio_path: Path) -> float:
    cmd = [
        FFPROBE_BIN,
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(audio_path),
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return float(res.stdout.strip())


def extract_corpus(corpus_dir: Path, drive_id: str) -> dict:
    corpus_dir.mkdir(parents=True, exist_ok=True)
    DEFAULT_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    raw_mp4 = DEFAULT_CACHE_DIR / f"meet_recording_{drive_id}.mp4"
    download_drive_file(drive_id, raw_mp4)

    from faster_whisper import WhisperModel
    import librosa
    whisper_model = WhisperModel("tiny.en", device="cpu", compute_type="int8")

    extracted_clips = []
    clip_paths = []

    for seg in KYLE_SOLO_SEGMENTS:
        out_wav = corpus_dir / f"{seg['id']}.wav"
        # Preserve natural vocal overtones (no FFT denoise distortion); gentle rumble filter + loudness norm + silence trim
        af_chain = (
            "highpass=f=65,"
            "loudnorm=I=-16:TP=-1.5:LRA=11,"
            "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-42dB:"
            "stop_periods=-1:stop_duration=0.35:stop_threshold=-42dB"
        )
        cmd = [
            FFMPEG_BIN, "-y",
            "-ss", seg["start"],
            "-t", str(seg["duration"]),
            "-i", str(raw_mp4),
            "-vn",
            "-af", af_chain,
            "-ar", "24000",
            "-ac", "1",
            "-c:a", "pcm_s16le",
            str(out_wav),
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        dur = get_audio_duration(out_wav)

        audio_16k, _ = librosa.load(str(out_wav), sr=16000, mono=True)
        segments_gen, _ = whisper_model.transcribe(audio_16k, beam_size=3)
        transcript = " ".join(s.text.strip() for s in segments_gen).strip()

        clip_meta = {
            "id": seg["id"],
            "file": out_wav.name,
            "path": str(out_wav),
            "source_drive_id": drive_id,
            "source_start": seg["start"],
            "duration_sec": round(dur, 2),
            "sample_rate": 24000,
            "channels": 1,
            "topic": seg["topic"],
            "whisper_transcript": transcript,
        }
        extracted_clips.append(clip_meta)
        clip_paths.append(out_wav)
        print(f"  [extracted] {out_wav.name} ({dur:.1f}s): {transcript[:90]}...")

    # Also build a combined 60s master reference WAV and faststart M4A preview
    master_wav = corpus_dir / "kyle_smith_master_reference.wav"
    concat_list = DEFAULT_CACHE_DIR / "concat_refs.txt"
    with open(concat_list, "w", encoding="utf-8") as f:
        for p in clip_paths:
            f.write(f"file '{p}'{chr(10)}")
    subprocess.run([
        FFMPEG_BIN, "-y", "-f", "concat", "-safe", "0",
        "-i", str(concat_list), "-c:a", "pcm_s16le", str(master_wav)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    master_m4a = corpus_dir / "kyle_smith_master_reference.m4a"
    subprocess.run([
        FFMPEG_BIN, "-y", "-i", str(master_wav),
        "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", str(master_m4a)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    manifest = {
        "speaker": "Kyle MacLean Smith",
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source_recording_drive_id": drive_id,
        "sample_rate": 24000,
        "master_reference_wav": str(master_wav),
        "master_reference_m4a": str(master_m4a),
        "total_duration_sec": round(sum(c["duration_sec"] for c in extracted_clips), 2),
        "clips": extracted_clips,
    }
    manifest_path = corpus_dir / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"✅ Saved voice corpus manifest ({manifest['total_duration_sec']}s total) -> {manifest_path}")
    return manifest


def _install_torchaudio_soundfile_shim() -> None:
    """Bypass libtorchcodec dynamic FFmpeg lookup by loading WAV files via soundfile."""
    import soundfile as sf
    import torch
    import torchaudio

    def _sf_load(filepath, *args, **kwargs):
        data, sr = sf.read(str(filepath), dtype="float32", always_2d=True)
        tensor = torch.from_numpy(data.T.copy())
        return tensor, sr

    torchaudio.load = _sf_load


def synthesize_tts(
    text: str,
    out_path: Path,
    corpus_dir: Path = DEFAULT_CORPUS_DIR,
    model_choice: str = "f5_tts",
) -> Path:
    _install_torchaudio_soundfile_shim()
    os.environ["PATH"] = "/home/mgit/.local/bin:" + os.environ.get("PATH", "")
    manifest_path = corpus_dir / "manifest.json"
    if not manifest_path.exists():
        print("Voice corpus not found; extracting reference clips first...")
        extract_corpus(corpus_dir, LESSON_6_2_DRIVE_ID)

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    ref_wavs = [c["path"] for c in manifest["clips"] if Path(c["path"]).exists()]
    if not ref_wavs:
        raise RuntimeError(f"No reference WAV files found in {corpus_dir}")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_wav = out_path.with_suffix(".raw.wav") if out_path.suffix.lower() != ".wav" else out_path

    if model_choice == "f5_tts":
        import torch
        from f5_tts.api import F5TTS

        torch.set_num_threads(4)
        card4_5s = corpus_dir / "card4_natural_5s.wav"
        ref_file = str(card4_5s if card4_5s.exists() else corpus_dir / "solo_06_agent_np_domain_a.wav")
        ref_text = "Whomever is part of the domain, I can say this person is the CFO."

        print("  Loading F5-TTS Continuous Flow Matching model (F5TTS_v1_Base + Vocos 24kHz)...")
        t0 = time.time()
        f5 = F5TTS(model="F5TTS_v1_Base", device="cpu")
        f5.ema_model.transformer = torch.ao.quantization.quantize_dynamic(
            f5.ema_model.transformer, {torch.nn.Linear}, dtype=torch.qint8
        )
        orig_forward = f5.ema_model.transformer.forward

        def scheduled_cfg_forward(x, cond, text, time, mask=None, drop_audio_cond=False, drop_text=False, cfg_infer=False, cache=False):
            t_val = float(time.item()) if time.ndim == 0 else float(time[0].item())
            if cfg_infer and t_val > 0.55:
                out_cond = orig_forward(
                    x=x, cond=cond, text=text, time=time, mask=mask,
                    drop_audio_cond=False, drop_text=False, cfg_infer=False, cache=cache
                )
                return torch.cat([out_cond, out_cond], dim=0)
            return orig_forward(
                x=x, cond=cond, text=text, time=time, mask=mask,
                drop_audio_cond=drop_audio_cond, drop_text=drop_text, cfg_infer=cfg_infer, cache=cache
            )

        f5.ema_model.transformer.forward = scheduled_cfg_forward
        print(f"  F5-TTS loaded in {time.time() - t0:.1f}s. Running Continuous Flow Matching...")
        t1 = time.time()
        f5.infer(
            ref_file=ref_file,
            ref_text=ref_text,
            gen_text=text,
            nfe_step=7,
            cfg_strength=2.0,
            speed=1.0,
            progress=None,
            file_wave=str(tmp_wav),
            seed=42,
        )
    else:
        from TTS.api import TTS

        voice_cache_dir = corpus_dir / "voice_cache"
        voice_cache_dir.mkdir(parents=True, exist_ok=True)

        if model_choice == "your_tts":
            model_name = "tts_models/multilingual/multi-dataset/your_tts"
            speaker_wav = str(corpus_dir / "kyle_smith_master_reference.wav")
            tts_kwargs = {"speaker_wav": speaker_wav, "language": "en"}
        else:
            model_name = "tts_models/multilingual/multi-dataset/xtts_v2"
            cached_pth = voice_cache_dir / "kyle_maclean_smith_v2_300s.pth"
            tts_kwargs = {
                "speaker_wav": None if cached_pth.exists() else ref_wavs,
                "speaker": "kyle_maclean_smith_v2_300s",
                "voice_dir": str(voice_cache_dir),
                "language": "en",
                "gpt_cond_len": 300,
                "gpt_cond_chunk_len": 6,
                "max_ref_len": 30,
                "sound_norm_refs": True,
                "temperature": 0.35,
                "top_p": 0.80,
                "repetition_penalty": 5.0,
            }

        print(f"  Loading zero-shot voice cloning model: {model_name}...")
        t0 = time.time()
        tts = TTS(model_name).to("cpu")
        ft_ckpt = corpus_dir / "finetuned_model" / "kyle_xtts_finetuned.pt"
        if model_choice == "xtts_v2" and ft_ckpt.exists():
            import torch
            import torch.nn as nn
            print(f"  Applying fine-tuned Kyle MacLean Smith GPT weights from {ft_ckpt.name}...")
            ckpt = torch.load(ft_ckpt, map_location="cpu", weights_only=False)
            gpt = tts.synthesizer.tts_model.gpt
            top_blocks = nn.ModuleList(list(gpt.gpt.h[25:]))
            top_blocks.load_state_dict(ckpt["top_blocks_state_dict"])
            gpt.gpt.ln_f.load_state_dict(ckpt["ln_f_state_dict"])
            gpt.final_norm.load_state_dict(ckpt["final_norm_state_dict"])
            gpt.mel_head.load_state_dict(ckpt["mel_head_state_dict"])
            gpt.text_head.load_state_dict(ckpt["text_head_state_dict"])
            gpt.init_gpt_for_inference(kv_cache=True, use_deepspeed=False)
            tts.synthesizer.tts_model.eval()
        print(f"  Model loaded in {time.time() - t0:.1f}s. Synthesizing in Kyle MacLean Smith's voice...")

        t1 = time.time()
        tts.tts_to_file(
            text=text,
            file_path=str(tmp_wav),
            **tts_kwargs,
        )
    gen_sec = time.time() - t1
    dur = get_audio_duration(tmp_wav)
    print(f"  Generated {dur:.2f}s of speech in {gen_sec:.1f}s (RTF={gen_sec / max(dur, 0.1):.2f}x)")

    if out_path.suffix.lower() in (".m4a", ".mp4", ".aac"):
        subprocess.run([
            FFMPEG_BIN, "-y", "-i", str(tmp_wav),
            "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
            "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", str(out_path)
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        # Keep companion .wav alongside .m4a for inspection
        companion_wav = out_path.with_suffix(".wav")
        shutil.move(str(tmp_wav), str(companion_wav))
        print(f"✅ Wrote {out_path} ({out_path.stat().st_size / 1024:.1f} KB) and {companion_wav}")
    else:
        print(f"✅ Wrote {out_path} ({out_path.stat().st_size / 1024:.1f} KB)")

    return out_path


def revoice_media(
    input_media: Path,
    out_media: Path,
    corpus_dir: Path = DEFAULT_CORPUS_DIR,
    mode: str = "vc",
    max_seconds: float = 0.0,
) -> Path:
    _install_torchaudio_soundfile_shim()
    manifest_path = corpus_dir / "manifest.json"
    if not manifest_path.exists():
        extract_corpus(corpus_dir, LESSON_6_2_DRIVE_ID)

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    ref_wavs = [c["path"] for c in manifest["clips"] if Path(c["path"]).exists()]
    primary_ref = ref_wavs[1] if len(ref_wavs) > 1 else ref_wavs[0]

    DEFAULT_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    src_wav = DEFAULT_CACHE_DIR / "revoice_source.wav"
    converted_wav = DEFAULT_CACHE_DIR / "revoice_converted.wav"

    ff_cmd = [FFMPEG_BIN, "-y"]
    if max_seconds > 0:
        ff_cmd += ["-t", str(max_seconds)]
    ff_cmd += ["-i", str(input_media), "-vn", "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", str(src_wav)]
    subprocess.run(ff_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    src_dur = get_audio_duration(src_wav)

    if mode == "vc":
        import numpy as np
        import soundfile as sf
        from TTS.api import TTS

        vc_model_name = "voice_conversion_models/multilingual/vctk/freevc24"
        print(f"  Running Speech-to-Speech Voice Conversion ({vc_model_name}) on {src_dur:.1f}s audio...")
        tts_vc = TTS(vc_model_name).to("cpu")

        if src_dur <= 35.0:
            tts_vc.voice_conversion_to_file(
                source_wav=str(src_wav),
                target_wav=str(primary_ref),
                file_path=str(converted_wav),
            )
        else:
            audio_data, sr = sf.read(str(src_wav), dtype="float32")
            chunk_samples = int(30.0 * sr)
            out_chunks = []
            total_chunks = (len(audio_data) + chunk_samples - 1) // chunk_samples
            for idx in range(total_chunks):
                c_start = idx * chunk_samples
                c_end = min((idx + 1) * chunk_samples, len(audio_data))
                chunk_arr = audio_data[c_start:c_end]
                if len(chunk_arr) < int(0.5 * sr):
                    continue
                c_in = DEFAULT_CACHE_DIR / f"vc_chunk_{idx:03d}_in.wav"
                c_out = DEFAULT_CACHE_DIR / f"vc_chunk_{idx:03d}_out.wav"
                sf.write(str(c_in), chunk_arr, sr)
                print(f"    Converting chunk {idx + 1}/{total_chunks} ({c_start / sr:.1f}s - {c_end / sr:.1f}s)...")
                tts_vc.voice_conversion_to_file(
                    source_wav=str(c_in),
                    target_wav=str(primary_ref),
                    file_path=str(c_out),
                )
                conv_arr, out_sr = sf.read(str(c_out), dtype="float32")
                out_chunks.append(conv_arr)
            full_conv = np.concatenate(out_chunks, axis=0)
            sf.write(str(converted_wav), full_conv, out_sr)
    else:
        from faster_whisper import WhisperModel
        import librosa
        print("  Transcribing source audio with Whisper...")
        wm = WhisperModel("tiny.en", device="cpu", compute_type="int8")
        audio_16k, _ = librosa.load(str(src_wav), sr=16000, mono=True)
        segs, _ = wm.transcribe(audio_16k, beam_size=3)
        full_text = " ".join(s.text.strip() for s in segs).strip()
        print(f"  Transcribed ({len(full_text)} chars): {full_text[:100]}...")
        raw_dub_wav = DEFAULT_CACHE_DIR / "revoice_dub_raw.wav"
        synthesize_tts(full_text, raw_dub_wav, corpus_dir=corpus_dir, model_choice="f5_tts")
        dub_dur = get_audio_duration(raw_dub_wav)
        ratio = dub_dur / max(src_dur, 0.1)
        if 0.75 <= ratio <= 1.45 and abs(ratio - 1.0) > 0.03:
            print(f"  Time-aligning F5-TTS dub ({dub_dur:.1f}s -> {src_dur:.1f}s, atempo={ratio:.3f})...")
            subprocess.run([
                FFMPEG_BIN, "-y", "-i", str(raw_dub_wav),
                "-af", f"atempo={ratio:.4f}",
                "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le",
                str(converted_wav),
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            shutil.copyfile(str(raw_dub_wav), str(converted_wav))

    out_media.parent.mkdir(parents=True, exist_ok=True)
    if input_media.suffix.lower() == ".mp4" and out_media.suffix.lower() == ".mp4":
        mux_cmd = [FFMPEG_BIN, "-y"]
        if max_seconds > 0:
            mux_cmd += ["-t", str(max_seconds)]
        mux_cmd += [
            "-i", str(input_media),
            "-i", str(converted_wav),
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-c:v", "copy",
            "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
            "-c:a", "aac", "-b:a", "64k",
            "-movflags", "+faststart",
            "-shortest",
            str(out_media),
        ]
        subprocess.run(mux_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        subprocess.run([
            FFMPEG_BIN, "-y", "-i", str(converted_wav),
            "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
            "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart",
            str(out_media),
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    print(f"✅ Re-voiced media written to {out_media} ({out_media.stat().st_size / 1024:.1f} KB)")
    return out_media


def upload_samples_to_drive(
    corpus_dir: Path = DEFAULT_CORPUS_DIR,
    parent_folder_id: str = "1OGLTnmCxesx-s7JSPRZqPAzq0RvvZwHB",
) -> dict:
    token = get_drive_access_token()
    headers_json = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json; charset=UTF-8",
    }

    # Find or create subfolder 'Kyle_Voice_Clone_Samples'
    q = urllib.parse.quote(
        f"'{parent_folder_id}' in parents and name = 'Kyle_Voice_Clone_Samples' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    )
    req = urllib.request.Request(
        f"https://www.googleapis.com/drive/v3/files?q={q}&fields=files(id,name)",
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        existing = json.loads(r.read().decode("utf-8")).get("files", [])

    if existing:
        folder_id = existing[0]["id"]
    else:
        meta = json.dumps({
            "name": "Kyle_Voice_Clone_Samples",
            "mimeType": "application/vnd.google-apps.folder",
            "parents": [parent_folder_id],
        }).encode("utf-8")
        req_create = urllib.request.Request(
            "https://www.googleapis.com/drive/v3/files?fields=id",
            data=meta,
            headers=headers_json,
            method="POST",
        )
        with urllib.request.urlopen(req_create, timeout=30) as rc:
            folder_id = json.loads(rc.read().decode("utf-8"))["id"]

    files_to_upload = [
        (corpus_dir / "kyle_smith_master_reference.m4a", "audio/mp4"),
        (corpus_dir / "manifest.json", "application/json"),
        (corpus_dir / "samples" / "sample_f5tts_5min_kyle.m4a", "audio/mp4"),
        (corpus_dir / "samples" / "sample_f5tts_kyle.m4a", "audio/mp4"),
        (corpus_dir / "samples" / "clip1_dub_f5tts.m4a", "audio/mp4"),
        (corpus_dir / "samples" / "clip1_cfm_preview.mp4", "video/mp4"),
        (corpus_dir / "samples" / "sample_finetuned_kyle.m4a", "audio/mp4"),
        (corpus_dir / "samples" / "clip1_dub_finetuned.m4a", "audio/mp4"),
    ]

    uploaded = {}
    for fpath, mime in files_to_upload:
        if not fpath.exists():
            continue
        q_f = urllib.parse.quote(f"'{folder_id}' in parents and name = '{fpath.name}' and trashed = false")
        req_f = urllib.request.Request(
            f"https://www.googleapis.com/drive/v3/files?q={q_f}&fields=files(id,name)",
            headers={"Authorization": f"Bearer {token}"},
        )
        with urllib.request.urlopen(req_f, timeout=30) as rf:
            ex_f = json.loads(rf.read().decode("utf-8")).get("files", [])

        data_bytes = fpath.read_bytes()
        if ex_f:
            fid = ex_f[0]["id"]
            up_req = urllib.request.Request(
                f"https://www.googleapis.com/upload/drive/v3/files/{fid}?uploadType=media",
                data=data_bytes,
                headers={"Authorization": f"Bearer {token}", "Content-Type": mime},
                method="PATCH",
            )
            with urllib.request.urlopen(up_req, timeout=120) as _:
                pass
        else:
            meta_bytes = json.dumps({"name": fpath.name, "parents": [folder_id]}).encode("utf-8")
            init_req = urllib.request.Request(
                "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id",
                data=meta_bytes,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json; charset=UTF-8",
                    "X-Upload-Content-Type": mime,
                    "X-Upload-Content-Length": str(len(data_bytes)),
                },
                method="POST",
            )
            with urllib.request.urlopen(init_req, timeout=30) as ir:
                loc = ir.headers["Location"]
            put_req = urllib.request.Request(
                loc,
                data=data_bytes,
                headers={"Content-Type": mime, "Content-Length": str(len(data_bytes))},
                method="PUT",
            )
            with urllib.request.urlopen(put_req, timeout=120) as pr:
                fid = json.loads(pr.read().decode("utf-8"))["id"]

        uploaded[fpath.name] = fid
        print(f"  [Drive] {fpath.name} -> https://drive.google.com/file/d/{fid}/view")

    print(f"✅ Uploaded {len(uploaded)} files to Drive folder: https://drive.google.com/drive/folders/{folder_id}")
    return {"folder_id": folder_id, "files": uploaded}


def main():
    parser = argparse.ArgumentParser(description="LexClinic Voice Cloning & Media Re-Voicing Engine")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_ext = sub.add_parser("extract", help="Extract clean Kyle MacLean Smith reference voice corpus from Meet recording")
    p_ext.add_argument("--drive-id", default=LESSON_6_2_DRIVE_ID, help="Google Drive ID of Meet recording MP4")
    p_ext.add_argument("--corpus-dir", default=str(DEFAULT_CORPUS_DIR), help="Output directory for reference WAV corpus")

    p_tts = sub.add_parser("tts", help="Synthesize speech in Kyle MacLean Smith's voice from text")
    p_tts.add_argument("--text", help="Text string to synthesize")
    p_tts.add_argument("--text-file", help="Path to text file to synthesize")
    p_tts.add_argument("--out", required=True, help="Output audio path (.wav or .m4a)")
    p_tts.add_argument("--model", choices=["f5_tts", "xtts_v2", "your_tts"], default="f5_tts", help="TTS model (default: f5_tts Continuous Flow Matching)")
    p_tts.add_argument("--corpus-dir", default=str(DEFAULT_CORPUS_DIR), help="Reference voice corpus directory")

    p_rev = sub.add_parser("revoice", help="Re-voice an existing explainer MP4/M4A into Kyle's voice")
    p_rev.add_argument("--input", required=True, help="Input MP4 or M4A file")
    p_rev.add_argument("--out", required=True, help="Output MP4 or M4A file")
    p_rev.add_argument("--mode", choices=["vc", "dub"], default="vc", help="vc (FreeVC24 speech-to-speech) or dub (Whisper->XTTS-v2)")
    p_rev.add_argument("--max-seconds", type=float, default=0.0, help="Optional limit in seconds for quick preview")
    p_rev.add_argument("--corpus-dir", default=str(DEFAULT_CORPUS_DIR), help="Reference voice corpus directory")

    p_drv = sub.add_parser("upload-drive", help="Upload reference corpus and generated samples to Google Drive")
    p_drv.add_argument("--parent-id", default="1OGLTnmCxesx-s7JSPRZqPAzq0RvvZwHB", help="Parent Google Drive folder ID")
    p_drv.add_argument("--corpus-dir", default=str(DEFAULT_CORPUS_DIR), help="Reference voice corpus directory")

    args = parser.parse_args()
    if args.cmd == "extract":
        extract_corpus(Path(args.corpus_dir), args.drive_id)
    elif args.cmd == "tts":
        text = args.text
        if args.text_file:
            text = Path(args.text_file).read_text(encoding="utf-8").strip()
        if not text:
            parser.error("Provide --text or --text-file")
        synthesize_tts(text, Path(args.out), corpus_dir=Path(args.corpus_dir), model_choice=args.model)
    elif args.cmd == "revoice":
        revoice_media(
            Path(args.input),
            Path(args.out),
            corpus_dir=Path(args.corpus_dir),
            mode=args.mode,
            max_seconds=args.max_seconds,
        )
    elif args.cmd == "upload-drive":
        upload_samples_to_drive(Path(args.corpus_dir), args.parent_id)


if __name__ == "__main__":
    main()
