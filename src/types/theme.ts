/**
 * Theme Type Definitions for Advanced Theming System
 * 
 * This module defines the core type interfaces for the ISP-FinTrack theming system,
 * supporting five predefined color palettes (Paper White, Clinical, Tesla, The Verge,
 * and Denim Workwear) with light and/or dark mode variants.
 * 
 * @module types/theme
 */

/**
 * Complete set of color definitions for all UI elements in a single mode (light or dark).
 * 
 * All color values must be valid CSS color formats (hex, rgb, or hsl).
 * These colors map directly to CSS custom properties in the :root selector.
 * 
 * @interface ThemeColors
 * @property {string} background - Main background color for the application
 * @property {string} foreground - Primary text color on background
 * @property {string} card - Background color for card components
 * @property {string} cardForeground - Text color on card backgrounds
 * @property {string} popover - Background color for popover/dropdown components
 * @property {string} popoverForeground - Text color on popover backgrounds
 * @property {string} primary - Primary brand color for main actions
 * @property {string} primaryForeground - Text color on primary backgrounds
 * @property {string} secondary - Secondary color for less prominent actions
 * @property {string} secondaryForeground - Text color on secondary backgrounds
 * @property {string} muted - Muted/subdued background color
 * @property {string} mutedForeground - Text color on muted backgrounds
 * @property {string} accent - Accent color for highlights and emphasis
 * @property {string} accentForeground - Text color on accent backgrounds
 * @property {string} destructive - Color for destructive/dangerous actions
 * @property {string} destructiveForeground - Text color on destructive backgrounds
 * @property {string} border - Border color for UI elements
 * @property {string} input - Border color for input fields
 * @property {string} ring - Focus ring color for keyboard navigation
 * @property {string} chart1 - First chart/data visualization color
 * @property {string} chart2 - Second chart/data visualization color
 * @property {string} chart3 - Third chart/data visualization color
 * @property {string} chart4 - Fourth chart/data visualization color
 * @property {string} chart5 - Fifth chart/data visualization color
 * @property {string} [sidebar] - Optional sidebar background color
 * @property {string} [sidebarForeground] - Optional text color on sidebar
 * @property {string} [sidebarPrimary] - Optional primary color for sidebar elements
 * @property {string} [sidebarPrimaryForeground] - Optional text color on sidebar primary
 * @property {string} [sidebarAccent] - Optional accent color for sidebar
 * @property {string} [sidebarAccentForeground] - Optional text color on sidebar accent
 * @property {string} [sidebarBorder] - Optional border color for sidebar
 * @property {string} [sidebarRing] - Optional focus ring color for sidebar
 */
export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  sidebar?: string;
  sidebarForeground?: string;
  sidebarPrimary?: string;
  sidebarPrimaryForeground?: string;
  sidebarAccent?: string;
  sidebarAccentForeground?: string;
  sidebarBorder?: string;
  sidebarRing?: string;
}

/**
 * Metadata describing a theme's purpose, attribution, and usage guidelines.
 * 
 * @interface ThemeMetadata
 * @property {string} [author] - Optional author or creator of the theme
 * @property {string} version - Semantic version of the theme (e.g., "1.0.0")
 * @property {string[]} tags - Descriptive tags for categorization (e.g., ["professional", "clean"])
 * @property {string} usageGuidelines - Human-readable guidelines for appropriate theme usage
 */
export interface ThemeMetadata {
  author?: string;
  version: string;
  tags: string[];
  usageGuidelines: string;
}

/**
 * Complete theme palette definition including colors for light and/or dark modes.
 * 
 * A theme palette represents a complete visual identity with all necessary color
 * definitions. Themes may support light mode only, dark mode only, or both modes.
 * 
 * @interface ThemePalette
 * @property {string} id - Unique identifier for the theme (e.g., "paper-white", "clinical")
 * @property {string} name - Human-readable display name
 * @property {string} description - Brief description of the theme's aesthetic
 * @property {string} aesthetic - Aesthetic category or style (e.g., "Editorial, Warm, Classic")
 * @property {string} source - Attribution to the theme source (e.g., design.md directory URL)
 * @property {Array<'light' | 'dark'>} supportedModes - Modes supported by this theme
 * @property {Object} colors - Color definitions for each supported mode
 * @property {ThemeColors} [colors.light] - Light mode colors (required if 'light' in supportedModes)
 * @property {ThemeColors} [colors.dark] - Dark mode colors (required if 'dark' in supportedModes)
 * @property {ThemeMetadata} metadata - Additional metadata about the theme
 */
