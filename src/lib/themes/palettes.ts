/**
 * Theme Palette Data File
 * 
 * Contains all predefined theme palettes for the ISP-FinTrack Advanced Theming System.
 * Each palette includes complete color definitions for supported modes (light/dark),
 * metadata, and usage guidelines.
 * 
 * Source: design.md directory (https://designdotmd.directory/)
 * 
 * @module themes/palettes
 */

/**
 * Color definitions for a single theme mode (light or dark)
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
 * Complete theme palette definition with metadata
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
  metadata: {
    author?: string;
    version: string;
    tags: string[];
    usageGuidelines: string;
  };
}

/**
 * Paper White Theme
 * 
 * A warm, paper-like aesthetic perfect for editorial content and reading-focused applications.
 * Features soft cream backgrounds with warm brown accents that evoke traditional print media.
 * 
 * Supported Modes: Light only
 * Best For: Editorial content, documentation, reading-heavy interfaces
 */
export const paperWhiteTheme: ThemePalette = {
  id: 'paper-white',
  name: 'Paper White',
  description: 'Warm, paper-like aesthetic for editorial content',
  aesthetic: 'Editorial, Warm, Classic',
  source: 'design.md directory (https://designdotmd.directory/)',
  supportedModes: ['light'],
  colors: {
    light: {
      background: '#faf8f5',
      foreground: '#1a1816',
      card: '#ffffff',
      cardForeground: '#1a1816',
      popover: '#ffffff',
      popoverForeground: '#1a1816',
      primary: '#8b4513',
      primaryForeground: '#ffffff',
      secondary: '#e8e3db',
      secondaryForeground: '#1a1816',
      muted: '#f5f1ea',
      mutedForeground: '#6b6560',
      accent: '#d4a574',
      accentForeground: '#1a1816',
      destructive: '#dc2626',
      destructiveForeground: '#ffffff',
      border: '#e8e3db',
      input: '#e8e3db',
      ring: '#8b4513',
      chart1: '#8b4513',
      chart2: '#d4a574',
      chart3: '#a0826d',
      chart4: '#c19a6b',
      chart5: '#6b5d52',
      sidebar: '#f5f1ea',
      sidebarForeground: '#1a1816',
      sidebarPrimary: '#8b4513',
      sidebarPrimaryForeground: '#ffffff',
      sidebarAccent: '#d4a574',
      sidebarAccentForeground: '#1a1816',
      sidebarBorder: '#e8e3db',
      sidebarRing: '#8b4513',
    },
  },
  metadata: {
    author: 'design.md directory',
    version: '1.0.0',
    tags: ['editorial', 'warm', 'classic', 'reading'],
    usageGuidelines: 'Ideal for content-heavy applications, documentation sites, and editorial platforms. The warm tones reduce eye strain during extended reading sessions. Avoid using for data-intensive dashboards where clinical precision is preferred.',
  },
};

/**
 * Clinical Theme
 * 
 * A clean, professional aesthetic designed for data-focused applications and medical interfaces.
 * Features crisp whites and cool grays that convey precision and clarity.
 * 
 * Supported Modes: Light and Dark
 * Best For: Data dashboards, medical applications, professional tools
 */
