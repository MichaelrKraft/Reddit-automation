const sharp = require('sharp');
const path = require('path');

async function generateOGImage() {
  const width = 1200;
  const height = 630;

  // Create SVG with dark background, gradient, and text
  const svgBackground = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0f172a"/>
          <stop offset="50%" style="stop-color:#1e293b"/>
          <stop offset="100%" style="stop-color:#0f172a"/>
        </linearGradient>
        <radialGradient id="glow1" cx="85%" cy="15%" r="35%">
          <stop offset="0%" style="stop-color:rgba(239,68,68,0.3)"/>
          <stop offset="100%" style="stop-color:rgba(239,68,68,0)"/>
        </radialGradient>
        <radialGradient id="glow2" cx="15%" cy="85%" r="40%">
          <stop offset="0%" style="stop-color:rgba(249,115,22,0.2)"/>
          <stop offset="100%" style="stop-color:rgba(249,115,22,0)"/>
        </radialGradient>
        <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#f97316"/>
          <stop offset="100%" style="stop-color:#ef4444"/>
        </linearGradient>
        <linearGradient id="badgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#f97316"/>
          <stop offset="100%" style="stop-color:#ec4899"/>
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="100%" height="100%" fill="url(#bg)"/>

      <!-- Glow effects -->
      <rect width="100%" height="100%" fill="url(#glow1)"/>
      <rect width="100%" height="100%" fill="url(#glow2)"/>

      <!-- Logo text -->
      <text x="600" y="220" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="72" font-weight="800" fill="url(#textGradient)">ReddRide</text>

      <!-- Tagline -->
      <text x="600" y="290" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="36" font-weight="600" fill="#e2e8f0">AI-Powered Reddit Marketing</text>

      <!-- Subtitle -->
      <text x="600" y="350" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="24" fill="#94a3b8">Get upvotes, not shadowbans. Build authentic credibility.</text>

      <!-- Badge background -->
      <rect x="400" y="400" width="400" height="50" rx="25" fill="url(#badgeGradient)"/>

      <!-- Badge text -->
      <text x="600" y="433" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="600" fill="white">Alpha Launch - Free for First 20 Users</text>
    </svg>
  `;

  // Create the background image from SVG
  const backgroundBuffer = await sharp(Buffer.from(svgBackground))
    .png()
    .toBuffer();

  // Load and resize the elephant icon
  const elephantPath = path.join(__dirname, '../public/red-elephant-icon.png');
  const elephantBuffer = await sharp(elephantPath)
    .resize(120, 120, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Composite the elephant onto the background (bottom left)
  const outputPath = path.join(__dirname, '../public/og-image.png');

  await sharp(backgroundBuffer)
    .composite([
      {
        input: elephantBuffer,
        left: 40,
        top: 480,
      }
    ])
    .toFile(outputPath);

  console.log('OG image created successfully at:', outputPath);
}

generateOGImage().catch(console.error);
