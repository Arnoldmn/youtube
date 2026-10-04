import { useEffect, useRef } from "react";
import { Icon } from "../icons.jsx";
import { extOf, fmtSize, ago, hueOf, initialsOf } from "../format.js";
import { fileUrl } from "../api.js";

export function Avatar({ name, size = "", className = "" }) {
  return <span className={`avatar ${size} ${className}`} style={{ "--h": hueOf(name) }} title={name}>{initialsOf(name)}</span>;
}

export function Modal({ open, onClose, children, wide = false, narrow = false, labelledBy }) {
  const ref = useRef(null);
  const lastFocus = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    lastFocus.current = document.activeElement;
    const t = setTimeout(() => {
      const el = ref.current?.querySelector("[data-autofocus], input:not([type=hidden]):not([type=file]):not([type=radio]):not([type=checkbox]), select, textarea, [type=submit]");
      el?.focus();
    }, 30);
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", onKey, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey, true);
      if (lastFocus.current?.isConnected) lastFocus.current.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal-card ${wide ? "wide" : ""} ${narrow ? "narrow" : ""}`} ref={ref}>{children}</div>
    </div>
  );
}

export function ModalHead({ icon, tone = "info", title, sub, onClose, id }) {
  return (
    <div className="modal-head">
      {icon && <div className={`modal-ico ${tone}`}><Icon name={icon} size="lg" /></div>}
      <div><h2 id={id}>{title}</h2>{sub && <p>{sub}</p>}</div>
      <button className="icon-btn" type="button" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
    </div>
  );
}

export function Dropzone({ onFiles, title = "Drop files here", hint, compact = false, multiple = true, accept }) {
  const input = useRef(null);
  const zone = useRef(null);
  return (
    <div ref={zone} className={`dropzone ${compact ? "compact" : ""}`} tabIndex={0} role="button" aria-label={title}
      onClick={() => input.current.click()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current.click(); } }}
      onDragOver={(e) => { e.preventDefault(); zone.current.classList.add("over"); }}
      onDragLeave={() => zone.current.classList.remove("over")}
      onDrop={(e) => { e.preventDefault(); zone.current.classList.remove("over"); if (e.dataTransfer.files.length) onFiles([...e.dataTransfer.files]); }}>
      <input ref={input} type="file" hidden multiple={multiple} accept={accept}
        onChange={(e) => { if (e.target.files.length) onFiles([...e.target.files]); e.target.value = ""; }} />
      <span className="dz-ico"><Icon name="upload" /></span>
      <div><strong>{title}</strong> — drop here or <u>browse</u>{hint && <small>{hint}</small>}</div>
    </div>
  );
}

export function FileRow({ file, onRemove, deliverable }) {
  const ext = extOf(file.name);
  return (
    <div className={`file ${deliverable || file.kind === "deliverable" ? "deliverable" : ""}`}>
      <span className={`ext ${ext}`}>{ext}</span>
      <div>
        <strong>{file.name}</strong>
        <small>{fmtSize(file.size)}{file.by ? ` · ${file.by}` : ""}{file.at ? ` · ${ago(file.at)}` : ""}</small>
      </div>
      {onRemove
        ? <button className="icon-btn" type="button" onClick={onRemove} aria-label={`Remove ${file.name}`}><Icon name="x" /></button>
        : <a className="icon-btn" href={fileUrl(file.id)} download aria-label={`Download ${file.name}`}><Icon name="download" /></a>}
    </div>
  );
}

export function Empty({ icon = "inbox", title, children, boxed = false }) {
  return (
    <div className="empty" style={boxed ? { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)" } : undefined}>
      <div className="empty-ico"><Icon name={icon} size="lg" /></div>
      <strong>{title}</strong>
      {children && <span>{children}</span>}
    </div>
  );
}

export function Spinner({ label = "Loading…" }) {
  return <div className="spinner-wrap" role="status"><span className="spinner" />{label}</div>;
}