export const clinicalTheme: ThemePalette = {
  id: 'clinical',
  name: 'Clinical',
  description: 'Clean, professional aesthetic for data-focused applications',
  aesthetic: 'Professional, Clean, Medical',
  source: 'design.md directory (https://designdotmd.directory/)',
  supportedModes: ['light'],
  colors: {
    light: {
      background: '#ffffff',
      foreground: '#0a0a0a',
      card: '#f8f9fa',
      cardForeground: '#0a0a0a',
      popover: '#ffffff',
      popoverForeground: '#0a0a0a',
      primary: '#0066cc',
      primaryForeground: '#ffffff',
      secondary: '#e9ecef',
      secondaryForeground: '#0a0a0a',
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
      sidebar: '#f8f9fa',
      sidebarForeground: '#0a0a0a',
      sidebarPrimary: '#0066cc',
      sidebarPrimaryForeground: '#ffffff',
      sidebarAccent: '#0099ff',
      sidebarAccentForeground: '#ffffff',
      sidebarBorder: '#dee2e6',
      sidebarRing: '#0066cc',
    },
    dark: {
      background: '#0a0a0a',
      foreground: '#f8f9fa',
      card: '#1a1a1a',
      cardForeground: '#f8f9fa',
      popover: '#1a1a1a',
      popoverForeground: '#f8f9fa',
      primary: '#0099ff',
      primaryForeground: '#ffffff',
      secondary: '#2d2d2d',
      secondaryForeground: '#f8f9fa',
      muted: '#1f1f1f',
      mutedForeground: '#adb5bd',
      accent: '#00b4d8',
      accentForeground: '#ffffff',
      destructive: '#ff4d4d',
      destructiveForeground: '#ffffff',
      border: '#2d2d2d',
      input: '#2d2d2d',
      ring: '#0099ff',
      chart1: '#0099ff',
      chart2: '#00b4d8',
      chart3: '#90e0ef',
      chart4: '#48cae4',
      chart5: '#0077b6',
      sidebar: '#1a1a1a',
      sidebarForeground: '#f8f9fa',
      sidebarPrimary: '#0099ff',
      sidebarPrimaryForeground: '#ffffff',
      sidebarAccent: '#00b4d8',
      sidebarAccentForeground: '#ffffff',
      sidebarBorder: '#2d2d2d',
      sidebarRing: '#0099ff',
    },
  },
  metadata: {
    author: 'design.md directory',
    version: '1.0.0',
    tags: ['professional', 'clean', 'medical', 'data'],
    usageGuidelines: 'Perfect for data-intensive applications, medical software, and professional tools requiring high clarity. The neutral color palette ensures data visualization takes center stage. Both light and dark modes maintain excellent readability and WCAG compliance.',
  },
};

/**
 * Tesla Theme
 * 
 * A sleek, futuristic dark theme inspired by automotive design and premium technology products.
 * Features deep blacks with electric blue accents for a sophisticated, high-tech appearance.
 * 
 * Supported Modes: Dark only
 * Best For: Premium applications, automotive interfaces, tech products
 */
export const teslaTheme: ThemePalette = {
  id: 'tesla',
  name: 'Tesla',
  description: 'Sleek, futuristic dark theme inspired by automotive design',
  aesthetic: 'Futuristic, Dark, Premium',
  source: 'design.md directory (https://designdotmd.directory/)',
  supportedModes: ['dark'],
  colors: {
    dark: {
      background: '#000000',
      foreground: '#e8e8e8',
      card: '#0d0d0d',
      cardForeground: '#e8e8e8',
      popover: '#0d0d0d',
      popoverForeground: '#e8e8e8',
      primary: '#3e6ae1',
      primaryForeground: '#ffffff',
      secondary: '#1a1a1a',
      secondaryForeground: '#e8e8e8',
      muted: '#141414',
      mutedForeground: '#a0a0a0',
      accent: '#5e8aff',
      accentForeground: '#ffffff',
      destructive: '#ff3b30',
      destructiveForeground: '#ffffff',
      border: '#1a1a1a',
      input: '#1a1a1a',
      ring: '#3e6ae1',
      chart1: '#3e6ae1',
      chart2: '#5e8aff',
      chart3: '#7ea3ff',
      chart4: '#9ebcff',
      chart5: '#2451c7',
      sidebar: '#0d0d0d',
      sidebarForeground: '#e8e8e8',
      sidebarPrimary: '#3e6ae1',
      sidebarPrimaryForeground: '#ffffff',
      sidebarAccent: '#5e8aff',
      sidebarAccentForeground: '#ffffff',
      sidebarBorder: '#1a1a1a',
      sidebarRing: '#3e6ae1',
    },
  },
  metadata: {
    author: 'design.md directory',
    version: '1.0.0',
    tags: ['futuristic', 'dark', 'premium', 'automotive'],
    usageGuidelines: 'Best suited for premium applications, automotive interfaces, and high-tech products. The pure black background provides excellent contrast on OLED displays and creates a sophisticated atmosphere. Use for applications where a modern, luxurious feel is desired.',
  },
};

/**
 * The Verge Theme
 * 
 * A bold, tech-forward aesthetic with high contrast and vibrant accents.
 * Inspired by modern tech journalism and digital media platforms.
 * 
 * Supported Modes: Light and Dark
 * Best For: Tech platforms, news sites, modern web applications
 */
