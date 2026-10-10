// Generates the illustrated board portraits in public/team/.
// Replace them with real photos by dropping e.g. public/team/henry-morton.jpg
// and updating the `image` path in src/lib/team.ts.
import { createAvatar } from "@dicebear/core";
import { avataaars } from "@dicebear/collection";
import { mkdirSync, writeFileSync } from "node:fs";

const common = {
  eyes: ["default"],
  eyebrows: ["defaultNatural"],
  mouth: ["twinkle"],
  backgroundColor: ["transparent"],
  accessoriesProbability: 0,
  facialHairProbability: 0,
};

const people = {
  "henry-morton": { skinColor: ["614335"], top: ["theCaesar"], hairColor: ["2c1b18"], facialHair: ["beardLight"], facialHairColor: ["2c1b18"], facialHairProbability: 100, clothing: ["blazerAndShirt"], clothesColor: ["262e33"] },
  "wanjiru-kamau": { skinColor: ["ae5d29"], top: ["curly"], hairColor: ["2c1b18"], clothing: ["blazerAndSweater"], clothesColor: ["3c4f5c"] },
  "david-otieno": { skinColor: ["614335"], top: ["shortRound"], hairColor: ["2c1b18"], clothing: ["collarAndSweater"], clothesColor: ["929598"], accessories: ["prescription02"], accessoriesColor: ["262e33"], accessoriesProbability: 100 },
  "amina-hassan": { skinColor: ["d08b5b"], top: ["hijab"], hatColor: ["25557c"], clothing: ["blazerAndShirt"], clothesColor: ["262e33"] },
};

mkdirSync("public/team", { recursive: true });
for (const [slug, opts] of Object.entries(people)) {
  const svg = createAvatar(avataaars, { ...common, ...opts, seed: slug }).toString();
  writeFileSync(`public/team/${slug}.svg`, svg);
  console.log("wrote", slug);
}
