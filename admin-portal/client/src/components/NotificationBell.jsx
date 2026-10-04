import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/Auth.jsx";
import { useLive } from "../context/Live.jsx";
import { Icon } from "../icons.jsx";
import { ago } from "../format.js";

const ICON = { delivered: "check-circle", accepted: "play", declined: "x-circle", overdue: "alert", assigned: "user-plus", revision: "refresh", approved: "check", files: "paperclip", unassigned: "x" };

export default function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unread, markRead, ring } = useLive();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [ringing, setRinging] = useState(false);
  const [perm, setPerm] = useState(() => ("Notification" in window ? Notification.permission : "unsupported"));
  const wrap = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!ring) return undefined;
    setRinging(true);
    const t = setTimeout(() => setRinging(false), 900);
    return () => clearTimeout(t);
  }, [ring]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const list = tab === "unread" ? notifications.filter((n) => !n.read)
    : tab === "finished" ? notifications.filter((n) => n.type === "delivered") : notifications;
  const tabs = user.role === "admin" ? [["all", "All"], ["unread", "Unread"], ["finished", "Finished jobs"]] : [["all", "All"], ["unread", "Unread"]];

  const openItem = (n) => {
    markRead([n.id]);
    setOpen(false);
    if (n.jobId) navigate(user.role === "admin" ? `/jobs?open=${n.jobId}` : `/my-jobs?open=${n.jobId}`);
  };

  return (
    <div className={`bell-wrap ${ringing ? "ringing" : ""}`} ref={wrap}>
      <button className="icon-btn" id="bellBtn" type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}>
        <Icon name="bell" />
        {unread > 0 && <span className="bell-count">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="np-head"><h3>Notifications</h3><button className="link-btn" type="button" onClick={() => markRead(null)}>Mark all read</button></div>
          <div className="np-tabs" role="tablist">
            {tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>)}
          </div>
          <div className="np-list">
            {list.length ? list.slice(0, 50).map((n) => (
              <button key={n.id} className={`notif ${n.read ? "" : "unread"}`} type="button" onClick={() => openItem(n)}>
                <span className={`n-ico ${n.type}`}><Icon name={ICON[n.type] || "bell"} /></span>
                <div><strong>{n.title}</strong><p>{n.body}</p></div>
                <div><time>{ago(n.at)}</time>{!n.read && <span className="udot" />}</div>
              </button>
            )) : <div className="np-empty">{tab === "all" ? "No notifications yet." : "You're all caught up."}</div>}
          </div>
          <div className="np-foot">
            <Icon name="bell" />
            {perm === "granted" ? "Desktop alerts are on"
              : perm === "default" ? <><span>Get alerts when this tab is in the background</span><button className="btn sm" type="button" style={{ marginLeft: "auto" }} onClick={async () => setPerm(await Notification.requestPermission())}>Enable</button></>
                : perm === "denied" ? "Desktop alerts are blocked in your browser settings" : "Desktop alerts aren't supported in this browser"}
          </div>
        </div>
      )}
    </div>
  );
}
