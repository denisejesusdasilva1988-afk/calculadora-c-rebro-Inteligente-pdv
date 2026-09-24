import fs from 'fs';
import svg2img from 'svg2img';
import path from 'path';
import { Jimp } from 'jimp';

const normalSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Deep Dark Blue Background -->
  <rect width="512" height="512" rx="112" fill="#0b0f19" />
  
  <!-- Central Radial Glow for ambient light -->
  <circle cx="256" cy="220" r="180" fill="url(#centralGlow)" opacity="0.8" filter="url(#ambientBlur)" />

  <defs>
    <radialGradient id="centralGlow" cx="256" cy="220" r="180" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1e293b" stop-opacity="0.6"/>
      <stop offset="60%" stop-color="#0f172a" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#0b0f19" stop-opacity="0"/>
    </radialGradient>
    <filter id="ambientBlur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="30" />
    </filter>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Stars in the Corners (4-point sparkling stars) -->
  <g transform="translate(40, 50)" filter="url(#glow)">
    <path d="M 0,-15 Q 0,0 15,0 Q 0,0 0,15 Q 0,0 -15,0 Q 0,0 0,-15" fill="#fef08a" />
  </g>
  <g transform="translate(60, 80)" opacity="0.7">
    <path d="M 0,-8 Q 0,0 8,0 Q 0,0 0,8 Q 0,0 -8,0 Q 0,0 0,-8" fill="#fef08a" />
  </g>
  
  <g transform="translate(460, 50)" filter="url(#glow)">
    <path d="M 0,-15 Q 0,0 15,0 Q 0,0 0,15 Q 0,0 -15,0 Q 0,0 0,-15" fill="#fef08a" />
  </g>
  <g transform="translate(440, 80)" opacity="0.7">
    <path d="M 0,-8 Q 0,0 8,0 Q 0,0 0,8 Q 0,0 -8,0 Q 0,0 0,-8" fill="#fef08a" />
  </g>

  <g transform="translate(45, 410)" opacity="0.8">
    <path d="M 0,-12 Q 0,0 12,0 Q 0,0 0,12 Q 0,0 -12,0 Q 0,0 0,-12" fill="#fef08a" />
  </g>
  <g transform="translate(465, 420)" opacity="0.8">
    <path d="M 0,-10 Q 0,0 10,0 Q 0,0 0,10 Q 0,0 -10,0 Q 0,0 0,-10" fill="#93c5fd" />
  </g>

  <!-- Side-Profile Silhouette Head Outline -->
  <path d="M 180,310 C 140,280 130,190 180,130 C 220,85 290,90 320,130 C 335,150 340,170 338,185 L 358,190 L 342,205 C 344,215 340,225 330,230 L 332,242 C 325,250 315,255 310,255 C 295,255 285,275 285,310" 
        stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#glow)" opacity="0.85" />

  <!-- Brain Circuits inside the head -->
  <g>
    <!-- Circuit lines -->
    <path d="M 210,140 C 230,120 270,120 290,140" stroke="#fde047" stroke-width="3" stroke-linecap="round" fill="none" filter="url(#glow)" />
    <circle cx="210" cy="140" r="4.5" fill="#ffffff" filter="url(#glow)" />
    <circle cx="290" cy="140" r="4.5" fill="#fde047" />

    <path d="M 290,140 L 310,165 L 290,190" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" fill="none" filter="url(#glow)" />
    <circle cx="310" cy="165" r="4" fill="#ffffff" />
    <circle cx="290" cy="190" r="4" fill="#38bdf8" />

    <path d="M 250,150 C 220,160 210,190 230,210 C 250,230 280,210 280,180" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.8" />
    <line x1="250" y1="150" x2="280" y2="180" stroke="#fde047" stroke-width="2.5" stroke-dasharray="4 3" />
    <circle cx="250" cy="150" r="5" fill="#fde047" filter="url(#glow)" />
    <circle cx="280" cy="180" r="5" fill="#ffffff" filter="url(#glow)" />

    <path d="M 185,190 C 180,220 210,240 235,225" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" fill="none" />
    <circle cx="185" cy="190" r="4" fill="#38bdf8" />
    <circle cx="235" cy="225" r="4" fill="#fde047" />

    <path d="M 210,140 L 250,150" stroke="#fde047" stroke-width="2" opacity="0.6" />
    <path d="M 235,225 L 230,210" stroke="#38bdf8" stroke-width="2" opacity="0.6" />
    <path d="M 290,190 L 280,180" stroke="#38bdf8" stroke-width="2" opacity="0.6" />
  </g>

  <!-- Golden Cash Register Icon -->
  <g transform="translate(0, -10)">
    <path d="M 205,335 L 307,335 C 310,335 312,337 312,340 L 312,352 C 312,354 310,356 307,356 L 205,356 C 202,356 200,354 200,352 L 200,340 C 200,337 202,335 205,335 Z" 
          stroke="#fde047" stroke-width="4.5" stroke-linejoin="round" fill="#0b0f19" filter="url(#glow)" />
    <circle cx="256" cy="346" r="3.5" fill="#fde047" />

    <path d="M 210,305 L 302,305 L 307,335 L 205,335 Z" 
          stroke="#fde047" stroke-width="4" stroke-linejoin="round" fill="none" filter="url(#glow)" />
    <line x1="220" y1="313" x2="292" y2="313" stroke="#fde047" stroke-width="2" opacity="0.8" />
    <line x1="220" y1="321" x2="292" y2="321" stroke="#fde047" stroke-width="2" opacity="0.8" />
    <line x1="220" y1="329" x2="292" y2="329" stroke="#fde047" stroke-width="2" opacity="0.8" />
    <line x1="234" y1="305" x2="231" y2="335" stroke="#fde047" stroke-width="2" opacity="0.8" />
    <line x1="250" y1="305" x2="249" y2="335" stroke="#fde047" stroke-width="2" opacity="0.8" />
    <line x1="266" y1="305" x2="267" y2="335" stroke="#fde047" stroke-width="2" opacity="0.8" />
    <line x1="282" y1="305" x2="285" y2="335" stroke="#fde047" stroke-width="2" opacity="0.8" />

    <line x1="278" y1="305" x2="278" y2="280" stroke="#fde047" stroke-width="4" filter="url(#glow)" />
    <rect x="260" y="265" width="36" height="15" rx="2.5" stroke="#fde047" stroke-width="3.5" fill="#0b0f19" filter="url(#glow)" />
    <line x1="266" y1="272" x2="290" y2="272" stroke="#fde047" stroke-width="2.5" />

    <path d="M 224,305 L 224,275 L 248,275 L 248,305" stroke="#fde047" stroke-width="3.5" stroke-linejoin="round" fill="#0b0f19" filter="url(#glow)" />
    <text x="236" y="293" font-family="'Inter', system-ui, sans-serif" font-weight="900" font-size="10" fill="#fde047" text-anchor="middle">R$</text>

    <path d="M 312,345 C 322,345 328,335 328,310" stroke="#fde047" stroke-width="3.5" stroke-linecap="round" fill="none" />
    <path d="M 324,285 L 334,295 C 337,298 337,302 334,305 L 328,310" stroke="#fde047" stroke-width="3.5" stroke-linecap="round" fill="none" filter="url(#glow)" />
    <rect x="320" y="275" width="12" height="10" rx="1.5" transform="rotate(30 320 275)" stroke="#fde047" stroke-width="3" fill="#0b0f19" />
    
    <g transform="translate(305, 275)">
      <line x1="0" y1="0" x2="0" y2="15" stroke="#fde047" stroke-width="2.5" />
      <line x1="5" y1="0" x2="5" y2="15" stroke="#fde047" stroke-width="1.2" />
      <line x1="9" y1="0" x2="9" y2="15" stroke="#fde047" stroke-width="3.5" />
      <line x1="15" y1="0" x2="15" y2="15" stroke="#fde047" stroke-width="1.2" />
      <line x1="20" y1="0" x2="20" y2="15" stroke="#fde047" stroke-width="2.5" />
    </g>
  </g>

  <!-- Typography Text -->
  <g filter="url(#glow)">
    <text x="256" y="405" font-family="'Inter', 'Space Grotesk', system-ui, sans-serif" font-weight="900" font-size="34" letter-spacing="1" fill="#fde047" text-anchor="middle">PDV INTELIGENTE</text>
  </g>
  <g transform="translate(422, 395)" filter="url(#glow)">
    <path d="M 0,-7 Q 0,0 7,0 Q 0,0 0,7 Q 0,0 -7,0 Q 0,0 0,-7" fill="#ffffff" />
  </g>

  <text x="256" y="445" font-family="'Inter', system-ui, sans-serif" font-weight="500" font-size="24" fill="#93c5fd" text-anchor="middle">Calculadora &amp; Gestão</text>
</svg>
`;

const maskableSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Solid Background (No rounded corners for maskable icons) -->
  <rect width="512" height="512" fill="#0b0f19" />
  
  <!-- Ambient glow background centered and scaled -->
  <circle cx="256" cy="256" r="150" fill="url(#centralGlow)" opacity="0.8" filter="url(#ambientBlur)" />

  <defs>
    <radialGradient id="centralGlow" cx="256" cy="256" r="150" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1e293b" stop-opacity="0.6"/>
      <stop offset="60%" stop-color="#0f172a" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#0b0f19" stop-opacity="0"/>
    </radialGradient>
    <filter id="ambientBlur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="25" />
    </filter>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Scale and center all content to fit inside the 65% safe zone -->
  <g transform="translate(90, 80) scale(0.65)">
    <!-- Stars -->
    <g transform="translate(40, 50)" filter="url(#glow)">
      <path d="M 0,-15 Q 0,0 15,0 Q 0,0 0,15 Q 0,0 -15,0 Q 0,0 0,-15" fill="#fef08a" />
    </g>
    <g transform="translate(60, 80)" opacity="0.7">
      <path d="M 0,-8 Q 0,0 8,0 Q 0,0 0,8 Q 0,0 -8,0 Q 0,0 0,-8" fill="#fef08a" />
    </g>
    
    <g transform="translate(460, 50)" filter="url(#glow)">
      <path d="M 0,-15 Q 0,0 15,0 Q 0,0 0,15 Q 0,0 -15,0 Q 0,0 0,-15" fill="#fef08a" />
    </g>
    <g transform="translate(440, 80)" opacity="0.7">
      <path d="M 0,-8 Q 0,0 8,0 Q 0,0 0,8 Q 0,0 -8,0 Q 0,0 0,-8" fill="#fef08a" />
    </g>

    <g transform="translate(45, 410)" opacity="0.8">
      <path d="M 0,-12 Q 0,0 12,0 Q 0,0 0,12 Q 0,0 -12,0 Q 0,0 0,-12" fill="#fef08a" />
    </g>
    <g transform="translate(465, 420)" opacity="0.8">
      <path d="M 0,-10 Q 0,0 10,0 Q 0,0 0,10 Q 0,0 -10,0 Q 0,0 0,-10" fill="#93c5fd" />
    </g>

    <!-- Silhouette Head -->
    <path d="M 180,310 C 140,280 130,190 180,130 C 220,85 290,90 320,130 C 335,150 340,170 338,185 L 358,190 L 342,205 C 344,215 340,225 330,230 L 332,242 C 325,250 315,255 310,255 C 295,255 285,275 285,310" 
          stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#glow)" opacity="0.85" />

    <!-- Brain Circuits -->
    <g>
      <path d="M 210,140 C 230,120 270,120 290,140" stroke="#fde047" stroke-width="3" stroke-linecap="round" fill="none" filter="url(#glow)" />
      <circle cx="210" cy="140" r="4.5" fill="#ffffff" filter="url(#glow)" />
      <circle cx="290" cy="140" r="4.5" fill="#fde047" />

      <path d="M 290,140 L 310,165 L 290,190" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" fill="none" filter="url(#glow)" />
      <circle cx="310" cy="165" r="4" fill="#ffffff" />
      <circle cx="290" cy="190" r="4" fill="#38bdf8" />

      <path d="M 250,150 C 220,160 210,190 230,210 C 250,230 280,210 280,180" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.8" />
      <line x1="250" y1="150" x2="280" y2="180" stroke="#fde047" stroke-width="2.5" stroke-dasharray="4 3" />
      <circle cx="250" cy="150" r="5" fill="#fde047" filter="url(#glow)" />
      <circle cx="280" cy="180" r="5" fill="#ffffff" filter="url(#glow)" />

      <path d="M 185,190 C 180,220 210,240 235,225" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" fill="none" />
      <circle cx="185" cy="190" r="4" fill="#38bdf8" />
      <circle cx="235" cy="225" r="4" fill="#fde047" />

      <path d="M 210,140 L 250,150" stroke="#fde047" stroke-width="2" opacity="0.6" />
      <path d="M 235,225 L 230,210" stroke="#38bdf8" stroke-width="2" opacity="0.6" />
      <path d="M 290,190 L 280,180" stroke="#38bdf8" stroke-width="2" opacity="0.6" />
    </g>

    <!-- Cash Register -->
    <g transform="translate(0, -10)">
      <path d="M 205,335 L 307,335 C 310,335 312,337 312,340 L 312,352 C 312,354 310,356 307,356 L 205,356 C 202,356 200,354 200,352 L 200,340 C 200,337 202,335 205,335 Z" 
            stroke="#fde047" stroke-width="4.5" stroke-linejoin="round" fill="#0b0f19" filter="url(#glow)" />
      <circle cx="256" cy="346" r="3.5" fill="#fde047" />

      <path d="M 210,305 L 302,305 L 307,335 L 205,335 Z" 
            stroke="#fde047" stroke-width="4" stroke-linejoin="round" fill="none" filter="url(#glow)" />
      <line x1="220" y1="313" x2="292" y2="313" stroke="#fde047" stroke-width="2" opacity="0.8" />
      <line x1="220" y1="321" x2="292" y2="321" stroke="#fde047" stroke-width="2" opacity="0.8" />
      <line x1="220" y1="329" x2="292" y2="329" stroke="#fde047" stroke-width="2" opacity="0.8" />
      <line x1="234" y1="305" x2="231" y2="335" stroke="#fde047" stroke-width="2" opacity="0.8" />
      <line x1="250" y1="305" x2="249" y2="335" stroke="#fde047" stroke-width="2" opacity="0.8" />
      <line x1="266" y1="305" x2="267" y2="335" stroke="#fde047" stroke-width="2" opacity="0.8" />
      <line x1="282" y1="305" x2="285" y2="335" stroke="#fde047" stroke-width="2" opacity="0.8" />

      <line x1="278" y1="305" x2="278" y2="280" stroke="#fde047" stroke-width="4" filter="url(#glow)" />
      <rect x="260" y="265" width="36" height="15" rx="2.5" stroke="#fde047" stroke-width="3.5" fill="#0b0f19" filter="url(#glow)" />
      <line x1="266" y1="272" x2="290" y2="272" stroke="#fde047" stroke-width="2.5" />

      <path d="M 224,305 L 224,275 L 248,275 L 248,305" stroke="#fde047" stroke-width="3.5" stroke-linejoin="round" fill="#0b0f19" filter="url(#glow)" />
      <text x="236" y="293" font-family="'Inter', system-ui, sans-serif" font-weight="900" font-size="10" fill="#fde047" text-anchor="middle">R$</text>

      <path d="M 312,345 C 322,345 328,335 328,310" stroke="#fde047" stroke-width="3.5" stroke-linecap="round" fill="none" />
      <path d="M 324,285 L 334,295 C 337,298 337,302 334,305 L 328,310" stroke="#fde047" stroke-width="3.5" stroke-linecap="round" fill="none" filter="url(#glow)" />
      <rect x="320" y="275" width="12" height="10" rx="1.5" transform="rotate(30 320 275)" stroke="#fde047" stroke-width="3" fill="#0b0f19" />
      
      <g transform="translate(305, 275)">
        <line x1="0" y1="0" x2="0" y2="15" stroke="#fde047" stroke-width="2.5" />
        <line x1="5" y1="0" x2="5" y2="15" stroke="#fde047" stroke-width="1.2" />
        <line x1="9" y1="0" x2="9" y2="15" stroke="#fde047" stroke-width="3.5" />
        <line x1="15" y1="0" x2="15" y2="15" stroke="#fde047" stroke-width="1.2" />
        <line x1="20" y1="0" x2="20" y2="15" stroke="#fde047" stroke-width="2.5" />
      </g>
    </g>

    <!-- Texts -->
    <g filter="url(#glow)">
      <text x="256" y="405" font-family="'Inter', 'Space Grotesk', system-ui, sans-serif" font-weight="900" font-size="34" letter-spacing="1" fill="#fde047" text-anchor="middle">PDV INTELIGENTE</text>
    </g>
    <g transform="translate(422, 395)" filter="url(#glow)">
      <path d="M 0,-7 Q 0,0 7,0 Q 0,0 0,7 Q 0,0 -7,0 Q 0,0 0,-7" fill="#ffffff" />
    </g>
    <text x="256" y="445" font-family="'Inter', system-ui, sans-serif" font-weight="500" font-size="24" fill="#93c5fd" text-anchor="middle">Calculadora &amp; Gestão</text>
  </g>
</svg>
`;

const desktopScreenshotSvg = `
<svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Dark Blue Modern Theme Background -->
  <rect width="1920" height="1080" fill="#0f172a" />
  
  <!-- Subtle tech grids or glow -->
  <circle cx="960" cy="540" r="600" fill="#1e293b" opacity="0.3" filter="url(#blur)" />

  <defs>
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="80" />
    </filter>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Left Sidebar -->
  <rect x="0" y="0" width="280" height="1080" fill="#090d16" />
  <text x="40" y="60" font-family="system-ui, sans-serif" font-weight="900" font-size="28" fill="#fde047">CÉREBRO PDV</text>
  
  <!-- Navigation Items -->
  <g transform="translate(40, 140)">
    <rect x="0" y="0" width="200" height="45" rx="8" fill="#1e293b" />
    <text x="20" y="28" font-family="system-ui, sans-serif" font-weight="700" font-size="18" fill="#fde047">Frente de Caixa</text>
    
    <text x="20" y="88" font-family="system-ui, sans-serif" font-weight="500" font-size="18" fill="#94a3b8">Histórico de Vendas</text>
    <text x="20" y="148" font-family="system-ui, sans-serif" font-weight="500" font-size="18" fill="#94a3b8">Controle de Caixa</text>
    <text x="20" y="208" font-family="system-ui, sans-serif" font-weight="500" font-size="18" fill="#94a3b8">Agenda &amp; Clientes</text>
    <text x="20" y="268" font-family="system-ui, sans-serif" font-weight="500" font-size="18" fill="#94a3b8">Bloco Inteligente</text>
    <text x="20" y="328" font-family="system-ui, sans-serif" font-weight="500" font-size="18" fill="#94a3b8">Configurações</text>
  </g>

  <!-- Top bar -->
  <rect x="280" y="0" width="1640" height="80" fill="#0b0f19" />
  <text x="320" y="48" font-family="system-ui, sans-serif" font-weight="700" font-size="24" fill="#ffffff">Frente de Caixa (PDV) - Modo Ativo</text>
  
  <!-- Operator Details -->
  <text x="1800" y="46" font-family="system-ui, sans-serif" font-weight="600" font-size="16" fill="#93c5fd" text-anchor="end">Operador: Caixa 01 (Online)</text>

  <!-- Grid / Main Panel -->
  <g transform="translate(320, 120)">
    <!-- Main Sale Display Panel -->
    <rect x="0" y="0" width="800" height="420" rx="16" fill="#0f172a" stroke="#1e293b" stroke-width="2" />
    <text x="30" y="50" font-family="system-ui, sans-serif" font-weight="700" font-size="20" fill="#94a3b8">CUPOM FISCAL EM EMISSÃO</text>
    <line x1="30" y1="75" x2="770" y2="75" stroke="#1e293b" stroke-width="2" />
    
    <!-- Items List inside receipt -->
    <text x="30" y="115" font-family="monospace" font-size="18" fill="#ffffff">001 - Coca-Cola Lata 350ml</text>
    <text x="500" y="115" font-family="monospace" font-size="18" fill="#ffffff" text-anchor="end">2 UN x R$ 5,50</text>
    <text x="770" y="115" font-family="monospace" font-size="18" fill="#ffffff" text-anchor="end">R$ 11,00</text>
    
    <text x="30" y="155" font-family="monospace" font-size="18" fill="#ffffff">002 - Biscoito Recheado Chocolate</text>
    <text x="500" y="155" font-family="monospace" font-size="18" fill="#ffffff" text-anchor="end">3 UN x R$ 3,20</text>
    <text x="770" y="155" font-family="monospace" font-size="18" fill="#ffffff" text-anchor="end">R$ 9,60</text>

    <text x="30" y="195" font-family="monospace" font-size="18" fill="#ffffff">003 - Pão Francês Tradicional Kg</text>
    <text x="500" y="195" font-family="monospace" font-size="18" fill="#ffffff" text-anchor="end">0.450 Kg x R$ 14,90</text>
    <text x="770" y="195" font-family="monospace" font-size="18" fill="#ffffff" text-anchor="end">R$ 6,70</text>

    <!-- Subtotal -->
    <line x1="30" y1="330" x2="770" y2="330" stroke="#fde047" stroke-width="2" stroke-dasharray="8 4" />
    <text x="30" y="380" font-family="system-ui, sans-serif" font-weight="900" font-size="32" fill="#ffffff">TOTAL COMPRA</text>
    <text x="770" y="380" font-family="system-ui, sans-serif" font-weight="900" font-size="38" fill="#fde047" text-anchor="end">R$ 27,30</text>

    <!-- Sidebar actions -->
    <rect x="840" y="0" width="440" height="420" rx="16" fill="#111827" stroke="#1e293b" stroke-width="2" />
    <text x="870" y="50" font-family="system-ui, sans-serif" font-weight="700" font-size="22" fill="#ffffff">PAGAMENTO RÁPIDO</text>
    
    <g transform="translate(870, 90)">
      <!-- Payment options buttons -->
      <rect x="0" y="0" width="380" height="60" rx="10" fill="#22c55e" />
      <text x="190" y="37" font-family="system-ui, sans-serif" font-weight="700" font-size="20" fill="#ffffff" text-anchor="middle">F1 - DINHEIRO (R$ 27,30)</text>

      <rect x="0" y="80" width="380" height="60" rx="10" fill="#0ea5e9" />
      <text x="190" y="117" font-family="system-ui, sans-serif" font-weight="700" font-size="20" fill="#ffffff" text-anchor="middle">F2 - CARTÃO (R$ 27,30)</text>

      <rect x="0" y="160" width="380" height="60" rx="10" fill="#a855f7" />
      <text x="190" y="197" font-family="system-ui, sans-serif" font-weight="700" font-size="20" fill="#ffffff" text-anchor="middle">F3 - PIX QR-CODE</text>

      <!-- Input for received amount -->
      <rect x="0" y="240" width="380" height="70" rx="10" fill="#1f2937" stroke="#3b82f6" stroke-width="2" />
      <text x="20" y="42" font-family="system-ui, sans-serif" font-weight="500" font-size="16" fill="#93c5fd">VALOR RECEBIDO</text>
      <text x="360" y="48" font-family="monospace" font-weight="700" font-size="28" fill="#ffffff" text-anchor="end">50,00</text>
    </g>

    <!-- Bottom Statistics / Summary Cards -->
    <g transform="translate(0, 450)">
      <!-- Card 1: Total Sales of Day -->
      <rect x="0" y="0" width="380" height="150" rx="16" fill="#0b0f19" stroke="#1e293b" stroke-width="2" />
      <text x="30" y="45" font-family="system-ui, sans-serif" font-weight="500" font-size="16" fill="#94a3b8">Faturamento do Dia</text>
      <text x="30" y="105" font-family="monospace" font-weight="700" font-size="34" fill="#22c55e">R$ 1.450,20</text>
      <circle cx="330" cy="75" r="24" fill="#14532d" />
      <path d="M 320,80 L 330,70 L 340,80" stroke="#22c55e" stroke-width="3" stroke-linecap="round" fill="none" />

      <!-- Card 2: Total Items Registred -->
      <rect x="420" y="0" width="380" height="150" rx="16" fill="#0b0f19" stroke="#1e293b" stroke-width="2" />
      <text x="30" y="45" font-family="system-ui, sans-serif" font-weight="500" font-size="16" fill="#94a3b8">Vendas Realizadas</text>
      <text x="30" y="105" font-family="monospace" font-weight="700" font-size="34" fill="#38bdf8">34 Vendas</text>
      <circle cx="330" cy="75" r="24" fill="#0c4a6e" />

      <!-- Card 3: Active Promotions -->
      <rect x="840" y="0" width="440" height="150" rx="16" fill="#0b0f19" stroke="#1e293b" stroke-width="2" />
      <text x="30" y="45" font-family="system-ui, sans-serif" font-weight="500" font-size="16" fill="#94a3b8">Meta Mensal (Caixa)</text>
      <text x="30" y="95" font-family="monospace" font-weight="700" font-size="26" fill="#fbbf24">72.5% Concluído</text>
      <!-- Mini Progress bar -->
      <rect x="30" y="115" width="380" height="10" rx="5" fill="#1e293b" />
      <rect x="30" y="115" width="275" height="10" rx="5" fill="#fbbf24" />
    </g>
  </g>
</svg>
`;

const mobileScreenshotSvg = `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Mobile Screen Frame Mock / Canvas -->
  <rect width="1080" height="1920" fill="#0f172a" />
  
  <!-- Glowing gradient background -->
  <circle cx="540" cy="800" r="500" fill="#1e293b" opacity="0.4" filter="url(#blur)" />

  <defs>
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="80" />
    </filter>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Status Bar -->
  <rect x="0" y="0" width="1080" height="80" fill="#090d16" />
  <text x="60" y="50" font-family="system-ui, sans-serif" font-weight="700" font-size="28" fill="#ffffff">09:41</text>
  <text x="1020" y="50" font-family="system-ui, sans-serif" font-weight="700" font-size="28" fill="#ffffff" text-anchor="end">📶🔋 100%</text>

  <!-- App Header -->
  <rect x="0" y="80" width="1080" height="140" fill="#0b0f19" />
  <text x="60" y="165" font-family="system-ui, sans-serif" font-weight="900" font-size="36" fill="#fde047">CÉREBRO PDV MOBILE</text>
  <text x="1020" y="162" font-family="system-ui, sans-serif" font-weight="600" font-size="22" fill="#22c55e" text-anchor="end">● Caixa Aberto</text>

  <!-- Screen Content Area -->
  <g transform="translate(60, 260)">
    <!-- Numeric Display / Calculator Result -->
    <rect x="0" y="0" width="960" height="180" rx="20" fill="#090d16" stroke="#1e293b" stroke-width="3" />
    <text x="40" y="60" font-family="system-ui, sans-serif" font-weight="500" font-size="24" fill="#93c5fd">VALOR PRODUTO / LEITURA</text>
    <text x="920" y="130" font-family="monospace" font-weight="700" font-size="64" fill="#ffffff" text-anchor="end">R$ 49,90</text>

    <!-- Quick Receipt / Items preview -->
    <rect x="0" y="220" width="960" height="420" rx="20" fill="#111827" stroke="#1e293b" stroke-width="2" />
    <text x="40" y="60" font-family="system-ui, sans-serif" font-weight="700" font-size="24" fill="#ffffff">ITENS REGISTRADOS (3)</text>
    <line x1="40" y1="85" x2="920" y2="85" stroke="#1e293b" stroke-width="2" />
    
    <text x="40" y="140" font-family="monospace" font-size="22" fill="#e2e8f0">Pringles Batata Original 120g</text>
    <text x="920" y="140" font-family="monospace" font-size="22" fill="#fde047" text-anchor="end">R$ 15,90</text>

    <text x="40" y="200" font-family="monospace" font-size="22" fill="#e2e8f0">Suco de Uva Integral 1L</text>
    <text x="920" y="200" font-family="monospace" font-size="22" fill="#fde047" text-anchor="end">R$ 18,50</text>

    <text x="40" y="260" font-family="monospace" font-size="22" fill="#e2e8f0">Leite Integral Caixa 1L</text>
    <text x="920" y="260" font-family="monospace" font-size="22" fill="#fde047" text-anchor="end">R$ 5,50</text>

    <!-- Subtotal layout -->
    <line x1="40" y1="310" x2="920" y2="310" stroke="#fde047" stroke-width="2" stroke-dasharray="8 4" />
    <text x="40" y="375" font-family="system-ui, sans-serif" font-weight="900" font-size="32" fill="#ffffff">TOTAL COMPRA</text>
    <text x="920" y="375" font-family="system-ui, sans-serif" font-weight="900" font-size="40" fill="#22c55e" text-anchor="end">R$ 39,90</text>

    <!-- Keyboard / Pad layout -->
    <g transform="translate(0, 680)">
      <!-- Row 1 -->
      <rect x="0" y="0" width="210" height="150" rx="16" fill="#1e293b" />
      <text x="105" y="90" font-family="system-ui, sans-serif" font-weight="700" font-size="44" fill="#ffffff" text-anchor="middle">7</text>

      <rect x="250" y="0" width="210" height="150" rx="16" fill="#1e293b" />
      <text x="355" y="90" font-family="system-ui, sans-serif" font-weight="700" font-size="44" fill="#ffffff" text-anchor="middle">8</text>

      <rect x="500" y="0" width="210" height="150" rx="16" fill="#1e293b" />
      <text x="605" y="90" font-family="system-ui, sans-serif" font-weight="700" font-size="44" fill="#ffffff" text-anchor="middle">9</text>

      <rect x="750" y="0" width="210" height="150" rx="16" fill="#ca8a04" />
      <text x="855" y="90" font-family="system-ui, sans-serif" font-weight="700" font-size="40" fill="#ffffff" text-anchor="middle">CORRIGE</text>

      <!-- Row 2 -->
      <rect x="0" y="180" width="210" height="150" rx="16" fill="#1e293b" />
      <text x="105" y="270" font-family="system-ui, sans-serif" font-weight="700" font-size="44" fill="#ffffff" text-anchor="middle">4</text>

      <rect x="250" y="180" width="210" height="150" rx="16" fill="#1e293b" />
      <text x="355" y="270" font-family="system-ui, sans-serif" font-weight="700" font-size="44" fill="#ffffff" text-anchor="middle">5</text>

      <rect x="500" y="180" width="210" height="150" rx="16" fill="#1e293b" />
      <text x="605" y="270" font-family="system-ui, sans-serif" font-weight="700" font-size="44" fill="#ffffff" text-anchor="middle">6</text>

      <rect x="750" y="180" width="210" height="150" rx="16" fill="#3b82f6" />
      <text x="855" y="270" font-family="system-ui, sans-serif" font-weight="700" font-size="40" fill="#ffffff" text-anchor="middle">QUANT.</text>

      <!-- Row 3 -->
      <rect x="0" y="360" width="210" height="150" rx="16" fill="#1e293b" />
      <text x="105" y="450" font-family="system-ui, sans-serif" font-weight="700" font-size="44" fill="#ffffff" text-anchor="middle">1</text>

      <rect x="250" y="360" width="210" height="150" rx="16" fill="#1e293b" />
      <text x="355" y="450" font-family="system-ui, sans-serif" font-weight="700" font-size="44" fill="#ffffff" text-anchor="middle">2</text>

      <rect x="500" y="360" width="210" height="150" rx="16" fill="#1e293b" />
      <text x="605" y="450" font-family="system-ui, sans-serif" font-weight="700" font-size="44" fill="#ffffff" text-anchor="middle">3</text>

      <rect x="750" y="360" width="210" height="330" rx="16" fill="#22c55e" />
      <text x="855" y="540" font-family="system-ui, sans-serif" font-weight="900" font-size="44" fill="#ffffff" text-anchor="middle">VENDER</text>

      <!-- Row 4 -->
      <rect x="0" y="540" width="210" height="150" rx="16" fill="#1e293b" />
      <text x="105" y="630" font-family="system-ui, sans-serif" font-weight="700" font-size="44" fill="#ffffff" text-anchor="middle">0</text>

      <rect x="250" y="540" width="460" height="150" rx="16" fill="#1e293b" />
      <text x="480" y="630" font-family="system-ui, sans-serif" font-weight="700" font-size="44" fill="#ffffff" text-anchor="middle">00</text>
    </g>

    <!-- Bottom barcode scanning action trigger -->
    <rect x="0" y="1410" width="960" height="120" rx="20" fill="#6366f1" filter="url(#glow)" />
    <text x="480" y="1480" font-family="system-ui, sans-serif" font-weight="800" font-size="32" fill="#ffffff" text-anchor="middle">📷 LER CÓDIGO DE BARRAS (CÂMERA)</text>
  </g>
</svg>
`;

const splashScreenSvg = `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Deep Dark Blue Background -->
  <rect width="1080" height="1920" fill="#0d1117" />
  
  <!-- Central Radial Glow for ambient light -->
  <circle cx="540" cy="800" r="400" fill="url(#centralGlow)" opacity="0.8" filter="url(#ambientBlur)" />

  <defs>
    <radialGradient id="centralGlow" cx="540" cy="800" r="400" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1e293b" stop-opacity="0.7"/>
      <stop offset="60%" stop-color="#0f172a" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#0d1117" stop-opacity="0"/>
    </radialGradient>
    <filter id="ambientBlur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="60" />
    </filter>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Stars in the Corners (4-point sparkling stars) -->
  <g transform="translate(150, 200)" filter="url(#glow)">
    <path d="M 0,-30 Q 0,0 30,0 Q 0,0 0,30 Q 0,0 -30,0 Q 0,0 0,-30" fill="#fef08a" />
  </g>
  <g transform="translate(930, 200)" filter="url(#glow)">
    <path d="M 0,-30 Q 0,0 30,0 Q 0,0 0,30 Q 0,0 -30,0 Q 0,0 0,-30" fill="#fef08a" />
  </g>
  <g transform="translate(150, 1720)" filter="url(#glow)">
    <path d="M 0,-30 Q 0,0 30,0 Q 0,0 0,30 Q 0,0 -30,0 Q 0,0 0,-30" fill="#fef08a" />
  </g>
  <g transform="translate(930, 1720)" filter="url(#glow)">
    <path d="M 0,-30 Q 0,0 30,0 Q 0,0 0,30 Q 0,0 -30,0 Q 0,0 0,-30" fill="#fef08a" />
  </g>

  <!-- Centered Graphic Group (Brain + Cash Register, scaled up) -->
  <g transform="translate(290, 400) scale(2)">
    <!-- Side-Profile Silhouette Head Outline -->
    <path d="M 180,310 C 140,280 130,190 180,130 C 220,85 290,90 320,130 C 335,150 340,170 338,185 L 358,190 L 342,205 C 344,215 340,225 330,230 L 332,242 C 325,250 315,255 310,255 C 295,255 285,275 285,310" 
          stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#glow)" opacity="0.85" />

    <!-- Brain Circuits inside the head -->
    <g>
      <path d="M 210,140 C 230,120 270,120 290,140" stroke="#fde047" stroke-width="3" stroke-linecap="round" fill="none" filter="url(#glow)" />
      <circle cx="210" cy="140" r="4.5" fill="#ffffff" filter="url(#glow)" />
      <circle cx="290" cy="140" r="4.5" fill="#fde047" />

      <path d="M 290,140 L 310,165 L 290,190" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" fill="none" filter="url(#glow)" />
      <circle cx="310" cy="165" r="4" fill="#ffffff" />
      <circle cx="290" cy="190" r="4" fill="#38bdf8" />

      <path d="M 250,150 C 220,160 210,190 230,210 C 250,230 280,210 280,180" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.8" />
      <line x1="250" y1="150" x2="280" y2="180" stroke="#fde047" stroke-width="2.5" stroke-dasharray="4 3" />
      <circle cx="250" cy="150" r="5" fill="#fde047" filter="url(#glow)" />
      <circle cx="280" cy="180" r="5" fill="#ffffff" filter="url(#glow)" />

      <path d="M 185,190 C 180,220 210,240 235,225" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" fill="none" />
      <circle cx="185" cy="190" r="4" fill="#38bdf8" />
      <circle cx="235" cy="225" r="4" fill="#fde047" />

      <line x1="210" y1="140" x2="250" y2="150" stroke="#fde047" stroke-width="2" opacity="0.6" />
      <line x1="235" y1="225" x2="230" y2="210" stroke="#38bdf8" stroke-width="2" opacity="0.6" />
      <line x1="290" y1="190" x2="280" y2="180" stroke="#38bdf8" stroke-width="2" opacity="0.6" />
    </g>

    <!-- Golden Cash Register Icon -->
    <g transform="translate(0, -10)">
      <path d="M 205,335 L 307,335 C 310,335 312,337 312,340 L 312,352 C 312,354 310,356 307,356 L 205,356 C 202,356 200,354 200,352 L 200,340 C 200,337 202,335 205,335 Z" 
            stroke="#fde047" stroke-width="4.5" stroke-linejoin="round" fill="#0b0f19" filter="url(#glow)" />
      <circle cx="256" cy="346" r="3.5" fill="#fde047" />

      <path d="M 210,305 L 302,305 L 307,335 L 205,335 Z" 
            stroke="#fde047" stroke-width="4" stroke-linejoin="round" fill="none" filter="url(#glow)" />
      <line x1="220" y1="313" x2="292" y2="313" stroke="#fde047" stroke-width="2" opacity="0.8" />
      <line x1="220" y1="321" x2="292" y2="321" stroke="#fde047" stroke-width="2" opacity="0.8" />
      <line x1="220" y1="321" x2="292" y2="321" stroke="#fde047" stroke-width="2" opacity="0.8" />
      <line x1="220" y1="329" x2="292" y2="329" stroke="#fde047" stroke-width="2" opacity="0.8" />
      <line x1="234" y1="305" x2="231" y2="335" stroke="#fde047" stroke-width="2" opacity="0.8" />
      <line x1="250" y1="305" x2="249" y2="335" stroke="#fde047" stroke-width="2" opacity="0.8" />
      <line x1="266" y1="305" x2="267" y2="335" stroke="#fde047" stroke-width="2" opacity="0.8" />
      <line x1="282" y1="305" x2="285" y2="335" stroke="#fde047" stroke-width="2" opacity="0.8" />

      <line x1="278" y1="305" x2="278" y2="280" stroke="#fde047" stroke-width="4" filter="url(#glow)" />
      <rect x="260" y="265" width="36" height="15" rx="2.5" stroke="#fde047" stroke-width="3.5" fill="#0b0f19" filter="url(#glow)" />
      <line x1="266" y1="272" x2="290" y2="272" stroke="#fde047" stroke-width="2.5" />

      <path d="M 224,305 L 224,275 L 248,275 L 248,305" stroke="#fde047" stroke-width="3.5" stroke-linejoin="round" fill="#0b0f19" filter="url(#glow)" />
      <text x="236" y="293" font-family="'Inter', system-ui, sans-serif" font-weight="900" font-size="10" fill="#fde047" text-anchor="middle">R$</text>

      <path d="M 312,345 C 322,345 328,335 328,310" stroke="#fde047" stroke-width="3.5" stroke-linecap="round" fill="none" />
      <path d="M 324,285 L 334,295 C 337,298 337,302 334,305 L 328,310" stroke="#fde047" stroke-width="3.5" stroke-linecap="round" fill="none" filter="url(#glow)" />
      <rect x="320" y="275" width="12" height="10" rx="1.5" transform="rotate(30 320 275)" stroke="#fde047" stroke-width="3" fill="#0b0f19" />
      
      <g transform="translate(305, 275)">
        <line x1="0" y1="0" x2="0" y2="15" stroke="#fde047" stroke-width="2.5" />
        <line x1="5" y1="0" x2="5" y2="15" stroke="#fde047" stroke-width="1.2" />
        <line x1="9" y1="0" x2="9" y2="15" stroke="#fde047" stroke-width="3.5" />
        <line x1="15" y1="0" x2="15" y2="15" stroke="#fde047" stroke-width="1.2" />
        <line x1="20" y1="0" x2="20" y2="15" stroke="#fde047" stroke-width="2.5" />
      </g>
    </g>
  </g>

  <!-- Typography Text -->
  <g filter="url(#glow)">
    <text x="540" y="1300" font-family="'Inter', 'Space Grotesk', system-ui, sans-serif" font-weight="900" font-size="64" letter-spacing="2" fill="#fde047" text-anchor="middle">PDV INTELIGENTE</text>
  </g>
  <g transform="translate(860, 1280)" filter="url(#glow)">
    <path d="M 0,-15 Q 0,0 15,0 Q 0,0 0,15 Q 0,0 -15,0 Q 0,0 0,-15" fill="#ffffff" />
  </g>

  <text x="540" y="1390" font-family="'Inter', system-ui, sans-serif" font-weight="500" font-size="44" fill="#93c5fd" text-anchor="middle">Calculadora &amp; Gestão</text>
</svg>
`;

async function convertSvgToPng(svgString, outputWidth, outputHeight, outputPath) {
  return new Promise((resolve, reject) => {
    svg2img(svgString, { width: outputWidth, height: outputHeight }, (err, buffer) => {
      if (err) {
        reject(err);
      } else {
        fs.writeFileSync(outputPath, buffer);
        console.log(`Saved: ${outputPath} (${outputWidth}x${outputHeight})`);
        resolve();
      }
    });
  });
}

async function main() {
  try {
    console.log('Writing clean vector source to public/icon.svg...');
    fs.writeFileSync('public/icon.svg', normalSvg.trim());

    console.log('Generating PWA icons from SVG with high fidelity...');
    
    // Normal Icons
    await convertSvgToPng(normalSvg, 512, 512, 'public/icon-512.png');
    await convertSvgToPng(normalSvg, 192, 192, 'public/icon-192.png');
    
    // Resize to exact 192x192 using Jimp
    console.log('Resizing public/icon-192.png to exact 192x192...');
    const img192 = await Jimp.read('public/icon-192.png');
    img192.resize({ w: 192, h: 192 });
    await img192.write('public/icon-192.png');

    // Maskable Icons (scaled in safe zone)
    await convertSvgToPng(maskableSvg, 512, 512, 'public/icon-512-maskable.png');
    await convertSvgToPng(maskableSvg, 192, 192, 'public/icon-192-maskable.png');

    // Resize to exact 192x192 using Jimp
    console.log('Resizing public/icon-192-maskable.png to exact 192x192...');
    const img192Maskable = await Jimp.read('public/icon-192-maskable.png');
    img192Maskable.resize({ w: 192, h: 192 });
    await img192Maskable.write('public/icon-192-maskable.png');

    console.log('Generating uncorrupted PWA screenshots...');
    await convertSvgToPng(desktopScreenshotSvg, 1920, 1080, 'public/screenshot-desktop.png');
    await convertSvgToPng(mobileScreenshotSvg, 1080, 1920, 'public/screenshot-mobile.png');

    console.log('Generating PWA splash screen...');
    await convertSvgToPng(splashScreenSvg, 1080, 1920, 'public/splash-screen.png');

    console.log('All PWA assets generated successfully!');
  } catch (err) {
    console.error('Error generating PWA assets:', err);
    process.exit(1);
  }
}

main();
