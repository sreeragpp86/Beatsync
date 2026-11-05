const sharp = require('sharp');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const inputPath = '/Users/sreerag/.gemini/antigravity/brain/51ed3c19-338e-45fa-82ff-409a321ba8d4/.user_uploaded/media_1793901294065_635a9699.jpg';
const publicDir = path.resolve(__dirname, '../public');

async function generate() {
  console.log('Generating BeatSync PWA icons from:', inputPath);

  // Exact squircle tile bounds measured from 1024x1024 source image:
  // Left: 172, Top: 172, Width: 680, Height: 680
  const cropSize = 680;
  const left = 172;
  const top = 172;
  // Corner radius of the squircle in 680x680 space: ~154px (Apple squircle 22.5%)
  const rx = 154;

  // 1. Extract the squircle tile
  const croppedTile = await sharp(inputPath)
    .extract({ left, top, width: cropSize, height: cropSize })
    .toBuffer();

  // 2. Create squircle mask SVG with transparent outside
  const maskSvg = Buffer.from(`
    <svg width="${cropSize}" height="${cropSize}">
      <rect x="0" y="0" width="${cropSize}" height="${cropSize}" rx="${rx}" ry="${rx}" fill="white" />
    </svg>
  `);

  // Masked tile with clean transparent corners
  const transparentSquircle = await sharp(croppedTile)
    .composite([{ input: maskSvg, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // 3. Generate icon-512.png (512x512)
  await sharp(transparentSquircle)
    .resize(512, 512, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('✓ Generated public/icon-512.png (512x512)');

  // Also save logo.png for references
  await sharp(transparentSquircle)
    .resize(512, 512, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'logo.png'));
  console.log('✓ Generated public/logo.png (512x512)');

  // 4. Generate icon-192.png (192x192)
  await sharp(transparentSquircle)
    .resize(192, 192, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('✓ Generated public/icon-192.png (192x192)');

  // 5. Generate apple-touch-icon.png (180x180 flat iOS touch icon)
  // iOS Apple touch icons must be 100% opaque. The corners are blended with #E4EBF5 base color.
  const bgE4EBF5 = Buffer.from(`
    <svg width="${cropSize}" height="${cropSize}">
      <rect width="${cropSize}" height="${cropSize}" fill="#E4EBF5" />
    </svg>
  `);

  const opaqueTile = await sharp(bgE4EBF5)
    .composite([{ input: transparentSquircle }])
    .png()
    .toBuffer();

  await sharp(opaqueTile)
    .resize(180, 180, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Generated public/apple-touch-icon.png (180x180)');

  // 6. Generate favicon.ico using sips from the crisp icon
  const tempFaviconPng = path.join(publicDir, 'temp-favicon.png');
  await sharp(transparentSquircle)
    .resize(64, 64, { fit: 'fill' })
    .png()
    .toFile(tempFaviconPng);

  const faviconIcoPath = path.join(publicDir, 'favicon.ico');
  execSync(`sips -s format ico "${tempFaviconPng}" --out "${faviconIcoPath}"`, { stdio: 'inherit' });
  fs.unlinkSync(tempFaviconPng);
  console.log('✓ Generated public/favicon.ico');

  console.log('All icons generated successfully!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
