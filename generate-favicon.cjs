// Node.js script to generate favicon from Command Shield icon
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Command Shield drawing function (first icon from the JSX file)
function drawCommandShield(ctx, s) {
  const cx = s / 2, cy = s / 2;
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, s, s);
  grad.addColorStop(0, '#0f2847');
  grad.addColorStop(1, '#0a1a30');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.46, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = s * 0.025;
  ctx.beginPath();
  ctx.moveTo(cx, s * 0.14);
  ctx.lineTo(s * 0.82, s * 0.30);
  ctx.lineTo(s * 0.82, s * 0.58);
  ctx.quadraticCurveTo(s * 0.82, s * 0.78, cx, s * 0.88);
  ctx.quadraticCurveTo(s * 0.18, s * 0.78, s * 0.18, s * 0.58);
  ctx.lineTo(s * 0.18, s * 0.30);
  ctx.closePath();
  ctx.stroke();
  const sg = ctx.createLinearGradient(0, s * 0.14, 0, s * 0.88);
  sg.addColorStop(0, 'rgba(59,130,246,0.15)');
  sg.addColorStop(1, 'rgba(59,130,246,0.03)');
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = s * 0.035;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s * 0.30, s * 0.42);
  ctx.lineTo(cx, s * 0.54);
  ctx.lineTo(s * 0.70, s * 0.42);
  ctx.stroke();
  ctx.fillStyle = '#e0e8ff';
  ctx.font = `bold ${s * 0.16}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PC', cx, s * 0.68);
  ctx.restore();
}

// Generate PNG at specific size
function generatePNG(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  drawCommandShield(ctx, size);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filename, buffer);
  console.log(`✓ Generated ${filename} (${size}x${size})`);
}

// Generate SVG (scalable version)
function generateSVG(filename) {
  const size = 512;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f2847"/>
      <stop offset="100%" style="stop-color:#0a1a30"/>
    </linearGradient>
    <linearGradient id="shield" x1="0%" y1="${size * 0.14}" x2="0%" y2="${size * 0.88}">
      <stop offset="0%" style="stop-color:rgba(59,130,246,0.15)"/>
      <stop offset="100%" style="stop-color:rgba(59,130,246,0.03)"/>
    </linearGradient>
  </defs>
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.46}" fill="url(#bg)"/>
  <path d="M ${size/2},${size * 0.14} L ${size * 0.82},${size * 0.30} L ${size * 0.82},${size * 0.58} Q ${size * 0.82},${size * 0.78} ${size/2},${size * 0.88} Q ${size * 0.18},${size * 0.78} ${size * 0.18},${size * 0.58} L ${size * 0.18},${size * 0.30} Z"
        fill="url(#shield)"
        stroke="#3b82f6"
        stroke-width="${size * 0.025}"/>
  <path d="M ${size * 0.30},${size * 0.42} L ${size/2},${size * 0.54} L ${size * 0.70},${size * 0.42}"
        stroke="#60a5fa"
        stroke-width="${size * 0.035}"
        stroke-linecap="round"
        fill="none"/>
  <text x="${size/2}" y="${size * 0.68}"
        font-family="Arial"
        font-size="${size * 0.16}"
        font-weight="bold"
        fill="#e0e8ff"
        text-anchor="middle"
        dominant-baseline="middle">PC</text>
</svg>`;

  fs.writeFileSync(filename, svg);
  console.log(`✓ Generated ${filename} (SVG)`);
}

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating Portfolio Commander favicons...\n');

// Generate all required sizes
generatePNG(16, path.join(publicDir, 'favicon-16x16.png'));
generatePNG(32, path.join(publicDir, 'favicon-32x32.png'));
generatePNG(180, path.join(publicDir, 'apple-touch-icon.png'));
generatePNG(192, path.join(publicDir, 'android-chrome-192x192.png'));
generatePNG(512, path.join(publicDir, 'android-chrome-512x512.png'));
generateSVG(path.join(publicDir, 'favicon.svg'));

console.log('\n✅ All favicons generated successfully!');
console.log('Files created in /public directory');
