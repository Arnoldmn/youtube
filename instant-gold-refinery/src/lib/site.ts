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
    // Kenya (+254), without "+" or spaces — used for wa.me and tel: links.
    international: "254774957883",
    intlDisplay: "+254 774 957 883",
  },

  country: "Kenya",

  address: {
    building: "Mograde Apartment, 3rd Floor",
    area: "Kiamunyu",
    town: "Nakuru",
    postal: "P.O. Box 20100, Nakuru GPO",
    // Used for the "Get directions" link and the embedded map
    mapQuery: "Kiamunyu, Nakuru, Kenya",
  },

  nav: [
    { href: "/", label: "Home" },
    { href: "/services/", label: "Services" },
    { href: "/process/", label: "Process" },
    { href: "/about/", label: "About" },
    { href: "/faq/", label: "FAQ" },
    { href: "/contact/", label: "Contact" },
  ],

  hours: [
    { days: "Monday – Friday", time: "08:00 – 18:00" },
    { days: "Saturday", time: "09:00 – 15:00" },
    { days: "Sunday", time: "By appointment" },
  ],
} as const;

export const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${site.address.building.split(",")[0]}, ${site.address.mapQuery}`,
)}`;
export const mapsEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(site.address.mapQuery)}&z=14&output=embed`;

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${site.whatsapp.international}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
