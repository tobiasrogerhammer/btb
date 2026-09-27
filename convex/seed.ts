import { v } from "convex/values";
import { mutation } from "./_generated/server";

/** Studentbarer — kveldsåpent de fleste dager (0=søn … 6=lør). */
const TYPICAL_HOURS = [
  { day: 0, open: "16:00", close: "00:00" },
  { day: 1, open: "16:00", close: "01:00" },
  { day: 2, open: "16:00", close: "01:00" },
  { day: 3, open: "16:00", close: "01:00" },
  { day: 4, open: "16:00", close: "02:00" },
  { day: 5, open: "14:00", close: "02:00" },
  { day: 6, open: "14:00", close: "02:00" },
];

const SEED_BARS: Array<{
  name: string;
  address: string;
  lat: number;
  lng: number;
  priceLevel: 1 | 2 | 3;
  beerPrice: number;
  rating: number;
  ratingCount: number;
  /** Eldre seed-navn som skal merges inn i dette. */
  aliases?: string[];
  googlePlaceId?: string;
}> = [
  {
    name: "Work-Work",
    address: "Munkegata 58, Trondheim",
    lat: 63.4302,
    lng: 10.3952,
    priceLevel: 2,
    beerPrice: 119,
    rating: 4.6,
    ratingCount: 1302,
  },
  {
    name: "Den Gode Nabo",
    address: "Øvre Bakklandet 66, Trondheim",
    lat: 63.4281,
    lng: 10.4038,
    priceLevel: 2,
    beerPrice: 119,
    rating: 4.6,
    ratingCount: 1564,
  },
  {
    name: "Café 3B",
    address: "Brattørgata 3B, Trondheim",
    lat: 63.4345,
    lng: 10.3992,
    priceLevel: 2,
    beerPrice: 110,
    rating: 4.2,
    ratingCount: 258,
    aliases: ["Cafe 3B"],
  },
  {
    name: "Studentersamfundet",
    address: "Elgesetergate 1, Trondheim",
    lat: 63.4224,
    lng: 10.3948,
    priceLevel: 2,
    beerPrice: 106,
    rating: 4.0,
    ratingCount: 421,
  },
  {
    name: "Antikvariatet",
    address: "Nedre Bakklandet 4, Trondheim",
    lat: 63.4274,
    lng: 10.4032,
    priceLevel: 2,
    beerPrice: 115,
    rating: 4.6,
    ratingCount: 1262,
  },
  {
    name: "Ramp Pub",
    address: "Strandveien 25A, Trondheim",
    lat: 63.4362,
    lng: 10.4105,
    priceLevel: 2,
    beerPrice: 104,
    rating: 4.5,
    ratingCount: 500,
  },
  {
    name: "Bodegaen",
    address: "Elgesetergate 1, Trondheim",
    lat: 63.4224,
    lng: 10.3948,
    priceLevel: 2,
    beerPrice: 110,
    rating: 4.9,
    ratingCount: 41,
  },
  {
    name: "Smulen",
    address: "Fjordgata 24, Trondheim",
    lat: 63.4339,
    lng: 10.3956,
    priceLevel: 1,
    beerPrice: 95,
    rating: 4.0,
    ratingCount: 143,
  },
  {
    name: "Bar 3B",
    address: "Brattørgata 3B, Trondheim",
    lat: 63.4346,
    lng: 10.399,
    priceLevel: 2,
    beerPrice: 110,
    rating: 4.1,
    ratingCount: 176,
  },
  {
    name: "Kos",
    address: "Prinsens gate, Trondheim",
    lat: 63.4308,
    lng: 10.3925,
    priceLevel: 3,
    beerPrice: 135,
    rating: 4.6,
    ratingCount: 98,
  },
  {
    name: "Club Downtown",
    address: "Nordre gate 28, Trondheim",
    lat: 63.4315,
    lng: 10.3968,
    priceLevel: 2,
    beerPrice: 125,
    rating: 3.0,
    ratingCount: 164,
    aliases: ["Downtown"],
  },
  {
    name: "Bar Circus",
    address: "Olav Tryggvasons gate 27, Trondheim",
    lat: 63.4332,
    lng: 10.3989,
    priceLevel: 1,
    beerPrice: 75,
    rating: 4.2,
    ratingCount: 948,
    aliases: ["Circus"],
  },
  {
    name: "Good Omens",
    address: "Fjordgata 60, Trondheim",
    lat: 63.4344,
    lng: 10.3928,
    priceLevel: 2,
    beerPrice: 105,
    rating: 4.4,
    ratingCount: 462,
  },
  {
    name: "Three Lions Pub",
    address: "Brattørgata 12B, Trondheim",
    lat: 63.434,
    lng: 10.4005,
    priceLevel: 2,
    beerPrice: 120,
    rating: 4.5,
    ratingCount: 903,
  },
  {
    name: "Tyven",
    address: "Dronningens gate 11, Trondheim",
    lat: 63.431,
    lng: 10.3955,
    priceLevel: 2,
    beerPrice: 125,
    rating: 4.3,
    ratingCount: 364,
  },
  {
    name: "Diskoteket",
    address: "Carl Johans gate 3, Trondheim",
    lat: 63.4305,
    lng: 10.3935,
    priceLevel: 3,
    beerPrice: 130,
    rating: 4.0,
    ratingCount: 390,
  },
  {
    name: "Heidi's Bier Bar",
    address: "TMV-kaia 17, Trondheim",
    lat: 63.4355,
    lng: 10.412,
    priceLevel: 1,
    beerPrice: 86,
    rating: 3.2,
    ratingCount: 587,
    aliases: ["Heidis"],
  },
  {
    name: "Britannia Bar",
    address: "Dronningens gate 5, Trondheim",
    lat: 63.4312,
    lng: 10.3962,
    priceLevel: 3,
    beerPrice: 145,
    rating: 4.8,
    ratingCount: 156,
  },
  {
    name: "Lille London",
    address: "Carl Johans gate 10, Trondheim",
    lat: 63.4302,
    lng: 10.3928,
    priceLevel: 3,
    beerPrice: 140,
    rating: 4.1,
    ratingCount: 1540,
  },
  {
    name: "Café Dublin",
    address: "Kongens gate 15, Trondheim",
    lat: 63.4298,
    lng: 10.3935,
    priceLevel: 2,
    beerPrice: 125,
    rating: 4.1,
    ratingCount: 1233,
  },
  {
    name: "Bar Moskus",
    address: "Olav Tryggvasons gate 5, Trondheim",
    lat: 63.4338,
    lng: 10.4012,
    priceLevel: 2,
    beerPrice: 110,
    rating: 4.6,
    ratingCount: 455,
  },
  {
    name: "ØX Tap Room",
    address: "Munkegata 26, Trondheim",
    lat: 63.4308,
    lng: 10.3965,
    priceLevel: 2,
    beerPrice: 125,
    rating: 4.5,
    ratingCount: 1461,
  },
  {
    name: "Habitat",
    address: "Olav Tryggvasons gate 30, Trondheim",
    lat: 63.433,
    lng: 10.3975,
    priceLevel: 3,
    beerPrice: 130,
    rating: 4.5,
    ratingCount: 778,
  },
  {
    name: "Raus Bar",
    address: "Nordre gate 21, Trondheim",
    lat: 63.4318,
    lng: 10.3972,
    priceLevel: 3,
    beerPrice: 132,
    rating: 4.4,
    ratingCount: 543,
  },
  {
    name: "Fru Lundgreen",
    address: "Kjøpmannsgata 50, Trondheim",
    lat: 63.431,
    lng: 10.4005,
    priceLevel: 1,
    beerPrice: 98,
    rating: 4.4,
    ratingCount: 328,
  },
  {
    name: "NB6",
    address: "Nedre Bakklandet 6, Trondheim",
    lat: 63.4275,
    lng: 10.403,
    priceLevel: 2,
    beerPrice: 125,
    rating: 4.7,
    ratingCount: 177,
  },
  {
    name: "Trusehuset",
    address: "Klostergata 38A, Trondheim",
    lat: 63.4265,
    lng: 10.392,
    priceLevel: 3,
    beerPrice: 130,
    rating: 4.8,
    ratingCount: 46,
  },
  {
    name: "Bobby's Bar",
    address: "Carl Johans gate, Trondheim",
    lat: 63.4304,
    lng: 10.3932,
    priceLevel: 2,
    beerPrice: 120,
    rating: 4.2,
    ratingCount: 152,
  },
  {
    name: "No 13",
    address: "Dronningens gate 13, Trondheim",
    lat: 63.4308,
    lng: 10.395,
    priceLevel: 2,
    beerPrice: 110,
    rating: 4.0,
    ratingCount: 96,
  },
  {
    name: "Brooklyn Diner",
    address: "Beddingen 2-4, Trondheim",
    lat: 63.4348,
    lng: 10.4105,
    priceLevel: 3,
    beerPrice: 136,
    rating: 4.1,
    ratingCount: 338,
  },
  {
    name: "Café Løkka",
    address: "Dokkgata 8, Trondheim",
    lat: 63.4338,
    lng: 10.4025,
    priceLevel: 2,
    beerPrice: 120,
    rating: 4.3,
    ratingCount: 1334,
  },
  {
    name: "Sot Bar",
    address: "TMV-kaia 3, Trondheim",
    lat: 63.4358,
    lng: 10.411,
    priceLevel: 2,
    beerPrice: 125,
    rating: 4.3,
    ratingCount: 775,
  },
  {
    name: "Macbeth",
    address: "Søndre gate 22B, Trondheim",
    lat: 63.4325,
    lng: 10.398,
    priceLevel: 2,
    beerPrice: 125,
    rating: 4.2,
    ratingCount: 496,
  },
  {
    name: "Kieglekroa",
    address: "Kongens gate 30, Trondheim",
    lat: 63.4295,
    lng: 10.3915,
    priceLevel: 2,
    beerPrice: 110,
    rating: 4.3,
    ratingCount: 590,
  },
  {
    name: "Pøbel",
    address: "Nordre gate 24, Trondheim",
    lat: 63.4316,
    lng: 10.3965,
    priceLevel: 2,
    beerPrice: 115,
    rating: 4.4,
    ratingCount: 120,
  },
  {
    name: "Tempo",
    address: "Nordre gate 26, Trondheim",
    lat: 63.4315,
    lng: 10.3966,
    priceLevel: 2,
    beerPrice: 100,
    rating: 3.8,
    ratingCount: 135,
  },
  {
    name: "Ray's Bar",
    address: "Krambugata 8, Trondheim",
    lat: 63.4322,
    lng: 10.3995,
    priceLevel: 2,
    beerPrice: 125,
    rating: 4.4,
    ratingCount: 163,
  },
  {
    name: "Grå Bar",
    address: "Olav Tryggvasons gate 20, Trondheim",
    lat: 63.4334,
    lng: 10.3998,
    priceLevel: 1,
    beerPrice: 95,
    rating: 3.9,
    ratingCount: 143,
  },
];

