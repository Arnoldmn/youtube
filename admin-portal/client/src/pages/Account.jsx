import { useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../context/Auth.jsx";
import { useToast } from "../context/Toast.jsx";
import { Icon } from "../icons.jsx";
import { Avatar } from "../components/ui.jsx";
import { fmtDateTime, pairLabel } from "../format.js";

export default function Account({ forced = false }) {
  const { user, refresh, logout } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.next.length < 8) return setError("Use at least 8 characters for your new password");
    if (form.next !== form.confirm) return setError("The new passwords don't match");
    setBusy(true);
    try {
      await api.post("/auth/password", { current: form.current, next: form.next });
      setForm({ current: "", next: "", confirm: "" });
      toast("Password updated", "approve");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-scroll">
      <div className="narrow-page">
        <section className="page-head"><div><h1>{forced ? "Choose a new password" : "Your account"}</h1>
          <p>{forced ? "You signed in with a temporary password. Set your own to continue." : "Profile details and sign-in security."}</p></div></section>
        {!forced && (
          <div className="card">
            <div className="profile-row">
              <Avatar name={user.name} size="xl" />
              <div>
                <h2>{user.name}</h2>
                <p className="muted">{user.email} · {user.role === "admin" ? "Administrator" : "Employee"}{user.title ? ` · ${user.title}` : ""}</p>
                {user.pairs.length > 0 && <div className="kv" style={{ marginTop: 8 }}>{user.pairs.map((p) => <span key={p} className="tag pair">{pairLabel(p)}</span>)}</div>}
              </div>
            </div>
            {user.lastLoginAt && <p className="muted small">Last sign-in {fmtDateTime(user.lastLoginAt)}</p>}
          </div>
        )}
        <form className="card" onSubmit={submit}>
          <h3 className="card-title"><Icon name="key" />Change password</h3>
          <label className="field"><span>{forced ? "Temporary password" : "Current password"}</span><input type="password" autoComplete="current-password" value={form.current} onChange={set("current")} required /></label>
          <label className="field"><span>New password <small>(min. 8 characters)</small></span><input type="password" autoComplete="new-password" value={form.next} onChange={set("next")} required /></label>
          <label className="field"><span>Confirm new password</span><input type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="card-actions">
            {forced && <button className="btn ghost" type="button" onClick={logout}>Sign out</button>}
            <button className="btn primary" type="submit" disabled={busy}>Update password</button>
          </div>
        </form>
      </div>
    </div>
  );
}