export const theVergeTheme: ThemePalette = {
  id: 'the-verge',
  name: 'The Verge',
  description: 'Bold, tech-forward aesthetic with high contrast',
  aesthetic: 'Tech, Bold, Modern',
  source: 'design.md directory (https://designdotmd.directory/)',
  supportedModes: ['light'],
  colors: {
    light: {
      background: '#ffffff',
      foreground: '#000000',
      card: '#f5f5f5',
      cardForeground: '#000000',
      popover: '#ffffff',
      popoverForeground: '#000000',
      primary: '#ff6b00',
      primaryForeground: '#ffffff',
      secondary: '#e5e5e5',
      secondaryForeground: '#000000',
      muted: '#f0f0f0',
      mutedForeground: '#737373',
      accent: '#ff8533',
      accentForeground: '#000000',
      destructive: '#ef4444',
      destructiveForeground: '#ffffff',
      border: '#e5e5e5',
      input: '#e5e5e5',
      ring: '#ff6b00',
      chart1: '#ff6b00',
      chart2: '#ff8533',
      chart3: '#ffa366',
      chart4: '#ffb885',
      chart5: '#cc5500',
      sidebar: '#f5f5f5',
      sidebarForeground: '#000000',
      sidebarPrimary: '#ff6b00',
      sidebarPrimaryForeground: '#ffffff',
      sidebarAccent: '#ff8533',
      sidebarAccentForeground: '#000000',
      sidebarBorder: '#e5e5e5',
      sidebarRing: '#ff6b00',
    },
    dark: {
      background: '#0a0a0a',
      foreground: '#fafafa',
      card: '#141414',
      cardForeground: '#fafafa',
      popover: '#141414',
      popoverForeground: '#fafafa',
      primary: '#ff6b00',
      primaryForeground: '#ffffff',
      secondary: '#262626',
      secondaryForeground: '#fafafa',
      muted: '#1a1a1a',
      mutedForeground: '#a3a3a3',
      accent: '#ff8533',
      accentForeground: '#ffffff',
      destructive: '#ff5555',
      destructiveForeground: '#ffffff',
      border: '#262626',
      input: '#262626',
      ring: '#ff6b00',
      chart1: '#ff6b00',
      chart2: '#ff8533',
      chart3: '#ffa366',
      chart4: '#ffb885',
      chart5: '#cc5500',
      sidebar: '#141414',
      sidebarForeground: '#fafafa',
      sidebarPrimary: '#ff6b00',
      sidebarPrimaryForeground: '#ffffff',
      sidebarAccent: '#ff8533',
      sidebarAccentForeground: '#ffffff',
      sidebarBorder: '#262626',
      sidebarRing: '#ff6b00',
    },
  },
  metadata: {
    author: 'design.md directory',
    version: '1.0.0',
    tags: ['tech', 'bold', 'modern', 'journalism'],
    usageGuidelines: 'Ideal for tech-focused platforms, news sites, and modern web applications. The bold orange accent creates strong visual hierarchy and draws attention to key actions. High contrast ensures excellent readability. Use when you want to convey energy and modernity.',
  },
};

/**
 * Denim Workwear Theme
 * 
 * A rugged, utilitarian aesthetic with blue-collar inspiration.
 * Features denim blues and industrial grays for a practical, hardworking feel.
 * 
 * Supported Modes: Light only
 * Best For: Industrial applications, field service tools, utility software
 */
export const denimWorkwearTheme: ThemePalette = {
  id: 'denim-workwear',
  name: 'Denim Workwear',
  description: 'Rugged, utilitarian aesthetic with blue-collar inspiration',
  aesthetic: 'Utilitarian, Rugged, Industrial',
  source: 'design.md directory (https://designdotmd.directory/)',
  supportedModes: ['light'],
  colors: {
    light: {
      background: '#f4f5f7',
      foreground: '#1e293b',
      card: '#ffffff',
      cardForeground: '#1e293b',
      popover: '#ffffff',
      popoverForeground: '#1e293b',
      primary: '#3b5998',
      primaryForeground: '#ffffff',
      secondary: '#e2e8f0',
      secondaryForeground: '#1e293b',
      muted: '#f1f5f9',
      mutedForeground: '#64748b',
      accent: '#5b7bb4',
      accentForeground: '#ffffff',
      destructive: '#dc2626',
      destructiveForeground: '#ffffff',
      border: '#cbd5e1',
      input: '#cbd5e1',
      ring: '#3b5998',
      chart1: '#3b5998',
      chart2: '#5b7bb4',
      chart3: '#7b9bd0',
      chart4: '#9bb5e0',
      chart5: '#2d4373',
      sidebar: '#f1f5f9',
      sidebarForeground: '#1e293b',
      sidebarPrimary: '#3b5998',
      sidebarPrimaryForeground: '#ffffff',
      sidebarAccent: '#5b7bb4',
      sidebarAccentForeground: '#ffffff',
      sidebarBorder: '#cbd5e1',
      sidebarRing: '#3b5998',
    },
  },
  metadata: {
    author: 'design.md directory',
    version: '1.0.0',
    tags: ['utilitarian', 'rugged', 'industrial', 'workwear'],
    usageGuidelines: 'Perfect for industrial applications, field service tools, and utility software. The denim-inspired blues convey reliability and practicality. Use for applications targeting blue-collar workers, field technicians, or industrial environments where a no-nonsense, durable aesthetic is appropriate.',
  },
};

