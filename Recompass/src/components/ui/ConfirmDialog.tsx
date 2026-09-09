import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, LogOut, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  icon?: "logout" | "warning" | "none";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  icon = "warning",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  const IconComponent = icon === "logout" ? LogOut : icon === "warning" ? AlertTriangle : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-sm glass-card rounded-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{ background: "linear-gradient(180deg, rgba(25,25,25,0.98) 0%, rgba(12,12,12,0.98) 100%)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg text-white/40 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        {IconComponent && (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${
            variant === "danger"
              ? "bg-red-500/15 border border-red-500/20"
              : "bg-white/10 border border-white/10"
          }`}>
            <IconComponent className={`w-6 h-6 ${variant === "danger" ? "text-red-400" : "text-white"}`} />
          </div>
        )}

        {/* Text */}
        <h2 className="text-lg font-bold text-white tracking-tight mb-2">{title}</h2>
        <p className="text-sm text-white/50 font-medium leading-relaxed mb-7">{description}</p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl border border-white/10 text-white/70 text-sm font-semibold hover:bg-white/5 hover:text-white transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 h-11 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] ${
              variant === "danger"
                ? "bg-red-500 hover:bg-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                : "bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
