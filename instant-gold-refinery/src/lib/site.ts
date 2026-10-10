// All business details live here — edit this one file to update the whole site.

export const site = {
  name: "Instant Gold Refinery",
  shortName: "Instant Gold",
  established: 2019,
  tagline: "Raw ore in. Pure gold out.",
  description:
    "Instant Gold Refinery — gold smelting, refining, assaying and bullion casting since 2019. Transparent fire assay, accurate weights and fast, fair settlement.",

  whatsapp: {
    // Number as people write it locally.
    display: "0774 957 883",
    local: "0774957883",
    // International format WITHOUT "+" or spaces, used for wa.me links.
    // Country code assumed +256 (Uganda). Change to e.g. "263774957883" for Zimbabwe.
    international: "256774957883",
  },

  hours: [
    { days: "Monday – Friday", time: "08:00 – 18:00" },
    { days: "Saturday", time: "09:00 – 15:00" },
    { days: "Sunday", time: "By appointment" },
  ],
} as const;

export const yearsActive = () => new Date().getFullYear() - site.established;

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${site.whatsapp.international}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
