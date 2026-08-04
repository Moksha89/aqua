export const DEFAULT_BUSINESS_THEME = {
  primary: '#0B5FFF',
  onPrimary: '#FFFFFF',
  secondary: '#0B7285',
  onSecondary: '#FFFFFF',
  surface: '#FFFFFF',
  background: '#F7F9FC',
  textPrimary: '#172B4D',
  textSecondary: '#52606D',
  border: '#CBD5E1',
  success: '#087F5B',
  warning: '#B45309',
  danger: '#C92A2A',
  info: '#1864AB',
  pondStatusAttentionGreen: '#087F5B',
  pondStatusAttentionAmber: '#B45309',
  pondStatusAttentionRed: '#C92A2A',
  chartSeries: ['#0B5FFF', '#0B7285', '#087F5B', '#B45309', '#C92A2A', '#6741D9'],
} as const;

export type BusinessThemeTokens = {
  [K in keyof typeof DEFAULT_BUSINESS_THEME]: (typeof DEFAULT_BUSINESS_THEME)[K];
};
