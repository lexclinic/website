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

# Curated solo uninterrupted segments of Kyle MacLean Smith from Lesson 6.2 (Nov 5, 2026)
# Drive ID: 1HSrbJN8zKlN5ucE_b0zssy00gE82OuM_
LESSON_6_2_DRIVE_ID = "1HSrbJN8zKlN5ucE_b0zssy00gE82OuM_"
KYLE_SOLO_SEGMENTS = [
    {
        "id": "ref_01_curriculum_depth",
        "start": "00:15:08",
        "duration": 18,
        "topic": "101 Curriculum Novelty & Depth Mapping",
    },
    {
        "id": "ref_02_leibniz_calculus",
        "start": "00:23:32",
        "duration": 22,
        "topic": "Gottfried Wilhelm Leibniz & Calculus as a Child of Jurisprudence",
    },
    {
        "id": "ref_03_agent_np_nft",
        "start": "00:28:40",
        "duration": 20,
        "topic": "Sovereign 1-VM-1-Contract & .np Non-Person Agent Safe Harbor",
    },
    {
        "id": "ref_04_kairos_chronos",
        "start": "00:39:05",
        "duration": 22,
        "topic": "Chronos vs. Kairos Temporal Content Management",
    },
    {
        "id": "ref_05_qgov_fixed_point",
        "start": "00:44:05",
        "duration": 20,
        "topic": "QGOV Ricardian Remedies & Fixed-Point vs. Floating-Point Math",
    },
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
    whisper_model = WhisperModel("tiny.en", device="cpu", compute_type="int8")

    extracted_clips = []
    clip_paths = []

    for seg in KYLE_SOLO_SEGMENTS:
        out_wav = corpus_dir / f"{seg['id']}.wav"
        # Bandpass filter (80Hz - 11kHz) + EBU R128 loudness normalization + 24kHz mono PCM
        af_chain = (
            "highpass=f=80,"
            "lowpass=f=11000,"
            "afftdn=nf=-25,"
            "loudnorm=I=-16:TP=-1.5:LRA=11,"
            "silenceremove=start_periods=1:start_silence=0.1:start_threshold=-45dB"
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

        segments_gen, _ = whisper_model.transcribe(str(out_wav), beam_size=3)
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
            f.write(f"file '{p}'
")
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


def synthesize_tts(
    text: str,
    out_path: Path,
    corpus_dir: Path = DEFAULT_CORPUS_DIR,
    model_choice: str = "xtts_v2",
) -> Path:
    manifest_path = corpus_dir / "manifest.json"
    if not manifest_path.exists():
        print("Voice corpus not found; extracting reference clips first...")
        extract_corpus(corpus_dir, LESSON_6_2_DRIVE_ID)

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    ref_wavs = [c["path"] for c in manifest["clips"] if Path(c["path"]).exists()]
    if not ref_wavs:
        raise RuntimeError(f"No reference WAV files found in {corpus_dir}")

    from TTS.api import TTS

    if model_choice == "your_tts":
        model_name = "tts_models/multilingual/multi-dataset/your_tts"
        speaker_wav = ref_wavs[1] if len(ref_wavs) > 1 else ref_wavs[0]
    else:
        model_name = "tts_models/multilingual/multi-dataset/xtts_v2"
        speaker_wav = ref_wavs

    print(f"  Loading zero-shot voice cloning model: {model_name}...")
    t0 = time.time()
    tts = TTS(model_name).to("cpu")
    print(f"  Model loaded in {time.time() - t0:.1f}s. Synthesizing in Kyle MacLean Smith's voice...")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_wav = out_path.with_suffix(".raw.wav") if out_path.suffix.lower() != ".wav" else out_path

    t1 = time.time()
    tts.tts_to_file(
        text=text,
        speaker_wav=speaker_wav,
        language="en",
        file_path=str(tmp_wav),
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

    if mode == "vc":
        from TTS.api import TTS
        vc_model_name = "voice_conversion_models/multilingual/vctk/freevc24"
        print(f"  Running Speech-to-Speech Voice Conversion ({vc_model_name})...")
        tts_vc = TTS(vc_model_name).to("cpu")
        tts_vc.voice_conversion_to_file(
            source_wav=str(src_wav),
            target_wav=str(primary_ref),
            file_path=str(converted_wav),
        )
    else:
        from faster_whisper import WhisperModel
        print("  Transcribing source audio with Whisper...")
        wm = WhisperModel("tiny.en", device="cpu", compute_type="int8")
        segs, _ = wm.transcribe(str(src_wav), beam_size=3)
        full_text = " ".join(s.text.strip() for s in segs).strip()
        print(f"  Transcribed ({len(full_text)} chars): {full_text[:100]}...")
        synthesize_tts(full_text, converted_wav, corpus_dir=corpus_dir, model_choice="xtts_v2")

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
    p_tts.add_argument("--model", choices=["xtts_v2", "your_tts"], default="xtts_v2", help="Zero-shot TTS model")
    p_tts.add_argument("--corpus-dir", default=str(DEFAULT_CORPUS_DIR), help="Reference voice corpus directory")

    p_rev = sub.add_parser("revoice", help="Re-voice an existing explainer MP4/M4A into Kyle's voice")
    p_rev.add_argument("--input", required=True, help="Input MP4 or M4A file")
    p_rev.add_argument("--out", required=True, help="Output MP4 or M4A file")
    p_rev.add_argument("--mode", choices=["vc", "dub"], default="vc", help="vc (FreeVC24 speech-to-speech) or dub (Whisper->XTTS-v2)")
    p_rev.add_argument("--max-seconds", type=float, default=0.0, help="Optional limit in seconds for quick preview")
    p_rev.add_argument("--corpus-dir", default=str(DEFAULT_CORPUS_DIR), help="Reference voice corpus directory")

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


if __name__ == "__main__":
    main()
