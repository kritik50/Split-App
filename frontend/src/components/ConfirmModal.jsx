import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import "./ConfirmModal.css";

/**
 * Reusable confirmation modal.
 * Props:
 *   open        {boolean}
 *   title       {string}
 *   message     {string|ReactNode}
 *   confirmText {string}  default "Confirm"
 *   cancelText  {string}  default "Cancel"
 *   variant     {string}  "danger" | "default"
 *   onConfirm   {fn}
 *   onCancel    {fn}
 *   loading     {boolean}
 */
const ConfirmModal = ({
  open,
  title = "Are you sure?",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onCancel?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="cm-backdrop" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="cm-title">
      <div className="cm" onClick={(e) => e.stopPropagation()}>
        <button className="cm__close" onClick={onCancel} aria-label="Close">
          <X size={15} />
        </button>

        <div className={`cm__icon-wrap cm__icon-wrap--${variant}`}>
          <AlertTriangle size={20} />
        </div>

        <h3 className="cm__title" id="cm-title">{title}</h3>
        {message && <p className="cm__message">{message}</p>}

        <div className="cm__actions">
          <button
            ref={cancelRef}
            className="cm__btn cm__btn--cancel"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            className={`cm__btn cm__btn--confirm cm__btn--${variant}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Please wait…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
