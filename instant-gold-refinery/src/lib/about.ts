// About-page content. The board names (apart from the CEO), roles, bios and the
// milestones below are placeholders — replace them with your real details.

export type Member = {
  slug: string;
  name: string;
  role: string;
  from: string;
  bio: string;
  image: string;
  /** Background tint behind the portrait */
  tone: string;
};

export const board: Member[] = [
  {
    slug: "henry-morton",
    name: "Henry Morton",
    role: "Chief Executive Officer",
    from: "Nairobi, Kenya",
    bio: "Henry leads Instant Gold Refinery with one goal: give Kenyan miners and traders a refinery that is fast, transparent and fair. He drives strategy, partnerships and the company's commitment to responsible gold.",
    image: "/team/henry-morton.svg",
    tone: "from-gold-300 to-gold-600",
  },
  {
    slug: "wanjiru-kamau",
    name: "Wanjiru Kamau",
    role: "Chief Operating Officer",
    from: "Nyeri, Kenya",
    bio: "Wanjiru runs the refinery floor — scheduling, furnace operations and safety — making sure every client's batch moves from drop-off to bar without delay.",
    image: "/team/wanjiru-kamau.svg",
    tone: "from-ember-400 to-ember-600",
  },
  {
    slug: "david-otieno",
    name: "David Otieno",
    role: "Head of Assay & Quality",
    from: "Kisumu, Kenya",
    bio: "David oversees the assay laboratory. His team's fire-assay and XRF results are the numbers every quote and certificate stands on.",
    image: "/team/david-otieno.svg",
    tone: "from-gold-200 to-gold-500",
  },
  {
    slug: "amina-hassan",
    name: "Amina Hassan",
    role: "Chief Financial Officer",
    from: "Mombasa, Kenya",
    bio: "Amina manages finance, compliance and client settlement — keeping payouts prompt and every transaction properly documented.",
    image: "/team/amina-hassan.svg",
    tone: "from-gold-400 to-ember-600",
  },
];

export const ceoQuote =
  "Gold is the most trusted metal on earth. A refinery should earn that same trust — by doing everything in the open, measuring everything precisely, and paying people what their gold is truly worth.";

export const milestones = [
  { year: "2019", title: "The first furnace", body: "Instant Gold Refinery opens in Kenya with a single furnace and a promise: weigh, test and smelt in front of the client." },
  { year: "2020", title: "In-house assay lab", body: "XRF analysis brought in-house, so clients get purity results in minutes instead of days." },
  { year: "2021", title: "Fire assay", body: "Classical fire assay added for the highest-accuracy results on doré and high-value batches." },
  { year: "2022", title: "Refining line", body: "A chemical refining line takes output from doré to high-fineness gold." },
  { year: "2023", title: "Bullion casting", body: "Custom bar casting launched — bars poured to the client's chosen weight, stamped and documented." },
  { year: "2024", title: "Secure handling", body: "Upgraded secure premises and documented chain-of-custody for every gram that comes through the door." },
  { year: "Today", title: "Still instant", body: "Same-day smelting and assay for miners, dealers and jewellers — the promise we started with." },
];

export const aboutStats = [
  { value: "2019", label: "Founded in Kenya" },
  { value: "999.9", label: "Fineness we refine to" },
  { value: "Same day", label: "Typical smelt & assay" },
  { value: "100%", label: "Done in front of you" },
];