export const defiChromeTheme: ThemePalette = {
  id: 'defi-chrome',
  name: 'DeFi Chrome',
  description: 'Trading-floor neon: emerald gains, bloody losses.',
  aesthetic: 'Trading-floor neon: emerald gains, bloody losses.',
  source: 'design.md directory (https://designdotmd.directory/)',
  supportedModes: ['dark'],
  colors: {
    dark: {
      background: '#0B0E13',
      foreground: '#F0F2F5',
      card: '#141820',
      cardForeground: '#F0F2F5',
      popover: '#141820',
      popoverForeground: '#F0F2F5',
      primary: '#00D395',
      primaryForeground: '#0B0E13',
      secondary: '#7A8696',
      secondaryForeground: '#F0F2F5',
      muted: '#141820',
      mutedForeground: '#7A8696',
      accent: '#7A8696',
      accentForeground: '#F0F2F5',
      destructive: '#ef4444',
      destructiveForeground: '#ffffff',
      border: '#7A8696',
      input: '#141820',
      ring: '#00D395',
      chart1: '#00D395',
      chart2: '#7A8696',
      chart3: '#00D395',
      chart4: '#7A8696',
      chart5: '#00D395',
      sidebar: '#0B0E13',
      sidebarForeground: '#F0F2F5',
      sidebarPrimary: '#00D395',
      sidebarPrimaryForeground: '#0B0E13',
      sidebarAccent: '#141820',
      sidebarAccentForeground: '#F0F2F5',
      sidebarBorder: '#141820',
      sidebarRing: '#00D395',
    },
  },
  metadata: {
    author: 'design.md directory',
    version: '1.0.0',
    tags: ['finance', 'dark', 'bold'],
    usageGuidelines: 'Use Tertiary (#00D395) for exactly one action per screen. Let Neutral carry the composition.',
  },
};

export const binanceTheme: ThemePalette = {
  id: 'binance',
  name: 'Binance',
  description: 'Bold yellow accent on monochrome. Trading-floor urgency.',
  aesthetic: 'Bold yellow accent on monochrome. Trading-floor urgency.',
  source: 'design.md directory (https://designdotmd.directory/)',
  supportedModes: ['dark'],
  colors: {
    dark: {
      background: '#0B0E11',
      foreground: '#EAECEF',
      card: '#181A20',
      cardForeground: '#EAECEF',
      popover: '#181A20',
      popoverForeground: '#EAECEF',
      primary: '#F0B90B',
      primaryForeground: '#0B0E11',
      secondary: '#848E9C',
      secondaryForeground: '#EAECEF',
      muted: '#181A20',
      mutedForeground: '#848E9C',
      accent: '#848E9C',
      accentForeground: '#EAECEF',
      destructive: '#ef4444',
      destructiveForeground: '#ffffff',
      border: '#848E9C',
      input: '#181A20',
      ring: '#F0B90B',
      chart1: '#F0B90B',
      chart2: '#848E9C',
      chart3: '#F0B90B',
      chart4: '#848E9C',
      chart5: '#F0B90B',
      sidebar: '#0B0E11',
      sidebarForeground: '#EAECEF',
      sidebarPrimary: '#F0B90B',
      sidebarPrimaryForeground: '#0B0E11',
      sidebarAccent: '#181A20',
      sidebarAccentForeground: '#EAECEF',
      sidebarBorder: '#181A20',
      sidebarRing: '#F0B90B',
    },
  },
  metadata: {
    author: 'design.md directory',
    version: '1.0.0',
    tags: ['known brand', 'finance', 'dark', 'bold'],
    usageGuidelines: 'Use Tertiary (#F0B90B) for exactly one action per screen. Let Neutral carry the composition.',
  },
};

