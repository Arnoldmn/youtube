import { useState } from "react";
import { useAuth } from "../context/Auth.jsx";
import { Icon } from "../icons.jsx";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-art" aria-hidden="true">
        <div className="brand"><div className="brand-mark">L</div><div className="brand-text"><strong>Lingua Ops</strong><span>Admin Portal</span></div></div>
        <div className="auth-pitch">
          <h2>Every job, every linguist, one place.</h2>
          <ul>
            <li><Icon name="upload" />Upload jobs and assign them in seconds</li>
            <li><Icon name="bell" />Get notified the moment work is finished</li>
            <li><Icon name="shield" />Screen and onboard new vendors</li>
          </ul>
        </div>
      </div>
      <form className="auth-card" onSubmit={submit} noValidate>
        <div className="brand mobile-only"><div className="brand-mark">L</div><div className="brand-text"><strong>Lingua Ops</strong><span>Admin Portal</span></div></div>
        <h1>Sign in</h1>
        <p className="muted">Use the account your administrator gave you.</p>
        <label className="field"><span>Email</span>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label className="field"><span>Password</span>
          <div className="pw-wrap">
            <input type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" className="link-btn" onClick={() => setShow((s) => !s)}>{show ? "Hide" : "Show"}</button>
          </div>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn primary block" type="submit" disabled={busy || !email || !password}>
          {busy ? <span className="spinner sm" /> : <Icon name="lock" />}Sign in
        </button>
      </form>
    </div>
  );
}