function seedFields(seed: (typeof SEED_BARS)[number]) {
  return {
    name: seed.name,
    address: seed.address,
    lat: seed.lat,
    lng: seed.lng,
    priceLevel: seed.priceLevel,
    beerPrice: seed.beerPrice,
    rating: seed.rating,
    ratingCount: seed.ratingCount,
    openingHours: TYPICAL_HOURS,
    ...(seed.googlePlaceId != null
      ? { googlePlaceId: seed.googlePlaceId }
      : {}),
    isActive: true as const,
  };
}

const GENERIC_CHALLENGES = [
  "Si hei til en fremmed og spør hva favorittbaren deres er",
  "Bytt drikke med noen i laget i tre slurker (æresystem)",
  "Ta et gruppebilde der alle peker mot «neste stopp»",
  "Finn ut hva husets speisial er — uten å lese menyen først",
  "Spill stein-saks-papir om hvem som betaler forrunden",
  "Lag en 10-sekunders toast til kvelden",
  "Velg en sang på jukebox / be bartenderen om en anbefaling",
];

export const seedDatabase = mutation({
  args: {},
  returns: v.object({
    bars: v.number(),
    challenges: v.number(),
    skipped: v.boolean(),
  }),
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("bars")
      .withIndex("by_source", (q) => q.eq("source", "curated"))
      .collect();
    if (existing.length > 0) {
      // Soft-hide builtin-utfordringer med gammel student-/emne-terminologi
      const builtins = await ctx.db
        .query("challenges")
        .withIndex("by_source", (q) => q.eq("source", "builtin"))
        .collect();
      for (const c of builtins) {
        if (/\bemne(t|r)?\b/i.test(c.text) && c.isActive) {
          await ctx.db.patch(c._id, { isActive: false });
        }
      }

      const byName = new Map(existing.map((b) => [b.name, b]));
      let inserted = 0;
      let updated = 0;
      for (const seed of SEED_BARS) {
        const aliasHit = (seed.aliases ?? [])
          .map((a) => byName.get(a))
          .find((b) => b != null);
        const bar = byName.get(seed.name) ?? aliasHit;
        if (bar) {
          await ctx.db.patch(bar._id, seedFields(seed));
          byName.set(seed.name, bar);
          updated++;
        } else {
          const id = await ctx.db.insert("bars", {
            ...seedFields(seed),
            source: "curated",
          });
          byName.set(seed.name, {
            _id: id,
            name: seed.name,
          } as (typeof existing)[number]);
          inserted++;
        }
      }
      return {
        bars: updated + inserted,
        challenges: 0,
        skipped: inserted === 0,
      };
    }

    const now = Date.now();
    const barIds = [];
    for (const bar of SEED_BARS) {
      const id = await ctx.db.insert("bars", {
        ...seedFields(bar),
        source: "curated",
      });
      barIds.push(id);
    }

    let challengeCount = 0;
    for (const text of GENERIC_CHALLENGES) {
      await ctx.db.insert("challenges", {
        text,
        source: "builtin",
        isActive: true,
        createdAt: now,
      });
      challengeCount++;
    }

    const specifics = [
      { idx: 0, text: "Finn Work-Work sin mest «kontor»-aktige krok og ta bilde" },
      { idx: 1, text: "Beundre elva fra Nabo — uten å miste telefonen" },
      { idx: 3, text: "Si «skål for Samfundet» høyt nok til at noen nikker" },
    ];
    for (const s of specifics) {
      const barId = barIds[s.idx];
      if (!barId) continue;
      await ctx.db.insert("challenges", {
        text: s.text,
        barId,
        source: "builtin",
        isActive: true,
        createdAt: now,
      });
      challengeCount++;
    }

    return { bars: barIds.length, challenges: challengeCount, skipped: false };
  },
});
