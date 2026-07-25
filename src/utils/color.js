// Generates a full 50–950 Tailwind-style shade scale from a single hex color,
// matching the lightness curve of the app's default brand-red palette (same
// hue/saturation as the input, only lightness is remapped per stop). Used to
// apply a trainer's chosen accent color at runtime via CSS custom properties
// (see tailwind.config.js's `brand` colors + src/index.css defaults).

const LIGHTNESS_CURVE = {
  50: 0.973,
  100: 0.947,
  200: 0.900,
  300: 0.818,
  400: 0.714,
  500: 0.439,
  600: 0.351,
  700: 0.306,
  800: 0.239,
  900: 0.149,
  950: 0.088,
};

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) { h = 0; s = 0; } else {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

function hslToRgb({ h, s, l }) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/** Returns { 50: 'r g b', 100: 'r g b', ... } for every Tailwind stop. */
export function generateBrandShades(hex) {
  const { h, s } = rgbToHsl(hexToRgb(hex));
  const shades = {};
  for (const [stop, l] of Object.entries(LIGHTNESS_CURVE)) {
    const { r, g, b } = hslToRgb({ h, s, l });
    shades[stop] = `${r} ${g} ${b}`;
  }
  return shades;
}

/** Applies (or, if hex is falsy, clears) a custom brand color as CSS variables. */
export function applyBrandColor(hex) {
  const root = document.documentElement;
  if (!hex) {
    Object.keys(LIGHTNESS_CURVE).forEach((stop) => root.style.removeProperty(`--brand-${stop}-rgb`));
    return;
  }
  const shades = generateBrandShades(hex);
  Object.entries(shades).forEach(([stop, rgb]) => root.style.setProperty(`--brand-${stop}-rgb`, rgb));
}
