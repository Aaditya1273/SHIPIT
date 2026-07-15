/**
 * OKX ASP field limits from okx-ai reference docs
 */
export const NAME_LIMITS = {
  CN_MIN: 2,
  CN_MAX: 12,
  EN_MIN: 3,
  EN_MAX: 25,
} as const;

export const SERVICE_NAME = {
  MIN: 5,
  MAX: 30,
} as const;

export const SERVICE_DESCRIPTION = {
  CJK_PART_MAX: 200,
  CJK_TOTAL_MAX: 400,
} as const;

export const DESCRIPTION = {
  MAX_CHARS: 500,
} as const;

export const ENDPOINT = {
  MAX_CHARS: 512,
  REQUIRED_PROTOCOL: "https://",
} as const;

export const FEE = {
  MAX_DECIMALS: 6,
  IMPLIED_CURRENCY: "USDT",
} as const;

export const AVATAR = {
  MAX_SIZE_BYTES: 1_000_000, // 1MB
  RECOMMENDED_ASPECT: "1:1",
} as const;

export const TITLE = {
  MAX_CHARS: 30,
} as const;

export const SUMMARY = {
  MAX_CHARS: 200,
} as const;

export const GENERATION = {
  DEFAULT_RETRY_COUNT: 3,
  TIMEOUT_MS: 30_000,
} as const;

export const DEPLOY = {
  POLL_INTERVAL_MS: 1000,
} as const;
