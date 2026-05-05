import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const baseField =
  "w-full bg-caliche-white border rounded-md px-3 py-2 text-sm text-saguaro-black placeholder:text-mesa-gray transition-colors focus:outline-none focus:border-mojave-green focus:ring-2 focus:ring-mojave-green/20 disabled:bg-adobe disabled:text-mesa-gray disabled:cursor-not-allowed";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-saguaro-black"
      >
        {label}
        {required ? <span className="text-sunset-terracotta ml-0.5" aria-hidden>*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-error-brick" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-xs text-stone-gray">{hint}</p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        baseField,
        invalid ? "border-error-brick" : "border-stone-gray/40",
        className
      )}
      {...rest}
    />
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, rows = 8, ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        baseField,
        "resize-y leading-relaxed",
        invalid ? "border-error-brick" : "border-stone-gray/40",
        className
      )}
      {...rest}
    />
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...rest },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        baseField,
        "appearance-none bg-no-repeat bg-right pr-9",
        invalid ? "border-error-brick" : "border-stone-gray/40",
        className
      )}
      style={{
        backgroundImage:
          'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'14\' height=\'14\' viewBox=\'0 0 14 14\' fill=\'none\' stroke=\'%236B7064\' stroke-width=\'1.5\'><polyline points=\'3,5 7,9 11,5\'/></svg>")',
        backgroundPosition: "right 0.6rem center",
      }}
      {...rest}
    >
      {children}
    </select>
  );
});
