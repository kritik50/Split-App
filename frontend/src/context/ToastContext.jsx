import { createContext, useCallback, useContext, useRef, useState } from "react";

export const ToastContext = createContext(null);

let idCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 350);
  }, []);

  const toast = useCallback(
    (message, type = "success", duration = 3500) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type, leaving: false }]);

      timersRef.current[id] = setTimeout(() => {
        dismiss(id);
      }, duration);

      return id;
    },
    [dismiss]
  );

  const success = useCallback((msg, dur) => toast(msg, "success", dur), [toast]);
  const error   = useCallback((msg, dur) => toast(msg, "error",   dur), [toast]);
  const info    = useCallback((msg, dur) => toast(msg, "info",    dur), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
};

/* ── Inline container + item — no extra file needed ── */
import { CheckCircle, XCircle, Info, X } from "lucide-react";
import "./Toast.css";

const ICONS = {
  success: CheckCircle,
  error:   XCircle,
  info:    Info,
};

const ToastContainer = ({ toasts, dismiss }) => {
  if (!toasts.length) return null;
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info;
        return (
          <div
            key={t.id}
            className={`toast toast--${t.type} ${t.leaving ? "toast--out" : ""}`}
            role="alert"
          >
            <Icon size={16} className="toast__icon" />
            <span className="toast__msg">{t.message}</span>
            <button className="toast__close" onClick={() => dismiss(t.id)}>
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
