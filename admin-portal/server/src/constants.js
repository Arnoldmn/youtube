export const LANGS = {
  AR: "Arabic", CS: "Czech", DE: "German", EN: "English", ES: "Spanish", FR: "French",
  HI: "Hindi", IT: "Italian", JA: "Japanese", KO: "Korean", NL: "Dutch", NO: "Norwegian",
  PL: "Polish", PT: "Portuguese", RU: "Russian", SV: "Swedish", TA: "Tamil", UR: "Urdu",
  YO: "Yoruba", ZH: "Chinese",
};

export const SERVICES = ["Translation", "Translation + Review", "Proofreading", "Localization", "Transcription", "Subtitling"];

export const DEFAULT_RATES = {
  Translation: 0.11, "Translation + Review": 0.14, Proofreading: 0.05,
  Localization: 0.12, Transcription: 0.04, Subtitling: 0.09,
};

export const PRIORITIES = ["low", "normal", "high", "urgent"];

export const JOB_STATUSES = [
  { id: "unassigned", label: "Unassigned" },
  { id: "assigned", label: "Awaiting acceptance" },
  { id: "in_progress", label: "In progress" },
  { id: "revision", label: "Revision" },
  { id: "delivered", label: "Finished · needs review" },
  { id: "completed", label: "Completed" },
];

export const OPEN_STATUSES = ["unassigned", "assigned", "in_progress", "revision"];
