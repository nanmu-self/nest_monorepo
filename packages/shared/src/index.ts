export interface ShortLinkConfig {
  domain: string;
  length: number;
}

export function createShortLinkConfig(domain: string, length = 6): ShortLinkConfig {
  return { domain, length };
}
