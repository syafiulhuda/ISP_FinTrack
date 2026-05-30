import { getThemeById } from './palettes';
import { applyThemeColors, clearThemeColors } from './css-variable-manager';
import { ThemePalette } from '@/types/theme';

/**
 * Resets the active styling to the default Tailwind configuration.
 * It clears all inline custom CSS variables injected by the theming system.
 *
 * @param mode The desired mode ('light' | 'dark') to switch to
 * @param targetElement The DOM element to reset (defaults to document.documentElement)
 */
export function resetToTailwindDefault(mode: 'light' | 'dark', targetElement?: HTMLElement): void {
  const el = targetElement || (typeof document !== 'undefined' ? document.documentElement : null);
  if (!el) return;

  // We pass a dummy full ThemeColors object structure so clearThemeColors knows which keys to remove
  // We can just get the 'paper-white' theme keys as they have all standard required props.
  const dummyTheme = getThemeById('paper-white');
  if (dummyTheme && dummyTheme.colors.light) {
    clearThemeColors(dummyTheme.colors.light, el);
  }

  // Handle the global dark mode class if we are applying to the root document
  if (!targetElement && typeof document !== 'undefined') {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
      // For view transitions compatibility
      document.documentElement.dataset.themeTransition = 'to-dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.dataset.themeTransition = 'to-light';
    }
  }
}

/**
 * Validates and applies a requested theme to the specified element.
 * Provides fallback recovery mechanisms if the theme is invalid or unsupported.
 *
 * @param themeId The ID of the theme to apply (e.g., 'tesla', 'clinical')
 * @param requestedMode The requested mode ('light' | 'dark')
 * @param targetElement The DOM element to apply the theme to (defaults to document.documentElement)
 * @returns An object indicating success, applied mode, and any warnings
 */
export function applyTheme(
  themeId: string,
  requestedMode: 'light' | 'dark',
  targetElement?: HTMLElement
): { success: boolean; appliedMode: 'light' | 'dark'; warning?: string } {
  
  // 1. Fetch the theme palette
  const palette = getThemeById(themeId);
  
  if (!palette) {
    // Error Recovery: Theme not found. Fallback to Tailwind default.
    resetToTailwindDefault(requestedMode, targetElement);
    return {
      success: false,
      appliedMode: requestedMode,
      warning: `Theme '${themeId}' not found. Falling back to default styling.`,
    };
  }

  // 2. Validate supported modes
  let activeMode = requestedMode;
  let warning: string | undefined = undefined;

  if (!palette.supportedModes.includes(requestedMode)) {
    // Mode not supported by this theme. Fallback to the theme's first available mode.
    activeMode = palette.supportedModes[0] as 'light' | 'dark';
    warning = `Mode '${requestedMode}' is not supported by theme '${palette.name}'. Auto-switching to '${activeMode}'.`;
  }

  // 3. Extract the colors for the active mode
  const colors = palette.colors[activeMode];
  
  if (!colors) {
    // Critical failure: Theme is corrupted (has the mode in supportedModes but missing color object).
    resetToTailwindDefault(requestedMode, targetElement);
    return {
      success: false,
      appliedMode: requestedMode,
      warning: `Theme '${palette.name}' is corrupted. Missing color definitions for mode '${activeMode}'.`,
    };
  }

  // 4. Apply the colors
  applyThemeColors(colors, targetElement);

  // 5. Update the global DOM dark class if applying globally
  if (!targetElement && typeof document !== 'undefined') {
    if (activeMode === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.dataset.themeTransition = 'to-dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.dataset.themeTransition = 'to-light';
    }
  }

  return {
    success: true,
    appliedMode: activeMode,
    warning,
  };
}
