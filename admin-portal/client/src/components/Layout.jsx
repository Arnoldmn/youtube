import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/Auth.jsx";
import { useLive } from "../context/Live.jsx";
import { Icon } from "../icons.jsx";
import { Avatar } from "./ui.jsx";
import NotificationBell from "./NotificationBell.jsx";

const TITLES = { "/jobs": ["Operations", "Jobs"], "/team": ["Operations", "Team"], "/applications": ["Recruitment", "Vendor applications"], "/my-jobs": ["Workspace", "My jobs"], "/account": ["Settings", "Account"] };

function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "light");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("lingua:theme", theme); } catch { /* ignore */ }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))];
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { connected } = useLive();
  const [theme, toggleTheme] = useTheme();
  const [navOpen, setNavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user.role === "admin";
  const [section, title] = TITLES[location.pathname] || ["", ""];

  useEffect(() => { setNavOpen(false); setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  const nav = isAdmin
    ? [["/jobs", "briefcase", "Jobs"], ["/applications", "inbox", "Applications"], ["/team", "users", "Team"]]
    : [["/my-jobs", "briefcase", "My jobs"]];

  return (
    <div className={`app ${navOpen ? "nav-open" : ""}`}>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand">
          <div className="brand-mark">L</div>
          <div className="brand-text"><strong>Lingua Ops</strong><span>{isAdmin ? "Admin Portal" : "Employee workspace"}</span></div>
        </div>
        <nav className="nav">
          {nav.map(([to, icon, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              <Icon name={icon} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className={`live-status ${connected ? "on" : ""}`} title={connected ? "Receiving live updates" : "Reconnecting…"}>
            <i />{connected ? "Live updates on" : "Reconnecting…"}
          </span>
          <NavLink to="/account" className={({ isActive }) => `me ${isActive ? "active" : ""}`}>
            <Avatar name={user.name} size="sm" />
            <div><strong>{user.name}</strong><span>{user.title || (isAdmin ? "Administrator" : "Linguist")}</span></div>
          </NavLink>
        </div>
      </aside>
      <div className="scrim" onClick={() => setNavOpen(false)} />

      <main className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" type="button" onClick={() => setNavOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button>
          <div className="crumbs">{section && <><span>{section}</span><Icon name="chevron-right" /></>}<strong>{title}</strong></div>
          <div className="topbar-actions">
            <button className="icon-btn" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>
            <NotificationBell />
            <div className="user-menu">
              <button className="user-btn" type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}>
                <Avatar name={user.name} size="sm" /><Icon name="chevron-down" />
              </button>
              {menuOpen && (
                <div className="menu-pop" role="menu">
                  <div className="menu-who"><strong>{user.name}</strong><span>{user.email}</span><em>{isAdmin ? "Administrator" : "Employee"}</em></div>
                  <button type="button" role="menuitem" onClick={() => navigate("/account")}><Icon name="key" />Account &amp; password</button>
                  <button type="button" role="menuitem" onClick={logout}><Icon name="logout" />Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
