const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// 1. Generate icon.svg
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#141424" />
      <stop offset="100%" stop-color="#06060c" />
    </radialGradient>
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399" />
      <stop offset="50%" stop-color="#1DB954" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1DB954" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#10B981" stop-opacity="0.05" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background base -->
  <rect width="512" height="512" rx="128" fill="url(#bgGrad)" />
  <rect width="504" height="504" x="4" y="4" rx="124" fill="none" stroke="url(#glowGrad)" stroke-width="4" />

  <!-- Outer ambient ring -->
  <circle cx="256" cy="256" r="180" fill="none" stroke="#1DB954" stroke-opacity="0.15" stroke-width="8" stroke-dasharray="12 12" />
  
  <!-- Glowing central disc -->
  <circle cx="256" cy="256" r="140" fill="#080811" stroke="url(#emeraldGrad)" stroke-width="8" filter="url(#glow)" />

  <!-- Stylized Equalizer / Beat Waves syncing into Play pulse -->
  <g fill="url(#emeraldGrad)">
    <!-- Bar 1 -->
    <rect x="168" y="216" width="18" height="80" rx="9" />
    <!-- Bar 2 -->
    <rect x="204" y="176" width="18" height="160" rx="9" />
    <!-- Bar 3 (Center play pulse) -->
    <rect x="240" y="136" width="18" height="240" rx="9" />
    <!-- Bar 4 -->
    <rect x="276" y="186" width="18" height="140" rx="9" />
    <!-- Bar 5 -->
    <rect x="312" y="226" width="18" height="60" rx="9" />
  </g>
</svg>`;

// 2. Generate Apple Touch Icon SVG (180x180 base)
const appleIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#141424" />
      <stop offset="100%" stop-color="#06060c" />
    </radialGradient>
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399" />
      <stop offset="50%" stop-color="#1DB954" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
  </defs>

  <rect width="180" height="180" rx="40" fill="url(#bgGrad)" />
  <rect width="176" height="176" x="2" y="2" rx="38" fill="none" stroke="#1DB954" stroke-opacity="0.3" stroke-width="2" />

  <circle cx="90" cy="90" r="54" fill="#080811" stroke="url(#emeraldGrad)" stroke-width="4" />

  <g fill="url(#emeraldGrad)">
    <rect x="56" y="75" width="7" height="30" rx="3.5" />
    <rect x="70" y="60" width="7" height="60" rx="3.5" />
    <rect x="84" y="45" width="7" height="90" rx="3.5" />
    <rect x="98" y="64" width="7" height="52" rx="3.5" />
    <rect x="112" y="79" width="7" height="22" rx="3.5" />
  </g>
</svg>`;

