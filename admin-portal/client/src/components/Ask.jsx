import { useState } from "react";
import { Modal, ModalHead } from "./ui.jsx";

// Small confirm / single-question dialog. `ask` = { title, sub, icon, tone, field, confirm, confirmCls, onConfirm }
export default function Ask({ ask, onClose }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  if (!ask) return null;
  const submit = async (e) => {
    e.preventDefault();
    if (ask.field?.required && !value.trim()) return;
    setBusy(true);
    try {
      await ask.onConfirm(value.trim());
      setValue("");
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} labelledBy="askTitle">
      <form onSubmit={submit}>
        <ModalHead id="askTitle" icon={ask.icon || "help"} tone={ask.tone || "info"} title={ask.title} sub={ask.sub} onClose={onClose} />
        {ask.field
          ? <div className="modal-body"><label className="field"><span>{ask.field.label}</span>
              <textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder={ask.field.placeholder} required={ask.field.required} /></label></div>
          : <div style={{ height: 18 }} />}
        <div className="modal-foot">
          <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
          <button className={`btn ${ask.confirmCls || "primary"}`} type="submit" data-autofocus={ask.field ? undefined : true} disabled={busy || (ask.field?.required && !value.trim())}>{ask.confirm || "Confirm"}</button>
        </div>
      </form>
    </Modal>
  );
}
