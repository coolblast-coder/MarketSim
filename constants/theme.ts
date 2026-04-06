// MarketSim Design System — Dark Glassmorphism + Neon Accents

export const Colors = {
  // Backgrounds
  bgPrimary: '#0a0e27',
  bgSecondary: '#111638',
  bgCard: 'rgba(25, 30, 65, 0.6)',
  bgCardSolid: '#191e41',
  bgInput: 'rgba(255, 255, 255, 0.06)',

  // Neon accents
  neonCyan: '#00d4ff',
  neonGreen: '#00ff88',
  neonMagenta: '#ff006e',
  neonAmber: '#ffbe0b',
  neonPurple: '#8b5cf6',

  // Text
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textMuted: 'rgba(255, 255, 255, 0.35)',

  // Semantic
  positive: '#00ff88',
  negative: '#ff4757',
  warning: '#ffbe0b',

  // Borders
  borderGlass: 'rgba(255, 255, 255, 0.1)',
  borderNeon: 'rgba(0, 212, 255, 0.3)',

  // Gradients
  gradientStart: '#0a0e27',
  gradientMid: '#111638',
  gradientEnd: '#1a1f4e',
};

export const Glass = {
  blur: 20,
  opacity: 0.6,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: Colors.borderGlass,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
  hero: 48,
};

export const Shadows = {
  neonCyan: {
    shadowColor: Colors.neonCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  neonGreen: {
    shadowColor: Colors.neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};