// 3. Generate OpenGraph Banner SVG (1200x630)
const ogBannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="ogBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090915" />
      <stop offset="50%" stop-color="#06060c" />
      <stop offset="100%" stop-color="#040408" />
    </linearGradient>
    <radialGradient id="emeraldOrb" cx="20%" cy="30%" r="50%">
      <stop offset="0%" stop-color="#1DB954" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#1DB954" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="purpleOrb" cx="80%" cy="70%" r="55%">
      <stop offset="0%" stop-color="#7C3AED" stop-opacity="0.18" />
      <stop offset="100%" stop-color="#7C3AED" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="textEmerald" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#34D399" />
      <stop offset="60%" stop-color="#1DB954" />
      <stop offset="100%" stop-color="#10B981" />
    </linearGradient>
    <linearGradient id="cardBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.16)" />
      <stop offset="100%" stop-color="rgba(29,185,84,0.1)" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#ogBg)" />
  <circle cx="240" cy="180" r="400" fill="url(#emeraldOrb)" />
  <circle cx="960" cy="450" r="450" fill="url(#purpleOrb)" />

  <!-- Subtle grid pattern -->
  <g stroke="rgba(255,255,255,0.03)" stroke-width="1">
    <line x1="0" y1="105" x2="1200" y2="105" />
    <line x1="0" y1="210" x2="1200" y2="210" />
    <line x1="0" y1="315" x2="1200" y2="315" />
    <line x1="0" y1="420" x2="1200" y2="420" />
    <line x1="0" y1="525" x2="1200" y2="525" />
    <line x1="200" y1="0" x2="200" y2="630" />
    <line x1="400" y1="0" x2="400" y2="630" />
    <line x1="600" y1="0" x2="600" y2="630" />
    <line x1="800" y1="0" x2="800" y2="630" />
    <line x1="1000" y1="0" x2="1000" y2="630" />
  </g>

  <!-- Brand Card Container -->
  <rect x="90" y="80" width="1020" height="470" rx="32" fill="rgba(18, 18, 28, 0.6)" stroke="url(#cardBorder)" stroke-width="1.5" />

  <!-- Top Badge -->
  <g transform="translate(140, 130)">
    <rect width="190" height="34" rx="17" fill="rgba(29, 185, 84, 0.12)" stroke="rgba(29, 185, 84, 0.4)" stroke-width="1" />
    <circle cx="18" cy="17" r="5" fill="#1DB954" />
    <text x="32" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="#34D399" letter-spacing="0.5">NEXT-GEN AUDIO</text>
  </g>

  <!-- Logo + Title -->
  <g transform="translate(140, 230)">
    <!-- Equalizer icon mark -->
    <rect width="68" height="68" rx="20" fill="#0a0a14" stroke="#1DB954" stroke-width="2.5" />
    <g fill="#1DB954">
      <rect x="14" y="26" width="5" height="16" rx="2.5" />
      <rect x="23" y="18" width="5" height="32" rx="2.5" />
      <rect x="32" y="12" width="5" height="44" rx="2.5" />
      <rect x="41" y="20" width="5" height="28" rx="2.5" />
      <rect x="50" y="28" width="5" height="12" rx="2.5" />
    </g>
    <!-- Brand Title -->
    <text x="86" y="52" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="56" font-weight="800" fill="#FFFFFF" letter-spacing="-1">Beat<tspan fill="url(#textEmerald)">Sync</tspan></text>
  </g>

  <!-- Tagline & Description -->
  <text x="140" y="325" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="700" fill="#FFFFFF" letter-spacing="-0.5">Stream Music for Free</text>
  <text x="140" y="365" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="400" fill="#9CA3AF">Modern, fast, and completely free music streaming web app.</text>

  <!-- Feature Pills -->
  <g transform="translate(140, 440)">
    <!-- Pill 1 -->
    <rect x="0" y="0" width="210" height="42" rx="21" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" stroke-width="1" />
    <text x="24" y="26" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500" fill="#E5E7EB">✨ Zero Ads &amp; Free</text>

    <!-- Pill 2 -->
    <rect x="226" y="0" width="220" height="42" rx="21" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" stroke-width="1" />
    <text x="248" y="26" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500" fill="#E5E7EB">⚡ Failover Streaming</text>

    <!-- Pill 3 -->
    <rect x="462" y="0" width="210" height="42" rx="21" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" stroke-width="1" />
    <text x="484" y="26" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500" fill="#E5E7EB">❤️ Local-First Library</text>

    <!-- Pill 4 -->
    <rect x="688" y="0" width="220" height="42" rx="21" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" stroke-width="1" />
    <text x="708" y="26" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500" fill="#E5E7EB">📻 Infinite Smart Queue</text>
  </g>

  <!-- Right Decorative Vinyl Graphic -->
  <g transform="translate(860, 230)">
    <circle cx="100" cy="100" r="110" fill="#0d0d18" stroke="#1f1f2e" stroke-width="1" />
    <circle cx="100" cy="100" r="90" fill="none" stroke="#262638" stroke-width="1" stroke-dasharray="4 8" />
    <circle cx="100" cy="100" r="70" fill="none" stroke="#262638" stroke-width="1" />
    <circle cx="100" cy="100" r="50" fill="none" stroke="#262638" stroke-width="1" stroke-dasharray="3 6" />
    <circle cx="100" cy="100" r="32" fill="url(#textEmerald)" />
    <circle cx="100" cy="100" r="10" fill="#06060c" />
  </g>
</svg>`;

async function run() {
  console.log('Writing public/icon.svg...');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon.svg'), iconSvg);

  console.log('Generating public/apple-touch-icon.png (180x180)...');
  await sharp(Buffer.from(appleIconSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));

  console.log('Generating public/og-image.png (1200x630)...');
  await sharp(Buffer.from(ogBannerSvg))
    .resize(1200, 630)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'og-image.png'));

  console.log('✅ Successfully generated icon.svg, apple-touch-icon.png, and og-image.png');
}

run().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
