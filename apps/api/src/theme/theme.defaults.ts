export const DEFAULT_BUSINESS_THEME = {
  primary: '#006786',
  onPrimary: '#FFFFFF',
  secondary: '#00B8D4',
  onSecondary: '#10333D',
  surface: '#FFFFFF',
  background: '#EEF4F6',
  textPrimary: '#10333D',
  textSecondary: '#4F737B',
  border: '#D6E5E8',
  success: '#0F8A5F',
  warning: '#A86A09',
  danger: '#C62A52',
  info: '#0088B0',
  pondStatusAttentionGreen: '#0F8A5F',
  pondStatusAttentionAmber: '#A86A09',
  pondStatusAttentionRed: '#C62A52',
  chartSeries: ['#0088B0', '#00B8D4', '#0F8A5F', '#A86A09', '#C62A52', '#6B4FC4'],
} as const;

export type BusinessThemeTokens = {
  [K in keyof typeof DEFAULT_BUSINESS_THEME]: (typeof DEFAULT_BUSINESS_THEME)[K];
};
