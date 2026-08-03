export const UserRole = {
  OWNER: 'AE_OWNER',
  ADMIN: 'AE_ADMIN',
  OPERATOR: 'AE_OPERATOR',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];
