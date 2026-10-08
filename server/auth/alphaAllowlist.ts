import type { User } from '../data/types.ts';
import { logger } from '../logging/logger.ts';

export interface AlphaAllowlistConfig {
  enabled: boolean;
  allowedEntries: string[];
}

export function getAlphaAllowlistConfig(): AlphaAllowlistConfig {
  const rawList = process.env.PRIVATE_ALPHA_ALLOWLIST || process.env.ALPHA_ALLOWLIST || '';
  const explicitEnable = process.env.PRIVATE_ALPHA_ENABLED === 'true';
  const entries = rawList
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const enabled = explicitEnable || entries.length > 0;
  return { enabled, allowedEntries: entries };
}

export function checkPrivateAlphaAccess(user: User): { allowed: boolean; reason?: string } {
  const config = getAlphaAllowlistConfig();
  if (!config.enabled || config.allowedEntries.length === 0) {
    return { allowed: true };
  }

  const userId = (user.id || '').toLowerCase().trim();
  const userEmail = (user.email || '').toLowerCase().trim();

  const isMatch =
    config.allowedEntries.includes(userId) ||
    (userEmail.length > 0 && config.allowedEntries.includes(userEmail));

  if (!isMatch) {
    logger.warn(
      'AUTH',
      `Private alpha access rejected for account '${user.email || user.id}' (not in allowlist)`,
      {
        userId: user.id,
        email: user.email,
        allowedCount: config.allowedEntries.length
      }
    );
    return {
      allowed: false,
      reason: `Account '${user.email || user.id}' is not in the private alpha allowlist.`
    };
  }

  return { allowed: true };
}
