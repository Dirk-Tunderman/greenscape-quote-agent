/**
 * AudioUploader — drag-drop or click-to-browse, posts to /api/transcribe,
 * streams upload progress, calls onTranscript with the resulting text.
 *
 * Visual style matches the existing form fields (caliche/stone-gray/mojave-green).
 * Inline SVGs for icons — project doesn't pull in lucide-react.
 *
 * On success the parent (NewQuoteForm) writes the transcript into the
 * site-walk-notes textarea so the user can review/edit before submitting.
 */
"use client";

import { useCallback, useRef, useState } from "react";

const ACCEPTED = ".mp3,.m4a,.wav,.webm,.mp4";
const ACCEPTED_LABEL = ".mp3, .m4a, .mp4, .wav, .webm";

interface AudioUploaderProps {
  onTranscript: (transcript: string, fileName: string) => void;
  disabled?: boolean;
}

type Phase = "idle" | "uploading" | "transcribing" | "done" | "error";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AudioUploader({ onTranscript, disabled }: AudioUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setPhase("idle");
    setFileName(null);
    setFileSize(null);
    setProgress(0);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const transcribe = useCallback(
    (file: File) => {
      setFileName(file.name);
      setFileSize(file.size);
      setError(null);
      setProgress(0);
      setPhase("uploading");

      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setProgress(e.loaded / e.total);
        }
      });
      xhr.upload.addEventListener("load", () => {
        // Upload complete — Deepgram is now processing.
        setPhase("transcribing");
      });
      xhr.addEventListener("load", () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 400) {
            setError(data.error || "Transcription failed");
            setPhase("error");
          } else if (!data.transcript) {
            setError("Empty transcript returned");
            setPhase("error");
          } else {
            setPhase("done");
            onTranscript(data.transcript, file.name);
          }
        } catch {
          setError("Server returned an invalid response");
          setPhase("error");
        }
      });
      xhr.addEventListener("error", () => {
        setError("Upload failed — check your connection");
        setPhase("error");
      });
      xhr.open("POST", "/api/transcribe");
      xhr.send(formData);
    },
    [onTranscript],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled || phase === "uploading" || phase === "transcribing") return;
      const file = e.dataTransfer.files[0];
      if (file) transcribe(file);
    },
    [disabled, phase, transcribe],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) transcribe(file);
    },
    [transcribe],
  );

  const busy = phase === "uploading" || phase === "transcribing";

  // -- Phase rendering ------------------------------------------------------
  if (phase === "uploading" || phase === "transcribing") {
    return (
      <div className="rounded-md border border-stone-gray/40 bg-caliche-white px-4 py-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileAudioIcon />
            <div className="min-w-0">
              <p className="text-sm font-medium text-saguaro-black truncate">{fileName}</p>
              <p className="text-xs text-stone-gray">
                {phase === "uploading"
                  ? `Uploading… ${Math.round(progress * 100)}%`
                  : "Transcribing with Deepgram…"}
              </p>
            </div>
          </div>
          <Spinner />
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-adobe">
          <div
            className="h-full bg-mojave-green transition-all duration-200"
            style={{
              width:
                phase === "uploading" ? `${Math.round(progress * 100)}%` : "100%",
            }}
          />
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="flex items-center justify-between rounded-md border border-mojave-green/40 bg-mojave-green/5 px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <CheckIcon />
          <div className="min-w-0">
            <p className="text-sm font-medium text-saguaro-black truncate">{fileName}</p>
            <p className="text-xs text-stone-gray">
              Transcript added to site-walk notes — review and edit below.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={reset}
          className="text-xs text-stone-gray hover:text-saguaro-black underline-offset-2 hover:underline"
        >
          Replace
        </button>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="space-y-2">
        <div className="rounded-md border border-error-brick/40 bg-error-brick/5 px-4 py-3">
          <p className="text-sm text-error-brick">{error}</p>
          {fileName && fileSize != null ? (
            <p className="text-xs text-stone-gray mt-0.5">
              {fileName} · {formatSize(fileSize)}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={reset}
          className="text-xs text-stone-gray hover:text-saguaro-black underline-offset-2 hover:underline"
        >
          Try another file
        </button>
      </div>
    );
  }

  // idle
  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !busy && !disabled && inputRef.current?.click()}
        className={[
          "flex cursor-pointer flex-col items-center gap-2 rounded-md px-6 py-6 transition-colors",
          dragOver
            ? "border-2 border-dashed border-mojave-green bg-mojave-green/5"
            : "border-2 border-dashed border-stone-gray/40 bg-caliche-white",
          disabled ? "opacity-50 cursor-not-allowed" : "",
        ].join(" ")}
        role="button"
        aria-disabled={disabled}
      >
        <UploadIcon />
        <p className="text-sm text-saguaro-black">
          Drop audio file here or click to browse
        </p>
        <p className="text-xs text-stone-gray">{ACCEPTED_LABEL}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}

// -- Icons (inline SVG; project doesn't use an icon library) ----------------

function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-mesa-gray" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function FileAudioIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-mojave-green flex-shrink-0" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M10 20v-6" />
      <path d="M8 16v2" />
      <path d="M12 14v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mojave-green flex-shrink-0" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="text-mojave-green animate-spin flex-shrink-0"
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
