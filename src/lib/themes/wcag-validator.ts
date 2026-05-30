import { AccessibilityIssue, ThemeColors } from '@/types/theme';

/**
 * Helper to convert HEX to RGB
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
}

/**
 * Helper to convert HSL to RGB
 * hsl(H, S%, L%)
 */
function hslToRgb(hslStr: string): [number, number, number] | null {
  const match = hslStr.match(/hsla?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*(?:,\s*[\d.]+\s*)?\)/);
  if (!match) return null;

  let h = parseFloat(match[1]) / 360;
  let s = parseFloat(match[2]) / 100;
  let l = parseFloat(match[3]) / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Helper to parse any supported color (Hex, RGB, HSL) into RGB array
 */
function parseColorToRgb(color: string): [number, number, number] | null {
  if (color.startsWith('#')) {
    return hexToRgb(color);
  }
  if (color.startsWith('hsl')) {
    return hslToRgb(color);
  }
  if (color.startsWith('rgb')) {
    const match = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)/);
    if (match) {
      return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
    }
  }
  // Try mapping common colors if needed or fallback
  return null;
}

/**
 * Calculate the relative luminance of a color
 * Based on WCAG 2.0 formula
 */
export function getRelativeLuminance(color: string): number {
  const rgb = parseColorToRgb(color);
  if (!rgb) return 0; // fallback if parsing fails

  const [R, G, B] = rgb.map(c => {
    const sRGB = c / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Calculate contrast ratio between two colors
 * Returns ratio e.g., 4.5 for 4.5:1
 */
export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100; // round to 2 decimal places
}

/**
 * Validates ThemeColors for WCAG contrast compliance
 */
export function validateThemeContrast(colors: ThemeColors): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];

  const checkContrast = (
    bgProp: keyof ThemeColors,
    fgProp: keyof ThemeColors,
    requiredRatio: number,
    context: string
  ) => {
    const bg = colors[bgProp] as string;
    const fg = colors[fgProp] as string;
    
    if (!bg || !fg) return;

    const ratio = getContrastRatio(bg, fg);
    if (ratio < requiredRatio) {
      issues.push({
        type: 'contrast',
        severity: ratio < 3 ? 'error' : 'warning',
        message: `${context} contrast ratio is too low (${ratio}:1). Requires at least ${requiredRatio}:1 for WCAG compliance.`,
        backgroundColor: bg,
        foregroundColor: fg,
        contrastRatio: ratio,
        requiredRatio: requiredRatio,
        property: fgProp
      });
    }
  };

  // Normal text contrast (requires 4.5:1)
  checkContrast('background', 'foreground', 4.5, 'Main content');
  checkContrast('card', 'cardForeground', 4.5, 'Card content');
  checkContrast('popover', 'popoverForeground', 4.5, 'Popover content');
  checkContrast('primary', 'primaryForeground', 4.5, 'Primary button');
  checkContrast('secondary', 'secondaryForeground', 4.5, 'Secondary button');
  checkContrast('muted', 'mutedForeground', 4.5, 'Muted text');
  checkContrast('accent', 'accentForeground', 4.5, 'Accent text');
  checkContrast('destructive', 'destructiveForeground', 4.5, 'Destructive button');
  
  // Interactive element boundaries (requires 3:1)
  checkContrast('background', 'border', 3.0, 'Border visibility');
  checkContrast('background', 'input', 3.0, 'Input border visibility');
  checkContrast('background', 'ring', 3.0, 'Focus ring visibility');

  return issues;
}
