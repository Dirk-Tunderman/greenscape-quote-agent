/**
 * POST /api/transcribe — multipart audio file → Deepgram Nova-3 transcript.
 *
 * Adapted from lead-system/tools/src/app/api/transcribe (no DB persistence —
 * we don't keep transcripts; the caller writes the result straight into the
 * site-walk-notes textarea on /quotes/new).
 *
 * Returns plain text in `transcript` (not utterance-stamped — the agent reads
 * it next, so timestamps are noise).
 */
import { NextResponse } from "next/server";

// Long site-walk recordings can take a couple minutes; cap higher than default.
export const maxDuration = 300;

const ALLOWED_TYPES = [
  "audio/mpeg", // .mp3
  "audio/mp4", // .m4a
  "audio/x-m4a",
  "video/mp4", // .mp4
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
];

export async function POST(request: Request) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Expected multipart form-data with a `file` field" },
        { status: 400 },
      );
    }
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const baseType = file.type.split(";")[0];
    if (!ALLOWED_TYPES.includes(baseType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Use .mp3, .m4a, .wav, .mp4, or .webm` },
        { status: 400 },
      );
    }

    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Transcription not configured" }, { status: 500 });
    }

    // Buffer the file fully — streaming uploads to Deepgram drop bytes on large files.
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const dgUrl =
      "https://api.deepgram.com/v1/listen?model=nova-3&detect_language=true&smart_format=true&punctuate=true";

    const dgResponse = await fetch(dgUrl, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": file.type,
      },
      body: fileBuffer,
    });

    if (!dgResponse.ok) {
      const errText = await dgResponse.text();
      console.error("Deepgram error:", errText);
      return NextResponse.json({ error: "Transcription failed" }, { status: 502 });
    }

    const dgResult = await dgResponse.json();
    const transcript: string =
      dgResult?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
    const duration: number | null = dgResult?.metadata?.duration ?? null;

    if (!transcript.trim()) {
      return NextResponse.json(
        { error: "Deepgram returned an empty transcript — recording may be silent" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      transcript,
      duration_seconds: duration ? Math.round(duration * 100) / 100 : null,
    });
  } catch (error) {
    console.error("Transcribe error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
