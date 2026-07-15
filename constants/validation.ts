/**
 * Validation patterns and rules from OKX identity-invariants.md
 */

export const VALIDATION_PATTERNS = {
  /** EVM address: 0x-prefixed, 42 chars total */
  EVM_ADDRESS: /^0x[a-fA-F0-9]{40}$/,
  /** Solana address: Base58, 32-44 chars */
  SOLANA_ADDRESS: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  /** HTTPS URL */
  HTTPS_URL: /^https:\/\/.+/,
  /** Plain number fee (no currency symbols) */
  FEE_NUMBER: /^\d+(\.\d+)?$/,
  /** No celebrity names in agent names */
  CELEBRITY_PATTERN:
    /(trump|musk|cz|elon|biden|马斯克|马云)/i,
} as const;

export const VALIDATION_MESSAGES = {
  NAME_TOO_SHORT_CN: `Name must be at least 2 characters (Chinese)`,
  NAME_TOO_LONG_CN: `Name must be at most 12 characters (Chinese)`,
  NAME_TOO_SHORT_EN: `Name must be at least 3 characters (English)`,
  NAME_TOO_LONG_EN: `Name must be at most 25 characters (English)`,
  NAME_CONTAINS_CELEBRITY: `Name cannot contain celebrity or public figure names`,
  SERVICE_NAME_TOO_SHORT: `Service name must be at least 5 characters`,
  SERVICE_NAME_TOO_LONG: `Service name must be at most 30 characters`,
  DESCRIPTION_TOO_LONG: `Description must be at most 500 characters`,
  SERVICE_DESC_TOO_LONG: `Service description must be at most 400 CJK characters total`,
  ENDPOINT_INVALID: `Endpoint must be a public HTTPS URL (https://...)`,
  ENDPOINT_TOO_LONG: `Endpoint must be at most 512 characters`,
  FEE_INVALID: `Fee must be a plain number (USDT implied) with at most 6 decimal places`,
  AVATAR_TOO_LARGE: `Avatar must be under 1MB`,
  AVATAR_URL_REJECTED: `Avatar links aren't supported — send an image file directly`,
} as const;

export const OKX_ERROR_CODES: Record<string, { friendly: string; next: string }> = {
  "81602": {
    friendly: "This agent has been blocked by the platform.",
    next: "Contact OKX support for more information.",
  },
  "50125": {
    friendly: "Service is not available in your region.",
    next: "",
  },
  "80001": {
    friendly: "Service is not available in your region.",
    next: "",
  },
} as const;
