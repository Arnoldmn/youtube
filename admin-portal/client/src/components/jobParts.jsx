import { Icon } from "../icons.jsx";
import { Avatar } from "./ui.jsx";
import { HOUR, ago, fmtDate, fmtDateTime, short } from "../format.js";

export const STATUS_LABEL = {
  unassigned: "Unassigned", assigned: "Awaiting acceptance", in_progress: "In progress",
  revision: "Revision", delivered: "Finished · needs review", completed: "Completed",
};
export const OPEN = new Set(["unassigned", "assigned", "in_progress", "revision"]);

export const StatusPill = ({ status }) => <span className={`pill s-${status}`}>{STATUS_LABEL[status]}</span>;

export function PrioBadge({ priority, always = false }) {
  if (priority === "urgent") return <span className="prio urgent"><Icon name="zap" />Urgent</span>;
  if (priority === "high") return <span className="prio high"><Icon name="flag" />High</span>;
  return always ? <span className={`prio ${priority}`}>{priority}</span> : null;
}

export const PairTag = ({ job }) => <span className="tag pair">{job.source} <i>→</i> {job.target}</span>;

export function Due({ job }) {
  if (job.status === "completed") return <span className="due"><Icon name="check" />Done {fmtDate(job.deliveredAt || job.updatedAt)}</span>;
  if (job.status === "delivered") return <span className="due"><Icon name="check" />Finished {ago(job.deliveredAt)}</span>;
  const diff = job.deadline - Date.now();
  const title = fmtDateTime(job.deadline);
  if (diff < 0) return <span className="due late" title={title}><Icon name="alert" />{short(diff)} late</span>;
  if (diff < 24 * HOUR) return <span className="due soon" title={title}><Icon name="clock" />Due in {short(diff)}</span>;
  return <span className="due" title={title}><Icon name="calendar" />{fmtDate(job.deadline)}</span>;
}

export function ProgressBar({ job }) {
  const cls = job.status === "revision" ? "revision" : job.progress >= 100 ? "done" : "";
  return (
    <div className="progress">
      <div className={`bar ${cls}`}><i style={{ width: `${job.progress}%` }} /></div>
      <span>{job.status === "revision" ? "Revision · " : ""}{job.progress}%</span>
    </div>
  );
}

export function WhoChip({ person }) {
  return person
    ? <span className="who-chip"><Avatar name={person.name} /><span>{person.name}</span></span>
    : <span className="who-chip none"><Icon name="user-plus" /><span>Unassigned</span></span>;
}

// Rank people for a language pair: exact pair, then same target language, then lightest queue.
export function rankPeople(users, source, target) {
  const pair = `${source}>${target}`;
  return users
    .filter((u) => u.role === "employee" && u.active)
    .map((u) => ({
      ...u,
      match: u.pairs.includes(pair) ? 2 : u.pairs.some((p) => p.endsWith(`>${target}`)) ? 1 : 0,
      days: (u.queuedWords || 0) / (u.capacity || 3000),
    }))
    .sort((a, b) => b.match - a.match || a.days - b.days);
}
