//  the single source of truth for your locked design system — every screen imports colors/spacing from here, so the brand stays consistent.

export const colors = {
  primary: "#10B981",
  primaryDark: "#059669",
  secondary: "#1E3A8A",
  accent: "#F59E0B",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  text: "#0F172A",
  textSecondary: "#64748B",
  border: "#E2E8F0",
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  moneyIn: "#22C55E",
  moneyOut: "#EF4444",
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;