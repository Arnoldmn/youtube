import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Icon } from "../icons.jsx";

const ToastCtx = createContext(() => {});
const ICON = { approve: "check", info: "bell", reject: "x", neutral: "check" };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.map((x) => (x.id === id ? { ...x, out: true } : x)));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 200);
  }, []);

  const toast = useCallback((message, kind = "neutral", action) => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-3), { id, message, kind, action }]);
    setTimeout(() => dismiss(id), action ? 7000 : 3500);
  }, [dismiss]);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.out ? "out" : ""}`}>
            <span className={`t-ico ${t.kind}`}><Icon name={ICON[t.kind] || "check"} /></span>
            <span>{t.message}</span>
            {t.action && <button type="button" onClick={() => { dismiss(t.id); t.action.fn(); }}>{t.action.label}</button>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
