/**
 * Theme Parser and Serializer Module
 * 
 * This module provides functions for parsing theme configurations from JSON format
 * into ThemePalette objects, serializing ThemePalette objects back to JSON, and
 * validating JSON schema conformance.
 * 
 * Key features:
 * - Type-safe parsing with detailed error reporting
 * - Round-trip preservation guarantee (parse → serialize → parse produces equivalent object)
 * - Pretty-printing for human-readable output
 * - JSON schema validation
 * 
 * @module lib/themes/parser
 */

import type { ThemePalette, ThemeColors, ThemeMetadata, ParseError, Result } from '@/types/theme';

/**
 * Required color properties that must be present in every ThemeColors object.
 * These map to CSS custom properties used throughout the application.
 */
const REQUIRED_COLOR_PROPERTIES: (keyof ThemeColors)[] = [
  'background',
  'foreground',
  'card',
  'cardForeground',
  'popover',
  'popoverForeground',
  'primary',
  'primaryForeground',
  'secondary',
  'secondaryForeground',
  'muted',
  'mutedForeground',
  'accent',
  'accentForeground',
  'destructive',
  'destructiveForeground',
  'border',
  'input',
  'ring',
  'chart1',
  'chart2',
  'chart3',
  'chart4',
  'chart5',
];

/**
 * Optional color properties that may be present in ThemeColors objects.
 * These are typically used for sidebar-specific styling.
 */
const OPTIONAL_COLOR_PROPERTIES: (keyof ThemeColors)[] = [
  'sidebar',
  'sidebarForeground',
  'sidebarPrimary',
  'sidebarPrimaryForeground',
  'sidebarAccent',
  'sidebarAccentForeground',
  'sidebarBorder',
  'sidebarRing',
];

/**
 * Validates that a string is a valid CSS color format (hex, rgb, or hsl).
 * 
 * Supported formats:
 * - Hex: #RGB, #RRGGBB, #RRGGBBAA
 * - RGB: rgb(r, g, b), rgba(r, g, b, a)
 * - HSL: hsl(h, s%, l%), hsla(h, s%, l%, a)
 * 
 * @param color - The color string to validate
 * @returns True if the color is in a valid CSS format, false otherwise
 */
function isValidCSSColor(color: string): boolean {
  if (typeof color !== 'string') {
    return false;
  }

  // Hex color: #RGB or #RRGGBB or #RRGGBBAA
  const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
  if (hexPattern.test(color)) {
    return true;
  }

  // RGB/RGBA color: rgb(r, g, b) or rgba(r, g, b, a)
  const rgbPattern = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/;
  if (rgbPattern.test(color)) {
    return true;
  }

  // HSL/HSLA color: hsl(h, s%, l%) or hsla(h, s%, l%, a)
  const hslPattern = /^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+\s*)?\)$/;
  if (hslPattern.test(color)) {
    return true;
  }

  return false;
}

/**
 * Validates a ThemeColors object for completeness and color format validity.
 * 
 * @param colors - The ThemeColors object to validate
 * @param mode - The mode being validated ('light' or 'dark'), used for error messages
 * @returns Object containing arrays of missing and invalid properties
 */
function validateThemeColors(
  colors: unknown,
  mode: 'light' | 'dark'
): { missingProperties: string[]; invalidProperties: Array<{ property: string; reason: string }> } {
  const missingProperties: string[] = [];
  const invalidProperties: Array<{ property: string; reason: string }> = [];

  if (!colors || typeof colors !== 'object') {
    return {
      missingProperties: REQUIRED_COLOR_PROPERTIES.map(prop => `colors.${mode}.${String(prop)}`),
      invalidProperties: [],
    };
  }

  const colorObj = colors as Record<string, unknown>;

  // Check required properties
  for (const prop of REQUIRED_COLOR_PROPERTIES) {
    const propName = String(prop);
    if (!(propName in colorObj)) {
      missingProperties.push(`colors.${mode}.${propName}`);
    } else if (!isValidCSSColor(colorObj[propName] as string)) {
      invalidProperties.push({
        property: `colors.${mode}.${propName}`,
        reason: `Invalid CSS color format: "${colorObj[propName]}"`,
      });
    }
  }

  // Check optional properties if present
  for (const prop of OPTIONAL_COLOR_PROPERTIES) {
    const propName = String(prop);
    if (propName in colorObj && colorObj[propName] !== undefined) {
      if (!isValidCSSColor(colorObj[propName] as string)) {
        invalidProperties.push({
          property: `colors.${mode}.${propName}`,
          reason: `Invalid CSS color format: "${colorObj[propName]}"`,
        });
      }
    }
  }

  return { missingProperties, invalidProperties };
}

