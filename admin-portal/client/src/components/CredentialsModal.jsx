import { useToast } from "../context/Toast.jsx";
import { Icon } from "../icons.jsx";
import { Modal, ModalHead } from "./ui.jsx";

// Shows freshly generated sign-in details once, with a copy button. creds = { email, password }
export default function CredentialsModal({ creds, onClose }) {
  const toast = useToast();
  if (!creds) return null;
  const text = `Lingua Ops sign-in\n${window.location.origin}\nEmail: ${creds.email}\nTemporary password: ${creds.password}\n(You'll be asked to choose your own password.)`;
  return (
    <Modal open onClose={onClose} labelledBy="credTitle">
      <ModalHead id="credTitle" icon="key" tone="approve" title="Share these sign-in details" sub="This temporary password is shown only once. They'll be asked to change it when they sign in." onClose={onClose} />
      <div className="modal-body"><pre className="creds">{text}</pre></div>
      <div className="modal-foot">
        <button className="btn" type="button" onClick={() => { navigator.clipboard?.writeText(text).then(() => toast("Copied", "approve")); }}><Icon name="copy" />Copy</button>
        <button className="btn primary" type="button" onClick={onClose} data-autofocus>Done</button>
      </div>
    </Modal>
  );
}
