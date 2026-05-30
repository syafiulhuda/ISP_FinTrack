import { describe, it, expect } from 'vitest';
import { getRelativeLuminance, getContrastRatio, validateThemeContrast } from './wcag-validator';
import { ThemeColors } from '@/types/theme';

describe('WCAG Validator', () => {
  describe('getRelativeLuminance', () => {
    it('calculates pure white correctly', () => {
      expect(getRelativeLuminance('#ffffff')).toBeCloseTo(1, 2);
    });

    it('calculates pure black correctly', () => {
      expect(getRelativeLuminance('#000000')).toBeCloseTo(0, 2);
    });
  });

  describe('getContrastRatio', () => {
    it('calculates white on black correctly', () => {
      expect(getContrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
    });

    it('calculates white on white correctly', () => {
      expect(getContrastRatio('#ffffff', '#ffffff')).toBe(1);
    });

    it('calculates typical dark mode text correctly', () => {
      // #f5f5f5 on #0a0a0a
      const ratio = getContrastRatio('#f5f5f5', '#0a0a0a');
      expect(ratio).toBeGreaterThan(14);
    });
  });

  describe('validateThemeContrast', () => {
    it('passes compliant theme colors without errors', () => {
      const compliantColors: ThemeColors = {
        background: '#ffffff',
        foreground: '#000000',
        card: '#ffffff',
        cardForeground: '#000000',
        popover: '#ffffff',
        popoverForeground: '#000000',
        primary: '#004ac6',
        primaryForeground: '#ffffff',
        secondary: '#495c95',
        secondaryForeground: '#ffffff',
        muted: '#eceef0',
        mutedForeground: '#434655',
        accent: '#acbfff',
        accentForeground: '#000000', // High contrast on light blue
        destructive: '#ba1a1a',
        destructiveForeground: '#ffffff',
        border: '#767680', // Darker gray for 3:1 contrast
        input: '#434655', // Good contrast with white bg
        ring: '#0053db',
        chart1: '#004ac6',
        chart2: '#495c95',
        chart3: '#943700',
        chart4: '#006b5b',
        chart5: '#6d5e00',
      };

      const issues = validateThemeContrast(compliantColors);
      const errors = issues.filter(i => i.severity === 'error');
      
      expect(errors.length).toBe(0);
    });

    it('identifies contrast errors for non-compliant colors', () => {
      const nonCompliantColors = {
        background: '#ffffff',
        foreground: '#e0e0e0', // Very light grey on white = terrible contrast
        card: '#ffffff',
        cardForeground: '#000000',
        popover: '#ffffff',
        popoverForeground: '#000000',
        primary: '#004ac6',
        primaryForeground: '#000000', // Black on dark blue = terrible contrast
        secondary: '#495c95',
        secondaryForeground: '#ffffff',
        muted: '#eceef0',
        mutedForeground: '#434655',
        accent: '#acbfff',
        accentForeground: '#394c84',
        destructive: '#ba1a1a',
        destructiveForeground: '#ffffff',
        border: '#c3c6d7',
        input: '#e0e3e5', // Border too light
        ring: '#0053db',
        chart1: '#004ac6',
        chart2: '#495c95',
        chart3: '#943700',
        chart4: '#006b5b',
        chart5: '#6d5e00',
      } as ThemeColors;

      const issues = validateThemeContrast(nonCompliantColors);
      const errors = issues.filter(i => i.severity === 'error');
      
      // We expect at least one error (foreground on background)
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(i => i.property === 'foreground')).toBe(true);
    });
  });
});
