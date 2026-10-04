import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../context/Auth.jsx";
import { useLive } from "../context/Live.jsx";
import { useMeta } from "../context/Meta.jsx";
import { useToast } from "../context/Toast.jsx";
import { Icon } from "../icons.jsx";
import { Avatar, Empty, Modal, ModalHead, Spinner } from "../components/ui.jsx";
import Ask from "../components/Ask.jsx";
import CredentialsModal from "../components/CredentialsModal.jsx";
import { ago, fmtNum, pairLabel } from "../format.js";

const blank = { name: "", email: "", role: "employee", title: "", pairs: "", specs: "", capacity: 3000, password: "" };

function UserModal({ open, user, onClose, onSaved }) {
  const meta = useMeta();
  const [f, setF] = useState(blank);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setError("");
    setF(user ? { ...blank, ...user, pairs: user.pairs.join(", "), specs: user.specs.join(", "), password: "" } : blank);
  }, [open, user]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const pairs = f.pairs.split(/[,;\s]+/).map((p) => p.toUpperCase().replace(/(→|->|-)/, ">")).filter(Boolean);
    const specs = f.specs.split(",").map((s) => s.trim()).filter(Boolean);
    try {
      const res = user
        ? await api.patch(`/users/${user.id}`, { name: f.name, title: f.title, pairs, specs, capacity: f.capacity, role: f.role })
        : await api.post("/users", { name: f.name, email: f.email, role: f.role, title: f.title, pairs, specs, capacity: f.capacity, password: f.password || undefined });
      onSaved(res, !user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} labelledBy="userTitle">
      <form onSubmit={submit}>
        <ModalHead id="userTitle" icon={user ? "edit" : "user-plus"} title={user ? `Edit ${user.name}` : "Add a team member"}
          sub={user ? "Update their profile, languages and capacity." : "They'll sign in with their email and the password you set (or a generated one)."} onClose={onClose} />
        <div className="modal-body">
          <div className="form-grid">
            <label className="field"><span>Full name</span><input value={f.name} onChange={set("name")} required /></label>
            <label className="field"><span>Email</span><input type="email" value={f.email} onChange={set("email")} required disabled={!!user} /></label>
            <label className="field"><span>Role</span>
              <select value={f.role} onChange={set("role")}><option value="employee">Employee — works on assigned jobs</option><option value="admin">Admin — manages jobs and people</option></select></label>
            <label className="field"><span>Job title <small>(optional)</small></span><input value={f.title} onChange={set("title")} placeholder="In-house, Freelance…" /></label>
            <label className="field span-2"><span>Language pairs <small>— e.g. EN&gt;DE, DE&gt;EN</small></span><input value={f.pairs} onChange={set("pairs")} placeholder="EN>DE, DE>EN" list="pairHints" /></label>
            <datalist id="pairHints">{meta && Object.keys(meta.langs).filter((c) => c !== "EN").map((c) => <option key={c} value={`EN>${c}`} />)}</datalist>
            <label className="field"><span>Specializations</span><input value={f.specs} onChange={set("specs")} placeholder="Legal, Medical" /></label>
            <label className="field"><span>Capacity <small>(words / day)</small></span><input type="number" min="100" value={f.capacity} onChange={set("capacity")} /></label>
            {!user && <label className="field span-2"><span>Password <small>— leave empty to generate a temporary one</small></span><input type="text" value={f.password} onChange={set("password")} autoComplete="new-password" minLength={8} /></label>}
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
          <button className="btn primary" type="submit" disabled={busy}>{user ? "Save changes" : "Add person"}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Team() {
  const { user: me } = useAuth();
  const toast = useToast();
  const { onJobsChanged } = useLive();
  const [users, setUsers] = useState(null);
  const [editing, setEditing] = useState(undefined);
  const [creds, setCreds] = useState(null);
  const [ask, setAsk] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(() => api.get("/users").then((d) => setUsers(d.users)).catch((e) => toast(e.message, "reject")), [toast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => onJobsChanged(load), [onJobsChanged, load]);

  if (!users) return <div className="page-scroll"><Spinner /></div>;
  const shown = users.filter((u) => showInactive || u.active);

  return (
    <div className="page-scroll">
      <section className="page-head">
        <div><h1>Team</h1><p>Everyone who can sign in: admins manage jobs, employees work on them.</p></div>
        <div className="head-actions">
          <label className="switch"><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /><span className="track" />Show deactivated</label>
          <button className="btn primary" type="button" onClick={() => setEditing(null)}><Icon name="user-plus" />Add person</button>
        </div>
      </section>
      <section className="team-page">
        {shown.length ? (
          <div className="table-wrap">
            <table className="jobs team-table">
              <thead><tr><th>Person</th><th>Role</th><th>Language pairs</th><th className="num">Open jobs</th><th className="num">Queued words</th><th>Last sign-in</th><th /></tr></thead>
              <tbody>
                {shown.map((u) => (
                  <tr key={u.id} className={u.active ? "" : "inactive"}>
                    <td><div className="who-cell"><Avatar name={u.name} size="sm" /><div><strong>{u.name}{u.id === me.id && <span className="you">You</span>}</strong><span>{u.email}</span></div></div></td>
                    <td><span className={`pill ${u.role === "admin" ? "s-delivered" : "s-in_progress"}`}>{u.role === "admin" ? "Admin" : "Employee"}</span>{!u.active && <span className="pill s-unassigned" style={{ marginLeft: 6 }}>Deactivated</span>}</td>
                    <td><div className="kv">{u.pairs.map((p) => <span key={p} className="tag pair">{pairLabel(p)}</span>)}</div></td>
                    <td className="num">{u.openJobs}</td>
                    <td className="num">{fmtNum(u.queuedWords)}</td>
                    <td className="muted small">{u.lastLoginAt ? ago(u.lastLoginAt) : "Never"}</td>
                    <td className="row-actions">
                      <button className="icon-btn" type="button" title="Edit" aria-label={`Edit ${u.name}`} onClick={() => setEditing(u)}><Icon name="edit" /></button>
                      <button className="icon-btn" type="button" title="Reset password" aria-label={`Reset ${u.name}'s password`} onClick={() => setAsk({
                        title: `Reset ${u.name}'s password?`, sub: "A new temporary password is generated. Their current password stops working.", icon: "key",
                        confirm: "Reset password", onConfirm: async () => { const r = await api.post(`/users/${u.id}/reset-password`); setCreds({ email: u.email, password: r.tempPassword }); },
                      })}><Icon name="key" /></button>
                      {u.id !== me.id && (
                        <button className={`icon-btn ${u.active ? "danger-ico" : ""}`} type="button" title={u.active ? "Deactivate" : "Reactivate"} aria-label={`${u.active ? "Deactivate" : "Reactivate"} ${u.name}`} onClick={() => setAsk({
                          title: u.active ? `Deactivate ${u.name}?` : `Reactivate ${u.name}?`,
                          sub: u.active ? "They're signed out immediately and can't sign in. Their jobs stay as they are — reassign open ones." : "They'll be able to sign in again.",
                          icon: u.active ? "lock" : "user", tone: u.active ? "reject" : "info", confirm: u.active ? "Deactivate" : "Reactivate", confirmCls: u.active ? "danger" : "primary",
                          onConfirm: async () => { await api.patch(`/users/${u.id}`, { active: !u.active }); toast(`${u.name} ${u.active ? "deactivated" : "reactivated"}`, "neutral"); load(); },
                        })}><Icon name={u.active ? "lock" : "user"} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty icon="users" title="No team members yet" boxed>Add your first employee to start assigning jobs.</Empty>}
      </section>
      <UserModal open={editing !== undefined} user={editing} onClose={() => setEditing(undefined)}
        onSaved={(res, created) => { load(); if (created && res.tempPassword) setCreds({ email: res.user.email, password: res.tempPassword }); else toast(created ? `${res.user.name} added` : "Saved", "approve"); }} />
      <CredentialsModal creds={creds} onClose={() => setCreds(null)} />
      <Ask ask={ask} onClose={() => setAsk(null)} />
    </div>
  );
}
