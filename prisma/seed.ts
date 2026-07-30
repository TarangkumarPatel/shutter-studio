/**
 * Seeds the database with 8 procedurally-generated placeholder photographs
 * so the site is fully explorable immediately after setup — no external
 * image downloads required (works offline, and avoids licensing questions
 * for a demo). Replace them with real photos via /admin whenever you like.
 */
import { PrismaClient } from "../src/generated/prisma";
import { processUploadedPhoto } from "../src/lib/image";

const prisma = new PrismaClient();

interface PhotoSpec {
  title: string;
  description: string;
  width: number;
  height: number;
  colorFrom: string;
  colorTo: string;
  accent: string;
  daysAgo: number;
  likeCount: number;
  comments?: { name: string; text: string }[];
}

const SPECS: PhotoSpec[] = [
  {
    title: "Harbor at Dusk",
    description: "Long exposure over still water as the last boats come in.",
    width: 1600,
    height: 1000,
    colorFrom: "#3a2a1c",
    colorTo: "#e3a94a",
    accent: "#f5c778",
    daysAgo: 1,
    likeCount: 34,
    comments: [{ name: "Mara T.", text: "That reflection is unreal — what time of day?" }],
  },
  {
    title: "Concrete & Light",
    description: "Brutalist stairwell, midday sun cutting hard shadows.",
    width: 1000,
    height: 1400,
    colorFrom: "#1c2226",
    colorTo: "#5b7480",
    accent: "#9fb8c2",
    daysAgo: 3,
    likeCount: 21,
  },
  {
    title: "Portrait in Amber",
    description: "Studio portrait, single tungsten key light, film grain.",
    width: 1100,
    height: 1400,
    colorFrom: "#26150c",
    colorTo: "#b5652c",
    accent: "#e8a15c",
    daysAgo: 40,
    likeCount: 89,
    comments: [
      { name: "Diego R.", text: "The color grading here is incredible." },
      { name: "Priya S.", text: "Reminds me of old Kodachrome stock. Love it." },
    ],
  },
  {
    title: "Quiet Interior",
    description: "Morning light through linen curtains, nobody home.",
    width: 1300,
    height: 1300,
    colorFrom: "#221f1a",
    colorTo: "#a99878",
    accent: "#d9c9a3",
    daysAgo: 20,
    likeCount: 52,
  },
  {
    title: "Coastal Fog",
    description: "A cliffside path disappearing into low cloud.",
    width: 1600,
    height: 1050,
    colorFrom: "#12181c",
    colorTo: "#5c7480",
    accent: "#8fa5ad",
    daysAgo: 60,
    likeCount: 67,
    comments: [{ name: "Owen K.", text: "So atmospheric. Feels cold just looking at it." }],
  },
  {
    title: "Night Market",
    description: "Neon signage and steam over a late-night noodle stall.",
    width: 1050,
    height: 1400,
    colorFrom: "#1a0b0f",
    colorTo: "#8c2b3a",
    accent: "#e0546a",
    daysAgo: 10,
    likeCount: 45,
  },
  {
    title: "Desert Line",
    description: "A single road splitting an ocean of sand at noon.",
    width: 1600,
    height: 900,
    colorFrom: "#241a0d",
    colorTo: "#c48a3f",
    accent: "#e9c07f",
    daysAgo: 90,
    likeCount: 103,
    comments: [
      { name: "Hana W.", text: "The minimalism here is everything. Stunning composition." },
    ],
  },
  {
    title: "Mountain Silence",
    description: "First light on a ridgeline, nobody awake but the birds.",
    width: 1100,
    height: 1500,
    colorFrom: "#0f1c22",
    colorTo: "#2f6f6e",
    accent: "#7fbdb8",
    daysAgo: 6,
    likeCount: 15,
  },
];

function generateSvg(spec: PhotoSpec): string {
  const { width, height, colorFrom, colorTo, accent } = spec;
  const seedValue = width * height;
  const rand = (n: number) => {
    const x = Math.sin(seedValue + n) * 10000;
    return x - Math.floor(x);
  };

  const blobs = Array.from({ length: 4 })
    .map((_, i) => {
      const cx = rand(i) * width;
      const cy = rand(i + 10) * height;
      const r = width * (0.18 + rand(i + 20) * 0.22);
      return `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(
        0,
      )}" fill="${accent}" opacity="${(0.06 + rand(i + 30) * 0.08).toFixed(2)}" />`;
    })
    .join("\n");

  const horizonY = height * (0.55 + rand(99) * 0.15);

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="30%" y2="100%">
      <stop offset="0%" stop-color="${colorFrom}" />
      <stop offset="100%" stop-color="${colorTo}" />
    </linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="${width * 0.04}" /></filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)" />
  <g filter="url(#blur)">${blobs}</g>
  <rect x="0" y="${horizonY.toFixed(0)}" width="${width}" height="${(height - horizonY).toFixed(
    0,
  )}" fill="black" opacity="0.18" />
  <rect width="${width}" height="${height}" fill="black" opacity="0.08" />
</svg>`.trim();
}

async function main() {
  console.log("Seeding placeholder photos…");

  const existing = await prisma.photo.count();
  if (existing > 0) {
    console.log(`Database already has ${existing} photo(s) — skipping seed.`);
    console.log("Delete prisma/dev.db (or the Photo table rows) if you want to reseed.");
    return;
  }

  for (const spec of SPECS) {
    const svg = generateSvg(spec);
    const buffer = await sharpFromSvg(svg);
    const processed = await processUploadedPhoto(buffer);

    const createdAt = new Date(Date.now() - spec.daysAgo * 24 * 60 * 60 * 1000);

    const photo = await prisma.photo.create({
      data: {
        title: spec.title,
        description: spec.description,
        storageKey: processed.storageKey,
        originalKey: processed.originalKey,
        width: processed.width,
        height: processed.height,
        blurDataUrl: processed.blurDataUrl,
        likeCount: spec.likeCount,
        createdAt,
        updatedAt: createdAt,
      },
    });

    if (spec.comments) {
      for (const comment of spec.comments) {
        await prisma.comment.create({
          data: {
            photoId: photo.id,
            name: comment.name,
            text: comment.text,
            ipHash: "seed",
            createdAt,
          },
        });
      }
    }

    console.log(`  ✓ ${spec.title}`);
  }

  console.log(`Seeded ${SPECS.length} photos.`);
}

async function sharpFromSvg(svg: string): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
