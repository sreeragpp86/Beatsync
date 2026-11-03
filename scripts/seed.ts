import * as dns from "dns";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Ensure IPv4 resolution first for stable connections
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignore in environments where not supported
}

// Load environment variables from .env.local if not already provided
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (key && rest.length > 0) {
        const val = rest.join("=").replace(/^['"]|['"]$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: Missing Supabase credentials in .env.local or process environment.");
  console.error("Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}

// Polyfill WebSocket for Node < 22 environments where Supabase Realtime checks constructor
if (typeof (globalThis as any).WebSocket === "undefined") {
  (globalThis as any).WebSocket = class DummyWebSocket {};
}

const supabase = createClient(supabaseUrl, supabaseKey);

export interface SeedTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  album?: string;
  duration: number;
  cover_url: string;
  audio_url: string;
}

export const SEED_TRACKS: SeedTrack[] = [
  {
    id: "track-1",
    title: "September Song",
    artist: "The Melachrino Strings",
    genre: "Jazz / Orchestral",
    album: "Timeless Melodies",
    duration: 193,
    cover_url:
      "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&h=600&fit=crop&q=80",
    audio_url:
      "https://archive.org/download/78_september-song_the-melachrino-strings-kurt-weill-george-melachrino_gbia7017084a/SEPTEMBER%20SONG%20-%20THE%20MELACHRINO%20STRINGS%20-%20Kurt%20Weill.mp3",
  },
  {
    id: "track-2",
    title: "Lorelei",
    artist: "Kalman & Lampman",
    genre: "Classical / Romantic",
    album: "Golden Radiance",
    duration: 178,
    cover_url:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=600&fit=crop&q=80",
    audio_url:
      "https://archive.org/download/78_lorelei_kalman-lampman-silcher_gbia0444954a/LORELEI%20-%20KALMAN%20%26%20LAMPMAN%20-%20SILCHER.mp3",
  },
  {
    id: "track-3",
    title: "Skater's Waltz",
    artist: "Grand Salon Ensemble",
    genre: "Waltz / Ballroom",
    album: "Classic Ballrooms",
    duration: 157,
    cover_url:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=600&fit=crop&q=80",
    audio_url:
      "https://archive.org/download/78_skaters-waltz_gbia0432199a/SKATER%27S%20WALTZ.mp3",
  },
  {
    id: "track-4",
    title: "Pantomime (Daphnis et Chloé)",
    artist: "Serge Koussevitzky & Boston Symphony Orchestra",
    genre: "Impressionist",
    album: "Symphonic Heritage",
    duration: 242,
    cover_url:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=600&fit=crop&q=80",
    audio_url:
      "https://archive.org/download/78_2-pantomime-part-1_serge-koussevitzky-and-the-boston-symphony-orchestra-ravel_gbia7002688b/2.%20Pantomime%20(Part%201)%20-%20SERGE%20KOUSSEVITZKY%20and%20the%20BOSTON%20SYMPHONY%20ORCHESTRA.mp3",
  },
  {
    id: "track-5",
    title: "Concerto in D Minor (Vivace)",
    artist: "Hermann Diener & Charlotte Hampe",
    genre: "Baroque",
    album: "Baroque Masterworks",
    duration: 184,
    cover_url:
      "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&h=600&fit=crop&q=80",
    audio_url:
      "https://archive.org/download/78_2-satz-1-teil-largo-ma-non-tanto_hermann-diener-charlotte-hampe-collegium-musi_gbia7003149/01%20-%201.%20Satz%3A%20Vivace%20-%20Hermann%20Diener%20-%20Charlotte%20Hampe.mp3",
  },
  {
    id: "track-6",
    title: "Clair de Lune",
    artist: "Claude Debussy (USMC String Orchestra)",
    genre: "Impressionist / Piano",
    album: "Moonlight Harmonies",
    duration: 304,
    cover_url:
      "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=600&h=600&fit=crop&q=80",
    audio_url:
      "https://archive.org/download/DebussyClairDeLune_641/DebussyClairDeLune.mp3",
  },
  {
    id: "track-7",
    title: "Moonlight Sonata (Adagio Sostenuto)",
    artist: "Ludwig van Beethoven (Paul Pitman)",
    genre: "Classical",
    album: "Immortal Sonatas",
    duration: 315,
    cover_url:
      "https://images.unsplash.com/photo-1520523839898-50712825e617?w=600&h=600&fit=crop&q=80",
    audio_url:
      "https://archive.org/download/MoonlightSonata_755/Beethoven-MoonlightSonata.mp3",
  },
  {
    id: "track-8",
    title: "The Four Seasons: Spring (Allegro)",
    artist: "Antonio Vivaldi (Wichita State Chamber Players)",
    genre: "Baroque / Strings",
    album: "The Four Seasons",
    duration: 216,
    cover_url:
      "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=600&h=600&fit=crop&q=80",
    audio_url:
      "https://archive.org/download/VivaldiTheFourSeasons_201306/01_Spring_Allegro.mp3",
  },
  {
    id: "track-9",
    title: "Air on the G String",
    artist: "Johann Sebastian Bach (US Air Force Strings)",
    genre: "Baroque",
    album: "Orchestral Suites",
    duration: 260,
    cover_url:
      "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&h=600&fit=crop&q=80",
    audio_url:
      "https://archive.org/download/AirOnTheGString_953/BachAirOnTheGString.mp3",
  },
  {
    id: "track-10",
    title: "Gymnopédie No. 1",
    artist: "Erik Satie (Kevin MacLeod)",
    genre: "Ambient / Classical",
    album: "Minimalist Reverie",
    duration: 183,
    cover_url:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&h=600&fit=crop&q=80",
    audio_url:
      "https://archive.org/download/GymnopedieNo.1_888/GymnopedieNo1.mp3",
  },
  {
    id: "track-11",
    title: "Nocturne in E-flat Major, Op. 9 No. 2",
    artist: "Frédéric Chopin (Frank Levy)",
    genre: "Romantic / Piano",
    album: "Nocturnes for Nightfall",
    duration: 272,
    cover_url:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=600&fit=crop&q=80",
    audio_url:
      "https://archive.org/download/ChopinNocturneOp9No2_630/ChopinNocturneOp9No2.mp3",
  },
  {
    id: "track-12",
    title: "The Blue Danube (Waltz)",
    artist: "Johann Strauss II (Philadelphia Orchestra)",
    genre: "Classical / Waltz",
    album: "Viennese Waltzes",
    duration: 452,
    cover_url:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=600&fit=crop&q=80",
    audio_url:
      "https://archive.org/download/78_the-blue-danube-waltz_the-philadelphia-orchestra-leopold-stokowski-j-strauss_gbia0004523a/The%20Blue%20Danube%20-%20Waltz%20-%20The%20Philadelphia%20Orchestra.mp3",
  },
];

async function seed() {
  console.log(`🌊 [SoundWave Seeder] Connecting to Supabase at: ${supabaseUrl}`);
  console.log(`🎵 Seeding ${SEED_TRACKS.length} royalty-free tracks into table "tracks"...`);

  // First attempt with all fields (including genre if available in schema)
  let { data, error } = await supabase
    .from("tracks")
    .upsert(SEED_TRACKS, { onConflict: "id" })
    .select("id, title, artist");

  // If table lacks 'genre' column, strip genre and upsert core fields
  if (error && error.message.includes("'genre' column")) {
    console.warn("⚠️  Table 'tracks' lacks 'genre' column. Retrying with core schema columns...");
    const coreTracks = SEED_TRACKS.map(({ genre, ...rest }) => rest);
    const retry = await supabase
      .from("tracks")
      .upsert(coreTracks, { onConflict: "id" })
      .select("id, title, artist");

    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error("❌ Seeding failed with Supabase error:", error.message);
    process.exit(1);
  }

  console.log(`✅ Successfully seeded ${data?.length || SEED_TRACKS.length} tracks into Supabase!`);
  if (data) {
    data.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.title} - ${t.artist} (${t.id})`);
    });
  }
}

seed().catch((err) => {
  console.error("❌ Unexpected seeding error:", err);
  process.exit(1);
});
