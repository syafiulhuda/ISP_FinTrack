/**
 * Property-Based Tests for Theme Palette Completeness
 * 
 * Feature: advanced-theming-system
 * Property 2: Theme Palette Completeness
 * Validates: Requirements 1.2, 1.3
 * 
 * This test suite verifies that all ThemePalette objects have complete color
 * definitions for their declared supported modes.
 * 
 * @module themes/palettes.test
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { ThemePalette, ThemeColors } from '@/types/theme';
import { validateThemePalette, allThemePalettes } from './palettes';

/**
 * Custom generator for valid CSS color values
 * Generates hex, rgb, and hsl color formats
 */
function cssColorArbitrary(): fc.Arbitrary<string> {
  return fc.oneof(
    // Hex colors (#RRGGBB) - generate 6 hex digits
    fc.tuple(
      fc.integer({ min: 0, max: 15 }),
      fc.integer({ min: 0, max: 15 }),
      fc.integer({ min: 0, max: 15 }),
      fc.integer({ min: 0, max: 15 }),
      fc.integer({ min: 0, max: 15 }),
      fc.integer({ min: 0, max: 15 })
    ).map(digits => `#${digits.map(d => d.toString(16)).join('')}`),
    // RGB colors
    fc.tuple(
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 })
    ).map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`),
    // HSL colors
    fc.tuple(
      fc.integer({ min: 0, max: 360 }),
      fc.integer({ min: 0, max: 100 }),
      fc.integer({ min: 0, max: 100 })
    ).map(([h, s, l]) => `hsl(${h}, ${s}%, ${l}%)`)
  );
}

/**
 * Custom generator for ThemeColors objects
 * Generates complete color definitions with all required properties
 */
function themeColorsArbitrary(): fc.Arbitrary<ThemeColors> {
  return fc.record({
    background: cssColorArbitrary(),
    foreground: cssColorArbitrary(),
    card: cssColorArbitrary(),
    cardForeground: cssColorArbitrary(),
    popover: cssColorArbitrary(),
    popoverForeground: cssColorArbitrary(),
    primary: cssColorArbitrary(),
    primaryForeground: cssColorArbitrary(),
    secondary: cssColorArbitrary(),
    secondaryForeground: cssColorArbitrary(),
    muted: cssColorArbitrary(),
    mutedForeground: cssColorArbitrary(),
    accent: cssColorArbitrary(),
    accentForeground: cssColorArbitrary(),
    destructive: cssColorArbitrary(),
    destructiveForeground: cssColorArbitrary(),
    border: cssColorArbitrary(),
    input: cssColorArbitrary(),
    ring: cssColorArbitrary(),
    chart1: cssColorArbitrary(),
    chart2: cssColorArbitrary(),
    chart3: cssColorArbitrary(),
    chart4: cssColorArbitrary(),
    chart5: cssColorArbitrary(),
    // Optional sidebar properties
    sidebar: fc.option(cssColorArbitrary(), { nil: undefined }),
    sidebarForeground: fc.option(cssColorArbitrary(), { nil: undefined }),
    sidebarPrimary: fc.option(cssColorArbitrary(), { nil: undefined }),
    sidebarPrimaryForeground: fc.option(cssColorArbitrary(), { nil: undefined }),
    sidebarAccent: fc.option(cssColorArbitrary(), { nil: undefined }),
    sidebarAccentForeground: fc.option(cssColorArbitrary(), { nil: undefined }),
    sidebarBorder: fc.option(cssColorArbitrary(), { nil: undefined }),
    sidebarRing: fc.option(cssColorArbitrary(), { nil: undefined }),
  });
}

/**
 * Custom generator for ThemePalette objects
 * Generates palettes with varying mode support (light only, dark only, or both)
 */
function themePaletteArbitrary(): fc.Arbitrary<ThemePalette> {
  return fc.oneof(
    // Light mode only
    fc.record({
      id: fc.string({ minLength: 5, maxLength: 20 }).filter(s => /^[a-z-]+$/.test(s)),
      name: fc.string({ minLength: 3, maxLength: 30 }),
      description: fc.string({ minLength: 10, maxLength: 100 }),
      aesthetic: fc.string({ minLength: 5, maxLength: 50 }),
      source: fc.webUrl(),
      supportedModes: fc.constant(['light'] as ('light' | 'dark')[]),
      colors: fc.record({
        light: themeColorsArbitrary(),
      }),
      metadata: fc.record({
        author: fc.option(fc.string(), { nil: undefined }),
        version: fc.constant('1.0.0'),
        tags: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
        usageGuidelines: fc.string(),
      }),
    }),
    // Dark mode only
    fc.record({
      id: fc.string({ minLength: 5, maxLength: 20 }).filter(s => /^[a-z-]+$/.test(s)),
      name: fc.string({ minLength: 3, maxLength: 30 }),
      description: fc.string({ minLength: 10, maxLength: 100 }),
      aesthetic: fc.string({ minLength: 5, maxLength: 50 }),
      source: fc.webUrl(),
      supportedModes: fc.constant(['dark'] as ('light' | 'dark')[]),
      colors: fc.record({
        dark: themeColorsArbitrary(),
      }),
      metadata: fc.record({
        author: fc.option(fc.string(), { nil: undefined }),
        version: fc.constant('1.0.0'),
        tags: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
        usageGuidelines: fc.string(),
      }),
    }),
    // Both light and dark modes
    fc.record({
      id: fc.string({ minLength: 5, maxLength: 20 }).filter(s => /^[a-z-]+$/.test(s)),
      name: fc.string({ minLength: 3, maxLength: 30 }),
      description: fc.string({ minLength: 10, maxLength: 100 }),
      aesthetic: fc.string({ minLength: 5, maxLength: 50 }),
      source: fc.webUrl(),
      supportedModes: fc.constant(['light', 'dark'] as ('light' | 'dark')[]),
      colors: fc.record({
        light: themeColorsArbitrary(),
        dark: themeColorsArbitrary(),
      }),
      metadata: fc.record({
        author: fc.option(fc.string(), { nil: undefined }),
        version: fc.constant('1.0.0'),
        tags: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
        usageGuidelines: fc.string(),
      }),
    })
  );
}

describe('Theme Palette Completeness - Property 2', () => {
  /**
   * Property 2: Theme Palette Completeness
   * 
   * For any ThemePalette object that passes validation, all required color
   * properties SHALL be present for each supported mode.
   * 
   * Validates: Requirements 1.2, 1.3
   */
  it('should have all required color properties for declared modes', () => {
    // Feature: advanced-theming-system, Property 2: Theme Palette Completeness
    
    fc.assert(
      fc.property(
        themePaletteArbitrary(),
        (palette) => {
          // Validate the palette
          const validation = validateThemePalette(palette);
          
          // The palette should be valid (all required properties present)
          expect(validation.valid).toBe(true);
          expect(validation.missingProperties).toHaveLength(0);
          
          // Verify that colors exist for each supported mode
          for (const mode of palette.supportedModes) {
            expect(palette.colors[mode]).toBeDefined();
            
            const colors = palette.colors[mode]!;
            
            // Required color properties
            const requiredProps: (keyof ThemeColors)[] = [
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
            
            // Verify each required property exists and is a non-empty string
            for (const prop of requiredProps) {
              expect(colors[prop]).toBeDefined();
              expect(typeof colors[prop]).toBe('string');
              expect(colors[prop]).not.toBe('');
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that all predefined theme palettes are complete
   * 
   * This is a specific example-based test that verifies our actual
   * predefined themes meet the completeness property.
   */
  it('should validate all predefined theme palettes', () => {
    for (const palette of allThemePalettes) {
      const validation = validateThemePalette(palette);
      
      expect(validation.valid).toBe(true);
      expect(validation.missingProperties).toHaveLength(0);
      
      // Verify each supported mode has colors
      for (const mode of palette.supportedModes) {
        expect(palette.colors[mode]).toBeDefined();
      }
    }
  });

  /**
   * Test that palettes with missing mode colors are detected as invalid
   * 
   * This tests the negative case - palettes that claim to support a mode
   * but don't provide colors for it should fail validation.
   */
  it('should detect missing mode colors', () => {
    const incompletePalette: ThemePalette = {
      id: 'incomplete-test',
      name: 'Incomplete Test',
      description: 'Test palette with missing dark mode colors',
      aesthetic: 'Test',
      source: 'test',
      supportedModes: ['light', 'dark'], // Claims to support both modes
      colors: {
        light: {
          background: '#ffffff',
          foreground: '#000000',
          card: '#f5f5f5',
          cardForeground: '#000000',
          popover: '#ffffff',
          popoverForeground: '#000000',
          primary: '#0066cc',
          primaryForeground: '#ffffff',
          secondary: '#e9ecef',
          secondaryForeground: '#000000',
          muted: '#f1f3f5',
          mutedForeground: '#6c757d',
          accent: '#0099ff',
          accentForeground: '#ffffff',
          destructive: '#dc3545',
          destructiveForeground: '#ffffff',
          border: '#dee2e6',
          input: '#dee2e6',
          ring: '#0066cc',
          chart1: '#0066cc',
          chart2: '#00b4d8',
          chart3: '#90e0ef',
          chart4: '#48cae4',
          chart5: '#0077b6',
        },
        // Missing dark mode colors!
      },
      metadata: {
        version: '1.0.0',
        tags: ['test'],
        usageGuidelines: 'Test only',
      },
    };

    const validation = validateThemePalette(incompletePalette);
    
    expect(validation.valid).toBe(false);
    expect(validation.missingProperties).toContain('colors.dark');
  });

  /**
   * Test that palettes with missing required color properties are detected
   * 
   * This tests that individual color properties are validated.
   */
  it('should detect missing required color properties', () => {
    const incompletePalette: ThemePalette = {
      id: 'incomplete-colors-test',
      name: 'Incomplete Colors Test',
      description: 'Test palette with missing color properties',
      aesthetic: 'Test',
      source: 'test',
      supportedModes: ['light'],
      colors: {
        light: {
          background: '#ffffff',
          foreground: '#000000',
          // Missing many required properties!
        } as ThemeColors,
      },
      metadata: {
        version: '1.0.0',
        tags: ['test'],
        usageGuidelines: 'Test only',
      },
    };

    const validation = validateThemePalette(incompletePalette);
    
    expect(validation.valid).toBe(false);
    expect(validation.missingProperties.length).toBeGreaterThan(0);
    
    // Should detect missing properties like card, primary, etc.
    expect(validation.missingProperties.some(prop => prop.includes('card'))).toBe(true);
    expect(validation.missingProperties.some(prop => prop.includes('primary'))).toBe(true);
  });
});