/**
 * Parses a JSON string into a ThemePalette object with comprehensive validation.
 * 
 * This function performs the following validations:
 * - JSON syntax validation
 * - Required top-level properties (id, name, description, etc.)
 * - Supported modes array validation
 * - Color definitions for each supported mode
 * - CSS color format validation for all color properties
 * 
 * @param json - The JSON string to parse
 * @returns Result containing either the parsed ThemePalette or a ParseError
 * 
 * @example
 * ```typescript
 * const result = parse(jsonString);
 * if (result.ok) {
 *   console.log('Parsed theme:', result.value.name);
 * } else {
 *   console.error('Parse error:', result.error.message);
 *   console.error('Missing properties:', result.error.missingProperties);
 * }
 * ```
 */
export function parse(json: string): Result<ThemePalette, ParseError> {
  // Parse JSON
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (error) {
    return {
      ok: false,
      error: {
        message: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
        missingProperties: [],
        invalidProperties: [],
      },
    };
  }

  // Validate top-level structure
  if (!data || typeof data !== 'object') {
    return {
      ok: false,
      error: {
        message: 'Theme configuration must be a JSON object',
        missingProperties: [],
        invalidProperties: [],
      },
    };
  }

  const obj = data as Record<string, unknown>;
  const missingProperties: string[] = [];
  const invalidProperties: Array<{ property: string; reason: string }> = [];

  // Validate required top-level properties
  const requiredProps = ['id', 'name', 'description', 'aesthetic', 'source', 'supportedModes', 'colors', 'metadata'];
  for (const prop of requiredProps) {
    if (!(prop in obj)) {
      missingProperties.push(prop);
    }
  }

  // Validate id
  if ('id' in obj && typeof obj.id !== 'string') {
    invalidProperties.push({ property: 'id', reason: 'Must be a string' });
  }

  // Validate name
  if ('name' in obj && typeof obj.name !== 'string') {
    invalidProperties.push({ property: 'name', reason: 'Must be a string' });
  }

  // Validate description
  if ('description' in obj && typeof obj.description !== 'string') {
    invalidProperties.push({ property: 'description', reason: 'Must be a string' });
  }

  // Validate aesthetic
  if ('aesthetic' in obj && typeof obj.aesthetic !== 'string') {
    invalidProperties.push({ property: 'aesthetic', reason: 'Must be a string' });
  }

  // Validate source
  if ('source' in obj && typeof obj.source !== 'string') {
    invalidProperties.push({ property: 'source', reason: 'Must be a string' });
  }

  // Validate supportedModes
  if ('supportedModes' in obj) {
    if (!Array.isArray(obj.supportedModes)) {
      invalidProperties.push({ property: 'supportedModes', reason: 'Must be an array' });
    } else if (obj.supportedModes.length === 0) {
      invalidProperties.push({ property: 'supportedModes', reason: 'Must contain at least one mode' });
    } else {
      for (const mode of obj.supportedModes) {
        if (mode !== 'light' && mode !== 'dark') {
          invalidProperties.push({
            property: 'supportedModes',
            reason: `Invalid mode "${mode}". Must be "light" or "dark"`,
          });
        }
      }
    }
  }

  // Validate colors object
  if ('colors' in obj) {
    if (!obj.colors || typeof obj.colors !== 'object') {
      invalidProperties.push({ property: 'colors', reason: 'Must be an object' });
    } else {
      const colors = obj.colors as Record<string, unknown>;
      const supportedModes = (obj.supportedModes as string[]) || [];

      // Check that each supported mode has color definitions
      for (const mode of supportedModes) {
        if (mode === 'light' || mode === 'dark') {
          if (!(mode in colors)) {
            missingProperties.push(`colors.${mode}`);
          } else {
            // Validate color properties for this mode
            const validation = validateThemeColors(colors[mode], mode);
            missingProperties.push(...validation.missingProperties);
            invalidProperties.push(...validation.invalidProperties);
          }
        }
      }
    }
  }

  // Validate metadata
  if ('metadata' in obj) {
    if (!obj.metadata || typeof obj.metadata !== 'object') {
      invalidProperties.push({ property: 'metadata', reason: 'Must be an object' });
    } else {
      const metadata = obj.metadata as Record<string, unknown>;

      // Check required metadata properties
      if (!('version' in metadata)) {
        missingProperties.push('metadata.version');
      } else if (typeof metadata.version !== 'string') {
        invalidProperties.push({ property: 'metadata.version', reason: 'Must be a string' });
      }

      if (!('tags' in metadata)) {
        missingProperties.push('metadata.tags');
      } else if (!Array.isArray(metadata.tags)) {
        invalidProperties.push({ property: 'metadata.tags', reason: 'Must be an array' });
      }

      if (!('usageGuidelines' in metadata)) {
        missingProperties.push('metadata.usageGuidelines');
      } else if (typeof metadata.usageGuidelines !== 'string') {
        invalidProperties.push({ property: 'metadata.usageGuidelines', reason: 'Must be a string' });
      }

      // Check optional author property
      if ('author' in metadata && metadata.author !== undefined && typeof metadata.author !== 'string') {
        invalidProperties.push({ property: 'metadata.author', reason: 'Must be a string' });
      }
    }
  }

  // If there are any errors, return them
  if (missingProperties.length > 0 || invalidProperties.length > 0) {
    return {
      ok: false,
      error: {
        message: 'Theme configuration validation failed',
        missingProperties,
        invalidProperties,
      },
    };
  }

  // All validations passed, construct the ThemePalette object
  return {
    ok: true,
    value: obj as unknown as ThemePalette,
  };
}