export interface ThemePalette {
  id: string;
  name: string;
  description: string;
  aesthetic: string;
  source: string;
  supportedModes: ('light' | 'dark')[];
  colors: {
    light?: ThemeColors;
    dark?: ThemeColors;
  };
  metadata: ThemeMetadata;
}

/**
 * Describes a single accessibility issue found during WCAG validation.
 * 
 * @interface AccessibilityIssue
 * @property {'contrast' | 'color-blindness' | 'other'} type - Category of accessibility issue
 * @property {string} severity - Severity level: "error" (WCAG failure) or "warning" (best practice)
 * @property {string} message - Human-readable description of the issue
 * @property {string} [foregroundColor] - Optional foreground color involved in the issue
 * @property {string} [backgroundColor] - Optional background color involved in the issue
 * @property {number} [contrastRatio] - Optional actual contrast ratio (for contrast issues)
 * @property {number} [requiredRatio] - Optional required contrast ratio (for contrast issues)
 * @property {string} [property] - Optional theme property name where issue was found
 */
export interface AccessibilityIssue {
  type: 'contrast' | 'color-blindness' | 'other';
  severity: 'error' | 'warning';
  message: string;
  foregroundColor?: string;
  backgroundColor?: string;
  contrastRatio?: number;
  requiredRatio?: number;
  property?: string;
}

/**
 * Result of theme validation including structural, format, and accessibility checks.
 * 
 * @interface ValidationResult
 * @property {boolean} valid - Whether the theme passed all validation checks
 * @property {string[]} errors - Critical errors that prevent theme application
 * @property {string[]} warnings - Non-critical issues that don't prevent theme application
 * @property {AccessibilityIssue[]} accessibilityIssues - WCAG accessibility violations or warnings
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  accessibilityIssues: AccessibilityIssue[];
}

/**
 * Detailed error information from theme configuration parsing failures.
 * 
 * @interface ParseError
 * @property {string} message - High-level error message describing the parsing failure
 * @property {string[]} missingProperties - List of required properties that were not found
 * @property {Array<{property: string; reason: string}>} invalidProperties - Properties with invalid values
 */
export interface ParseError {
  message: string;
  missingProperties: string[];
  invalidProperties: Array<{
    property: string;
    reason: string;
  }>;
}

/**
 * Result type for operations that may succeed with a value or fail with an error.
 * 
 * This is a discriminated union type that provides type-safe error handling.
 * 
 * @template T - The type of the success value
 * @template E - The type of the error value
 * 
 * @example
 * ```typescript
 * const result: Result<ThemePalette, ParseError> = parseTheme(json);
 * if (result.ok) {
 *   console.log(result.value); // TypeScript knows this is ThemePalette
 * } else {
 *   console.error(result.error); // TypeScript knows this is ParseError
 * }
 * ```
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * User roles that determine theme management permissions.
 * 
 * - System Administrator: Full access to select and apply themes
 * - Admin Kantor: Full access to select and apply themes
 * - Tim Lapangan: Read-only access (can view but not change themes)
 */
export type UserRole = 'System Administrator' | 'Admin Kantor' | 'Tim Lapangan';

/**
 * Theme mode preference for dark mode toggle.
 * 
 * - light: Always use light mode
 * - dark: Always use dark mode
 * - system: Follow system preference (OS-level dark mode setting)
 */
export type ThemeMode = 'light' | 'dark';

/**
 * Dark mode preference setting.
 * 
 * - light: User prefers light mode
 * - dark: User prefers dark mode
 * - system: Follow system/OS preference
 */
export type DarkModePreference = 'light' | 'dark' | 'system';
