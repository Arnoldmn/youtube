import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "./Auth.jsx";
import { useToast } from "./Toast.jsx";

// One Server-Sent Events connection per tab: receives notifications (shown as
// toasts + bell badge) and "jobs changed" pings that pages use to refresh.
const LiveCtx = createContext(null);
const TOAST_KIND = { delivered: "approve", approved: "approve", accepted: "info", assigned: "info", declined: "reject", overdue: "reject", revision: "reject" };
const CHIME = new Set(["delivered", "declined", "assigned", "revision"]);

let audioCtx;
function chime() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    [880, 1320].forEach((f, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.35);
      o.connect(g).connect(audioCtx.destination);
      o.start(t + i * 0.12);
      o.stop(t + i * 0.12 + 0.4);
    });
  } catch { /* audio unavailable */ }
}

export function LiveProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [connected, setConnected] = useState(false);
  const [ring, setRing] = useState(0);
  const jobListeners = useRef(new Set());

  const load = useCallback(() => api.get("/notifications").then((d) => setNotifications(d.notifications)).catch(() => {}), []);

  useEffect(() => {
    if (!user) return undefined;
    load();
    const es = new EventSource("/api/events");
    es.onopen = () => { setConnected(true); load(); };
    es.onerror = () => setConnected(false);
    es.addEventListener("notification", (e) => {
      const n = JSON.parse(e.data);
      setNotifications((list) => [n, ...list.filter((x) => x.id !== n.id)]);
      setRing((r) => r + 1);
      toast(n.title, TOAST_KIND[n.type] || "info", n.jobId ? {
        label: n.type === "delivered" ? "Review" : "Open",
        fn: () => {
          api.post("/notifications/read", { ids: [n.id] }).then(load);
          navigate(user.role === "admin" ? `/jobs?open=${n.jobId}` : `/my-jobs?open=${n.jobId}`);
        },
      } : undefined);
      if (CHIME.has(n.type)) chime();
      try {
        if (document.hidden && "Notification" in window && Notification.permission === "granted") new Notification(n.title, { body: n.body });
      } catch { /* ignore */ }
    });
    es.addEventListener("jobs", (e) => {
      const data = JSON.parse(e.data);
      jobListeners.current.forEach((fn) => fn(data));
    });
    return () => { es.close(); setConnected(false); };
  }, [user, load, toast, navigate]);

  const markRead = useCallback(async (ids) => {
    setNotifications((list) => list.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)));
    await api.post("/notifications/read", ids ? { ids } : {}).catch(() => {});
  }, []);

  const onJobsChanged = useCallback((fn) => {
    jobListeners.current.add(fn);
    return () => jobListeners.current.delete(fn);
  }, []);

  return (
    <LiveCtx.Provider value={{ notifications, unread: notifications.filter((n) => !n.read).length, markRead, onJobsChanged, connected, ring }}>
      {children}
    </LiveCtx.Provider>
  );
}

export const useLive = () => useContext(LiveCtx);