export const remoteHubTheme: ThemePalette = {
  id: 'remote-hub',
  name: 'Remote Hub',
  description: 'Remote-team dashboard: horizon blue, timezone teal.',
  aesthetic: 'Remote-team dashboard: horizon blue, timezone teal.',
  source: 'design.md directory (https://designdotmd.directory/)',
  supportedModes: ['light'],
  colors: {
    light: {
      background: '#EEF3F6',
      foreground: '#0F2233',
      card: '#FFFFFF',
      cardForeground: '#0F2233',
      popover: '#FFFFFF',
      popoverForeground: '#0F2233',
      primary: '#29AFB4',
      primaryForeground: '#FFFFFF',
      secondary: '#5A6E82',
      secondaryForeground: '#FFFFFF',
      muted: '#EEF3F6',
      mutedForeground: '#5A6E82',
      accent: '#5A6E82',
      accentForeground: '#FFFFFF',
      destructive: '#ef4444',
      destructiveForeground: '#ffffff',
      border: '#5A6E82',
      input: '#FFFFFF',
      ring: '#29AFB4',
      chart1: '#29AFB4',
      chart2: '#5A6E82',
      chart3: '#29AFB4',
      chart4: '#5A6E82',
      chart5: '#29AFB4',
      sidebar: '#EEF3F6',
      sidebarForeground: '#0F2233',
      sidebarPrimary: '#29AFB4',
      sidebarPrimaryForeground: '#FFFFFF',
      sidebarAccent: '#FFFFFF',
      sidebarAccentForeground: '#0F2233',
      sidebarBorder: '#5A6E82',
      sidebarRing: '#29AFB4',
    },
  },
  metadata: {
    author: 'design.md directory',
    version: '1.0.0',
    tags: ['social', 'cool', 'sans'],
    usageGuidelines: 'Use Tertiary (#29AFB4) for exactly one action per screen. Let Neutral carry the composition.',
  },
};

/**
 * All available theme palettes
 * 
 * This array contains all predefined themes that can be selected by users.
 * Each theme has been validated for color completeness and includes full metadata.
 */
export const allThemePalettes: ThemePalette[] = [
  defiChromeTheme,
  denimWorkwearTheme,
  paperWhiteTheme,
  clinicalTheme,
  teslaTheme,
  theVergeTheme,
  binanceTheme,
  remoteHubTheme,
];

/**
 * Get a theme palette by ID
 * 
 * @param themeId - The unique identifier of the theme
 * @returns The theme palette if found, undefined otherwise
 */
export function getThemeById(themeId: string): ThemePalette | undefined {
  return allThemePalettes.find((theme) => theme.id === themeId);
}

/**
 * Get all themes that support a specific mode
 * 
 * @param mode - The mode to filter by ('light' or 'dark')
 * @returns Array of theme palettes that support the specified mode
 */
export function getThemesByMode(mode: 'light' | 'dark'): ThemePalette[] {
  return allThemePalettes.filter((theme) => theme.supportedModes.includes(mode));
}

/**
 * Get the default theme palette
 * 
 * @returns The Paper White theme as the default
 */
export function getDefaultTheme(): ThemePalette {
  return paperWhiteTheme;
}

/**
 * Validate that a theme palette has all required color properties for its supported modes
 * 
 * @param palette - The theme palette to validate
 * @returns Object with validation result and any missing properties
 */
export function validateThemePalette(palette: ThemePalette): {
  valid: boolean;
  missingProperties: string[];
} {
  const missingProperties: string[] = [];
  
  // Required color properties
  const requiredColorProps: (keyof ThemeColors)[] = [
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
  
  // Check each supported mode
  for (const mode of palette.supportedModes) {
    const colors = palette.colors[mode];
    
    if (!colors) {
      missingProperties.push(`colors.${mode}`);
      continue;
    }
    
    // Check each required property
    for (const prop of requiredColorProps) {
      if (!colors[prop]) {
        missingProperties.push(`colors.${mode}.${prop}`);
      }
    }
  }
  
  return {
    valid: missingProperties.length === 0,
    missingProperties,
  };
}