/**
 * Serializes a ThemePalette object to a compact JSON string.
 * 
 * This function produces a minified JSON representation suitable for storage
 * or transmission. For human-readable output, use prettyPrint() instead.
 * 
 * @param palette - The ThemePalette object to serialize
 * @returns JSON string representation of the theme palette
 * 
 * @example
 * ```typescript
 * const json = serialize(themePalette);
 * // Store in database or localStorage
 * localStorage.setItem('theme', json);
 * ```
 */
export function serialize(palette: ThemePalette): string {
  return JSON.stringify(palette);
}

/**
 * Serializes a ThemePalette object to a pretty-printed JSON string.
 * 
 * This function produces a human-readable JSON representation with proper
 * indentation and structure, suitable for configuration files, documentation,
 * or debugging.
 * 
 * @param palette - The ThemePalette object to serialize
 * @returns Pretty-printed JSON string with 2-space indentation
 * 
 * @example
 * ```typescript
 * const prettyJson = prettyPrint(themePalette);
 * console.log(prettyJson);
 * // {
 * //   "id": "paper-white",
 * //   "name": "Paper White",
 * //   ...
 * // }
 * ```
 */
export function prettyPrint(palette: ThemePalette): string {
  return JSON.stringify(palette, null, 2);
}

/**
 * Schema validation result containing validation status and any errors found.
 */
export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates that a JSON string conforms to the expected ThemePalette schema.
 * 
 * This function checks the structural validity of a theme configuration JSON
 * without performing deep validation of color formats or other constraints.
 * It's useful for quick schema checks before full parsing.
 * 
 * @param json - The JSON string to validate
 * @returns SchemaValidationResult indicating whether the schema is valid
 * 
 * @example
 * ```typescript
 * const validation = validateSchema(jsonString);
 * if (validation.valid) {
 *   // Proceed with full parsing
 *   const result = parse(jsonString);
 * } else {
 *   console.error('Schema errors:', validation.errors);
 * }
 * ```
 */
export function validateSchema(json: string): SchemaValidationResult {
  const result = parse(json);

  if (result.ok) {
    return {
      valid: true,
      errors: [],
    };
  }

  // Collect all error messages
  const errors: string[] = [result.error.message];

  if (result.error.missingProperties.length > 0) {
    errors.push(`Missing properties: ${result.error.missingProperties.join(', ')}`);
  }

  for (const invalid of result.error.invalidProperties) {
    errors.push(`${invalid.property}: ${invalid.reason}`);
  }

  return {
    valid: false,
    errors,
  };
}
