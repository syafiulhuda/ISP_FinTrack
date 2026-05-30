import { ThemeColors } from '@/types/theme';

/**
 * Converts a camelCase string to kebab-case
 * Example: 'cardForeground' -> 'card-foreground'
 */
export function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

/**
 * Transforms ThemeColors object into CSS variable key-value pairs
 * Example: { background: '#fff' } -> { '--background': '#fff' }
 */
export function generateCssVariables(colors: ThemeColors): Record<string, string> {
  const cssVariables: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(colors)) {
    if (value) {
      const cssVarName = `--${camelToKebab(key)}`;
      cssVariables[cssVarName] = value as string;
    }
  }

  return cssVariables;
}

/**
 * Applies theme colors to the target element (or :root by default).
 * Uses requestAnimationFrame to prevent layout thrashing and batch DOM updates.
 *
 * @param colors The theme colors to apply
 * @param targetElement The element to apply the styles to (defaults to document.documentElement)
 */
export function applyThemeColors(colors: ThemeColors, targetElement?: HTMLElement): void {
  // Use provided element, fallback to document.documentElement if in browser
  const el = targetElement || (typeof document !== 'undefined' ? document.documentElement : null);
  
  if (!el) {
    return; // Cannot apply if no target element and no document
  }

  const cssVariables = generateCssVariables(colors);

  // If applying globally, save the raw CSS text to localStorage for the blocking script
  if (!targetElement && typeof window !== 'undefined') {
    const cssText = Object.entries(cssVariables).map(([k, v]) => `${k}: ${v}`).join(';');
    localStorage.setItem('isp_fintrack_theme_css', cssText);
  }

  // Batch DOM updates in the next animation frame for performance (<100ms budget)
  if (typeof window !== 'undefined' && window.requestAnimationFrame) {
    window.requestAnimationFrame(() => {
      for (const [cssVar, value] of Object.entries(cssVariables)) {
        el.style.setProperty(cssVar, value);
      }
    });
  } else {
    // Fallback if requestAnimationFrame is not available
    for (const [cssVar, value] of Object.entries(cssVariables)) {
      el.style.setProperty(cssVar, value);
    }
  }
}

/**
 * Removes applied inline theme colors from the target element.
 * Useful for cleaning up preview modals.
 *
 * @param colors The theme colors configuration used to identify variables to remove
 * @param targetElement The element to clear styles from
 */
export function clearThemeColors(colors: ThemeColors, targetElement?: HTMLElement): void {
  const el = targetElement || (typeof document !== 'undefined' ? document.documentElement : null);
  if (!el) return;

  const cssVariables = generateCssVariables(colors);

  if (!targetElement && typeof window !== 'undefined') {
    localStorage.removeItem('isp_fintrack_theme_css');
  }

  if (typeof window !== 'undefined' && window.requestAnimationFrame) {
    window.requestAnimationFrame(() => {
      for (const cssVar of Object.keys(cssVariables)) {
        el.style.removeProperty(cssVar);
      }
    });
  } else {
    for (const cssVar of Object.keys(cssVariables)) {
      el.style.removeProperty(cssVar);
    }
  }
}
