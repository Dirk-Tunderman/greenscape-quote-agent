/**
 * Modal — backdrop + container with Esc + backdrop-click close.
 *
 * Locks body scroll while open. Used by ApproveBar (send confirmation)
 * and AuditLogModal. Add aria-labelledby / aria-modal automatically.
 *
 * Rendered via createPortal to document.body. This is required, not
 * decorative — when the trigger button lives inside an element with
 * `backdrop-filter` (e.g. the sticky bottom bar on /quotes/[id]),
 * `backdrop-filter` creates a containing block for its fixed-positioned
 * descendants per the CSS spec. An in-tree modal would then be sized to
 * the sticky bar (~80px tall) instead of the viewport. The portal escapes
 * that containing block so `fixed inset-0` always means "the viewport".
 */
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Portal target needs to be resolved client-side; SSR has no document.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const sizeClass =
    size === "xl" ? "max-w-4xl" : size === "lg" ? "max-w-3xl" : "max-w-2xl";

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
    >
      <div
        className="absolute inset-0 bg-saguaro-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={containerRef}
        className={`relative bg-caliche-white rounded-lg shadow-xl border border-adobe w-full ${sizeClass} max-h-[85vh] flex flex-col`}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-adobe">
          <h2 id="modal-title" className="font-serif text-xl text-saguaro-black">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-stone-gray hover:text-saguaro-black transition-colors w-8 h-8 inline-flex items-center justify-center rounded hover:bg-adobe"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3 L13 13 M13 3 L3 13" />
            </svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <footer className="px-6 py-4 border-t border-adobe flex items-center justify-end gap-2">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
