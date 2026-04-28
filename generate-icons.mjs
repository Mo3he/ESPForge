import sharp from 'sharp';

// Icon SVG: bold outline style hammer+anvil with circuit board, 128x128
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <rect width="128" height="128" rx="20" fill="#0f172a"/>

  <!-- ANVIL silhouette (filled white, outlined black, classic shape) -->
  <g fill="white" stroke="black" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
    <!-- Anvil base block -->
    <rect x="28" y="92" width="72" height="16" rx="4"/>
    <!-- Anvil waist -->
    <path d="M40 80 L88 80 L84 92 L44 92 Z"/>
    <!-- Anvil top body -->
    <path d="M18 66 L110 66 L110 80 L18 80 Z"/>
    <!-- Anvil horn (left) -->
    <path d="M18 66 L18 80 Q4 73 8 67 Z"/>
  </g>

  <!-- Circuit traces on anvil top -->
  <g stroke="#ef4444" stroke-width="2" stroke-linecap="round" fill="none">
    <line x1="40" y1="73" x2="52" y2="73"/>
    <line x1="52" y1="73" x2="52" y2="68"/>
    <line x1="60" y1="73" x2="72" y2="73"/>
    <line x1="80" y1="73" x2="90" y2="73"/>
    <line x1="72" y1="73" x2="72" y2="68"/>
    <line x1="58" y1="73" x2="58" y2="78"/>
  </g>
  <!-- Chip on anvil -->
  <rect x="54" y="68" width="12" height="9" rx="1.5" fill="white" stroke="black" stroke-width="2"/>

  <!-- Strike flash (red line) -->
  <line x1="30" y1="66" x2="88" y2="66" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>

  <!-- Lightning sparks at strike point -->
  <g stroke="black" stroke-width="3" stroke-linecap="round" fill="none">
    <polyline points="44,66 40,58 46,62 42,52"/>
    <polyline points="60,66 62,56 58,60 60,50"/>
  </g>

  <!-- Debris chips -->
  <g fill="black">
    <ellipse cx="34" cy="58" rx="4" ry="2.5" transform="rotate(-30 34 58)"/>
    <ellipse cx="74" cy="55" rx="3.5" ry="2" transform="rotate(20 74 55)"/>
    <ellipse cx="82" cy="62" rx="3" ry="2" transform="rotate(-10 82 62)"/>
  </g>

  <!-- HAMMER (bold outline style, angled top-right to bottom-left) -->
  <g fill="white" stroke="black" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
    <!-- Handle -->
    <line x1="100" y1="14" x2="62" y2="62" stroke="black" stroke-width="11"/>
    <line x1="100" y1="14" x2="62" y2="62" stroke="white" stroke-width="7"/>
    <!-- Grip wrapping -->
    <line x1="96" y1="20" x2="104" y2="12" stroke="black" stroke-width="3" stroke-dasharray="4,4"/>
    <!-- Hammer head (rotated -40deg around its center) -->
    <g transform="rotate(-40, 84, 30)">
      <rect x="64" y="18" width="42" height="24" rx="5"/>
    </g>
  </g>
</svg>`;

// Logo SVG: horizontal layout 250x100
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 100" width="250" height="100">
  <rect width="250" height="100" rx="14" fill="#0f172a"/>

  <!-- ANVIL (small, bold outline) -->
  <g fill="white" stroke="black" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
    <rect x="10" y="76" width="54" height="12" rx="3"/>
    <path d="M18 66 L58 66 L55 76 L21 76 Z"/>
    <rect x="6" y="54" width="62" height="14" rx="2"/>
    <path d="M6 54 L6 68 Q-2 61 2 55 Z"/>
  </g>

  <!-- Circuit on anvil top -->
  <g stroke="#ef4444" stroke-width="1.5" stroke-linecap="round" fill="none">
    <line x1="16" y1="61" x2="24" y2="61"/>
    <line x1="30" y1="61" x2="42" y2="61"/>
    <line x1="48" y1="61" x2="58" y2="61"/>
    <line x1="24" y1="61" x2="24" y2="56"/>
    <line x1="42" y1="61" x2="42" y2="56"/>
  </g>
  <rect x="26" y="55" width="14" height="9" rx="1" fill="white" stroke="black" stroke-width="1.5"/>

  <!-- Strike line -->
  <line x1="10" y1="54" x2="64" y2="54" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>

  <!-- Sparks -->
  <g stroke="black" stroke-width="2.5" stroke-linecap="round" fill="none">
    <polyline points="22,54 19,46 23,50 20,42"/>
    <polyline points="44,54 46,46 43,50 45,42"/>
  </g>
  <g fill="black">
    <ellipse cx="14" cy="47" rx="3" ry="2" transform="rotate(-30 14 47)"/>
    <ellipse cx="54" cy="45" rx="2.5" ry="1.5" transform="rotate(20 54 45)"/>
  </g>

  <!-- HAMMER (bold outline style) -->
  <g fill="white" stroke="black" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
    <line x1="72" y1="14" x2="44" y2="52" stroke="black" stroke-width="8"/>
    <line x1="72" y1="14" x2="44" y2="52" stroke="white" stroke-width="5"/>
    <g transform="rotate(-40, 63, 24)">
      <rect x="46" y="14" width="32" height="18" rx="4"/>
    </g>
  </g>

  <!-- Text -->
  <text x="90" y="58" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="32" fill="#f1f5f9" letter-spacing="-1">ESP</text>
  <text x="154" y="58" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="32" fill="#f97316" letter-spacing="-1">Forge</text>
  <text x="91" y="74" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="11" fill="#64748b" letter-spacing="0.5">ESPHome Config Builder</text>
</svg>`;

await sharp(Buffer.from(iconSvg)).png().toFile('espforge/icon.png');
console.log('icon.png generated (128x128)');

await sharp(Buffer.from(logoSvg)).png().toFile('espforge/logo.png');
console.log('logo.png generated (250x100)');
