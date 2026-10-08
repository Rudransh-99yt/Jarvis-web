/**
 * Frontend Production Error Experience
 * Maps backend diagnostic responses and unexpected network exceptions
 * into dignified, classified user-facing notices without raw stack traces.
 */

export type FrontendErrorCategory =
  | 'AUTH_FAILURE'
  | 'BACKEND_UNAVAILABLE'
  | 'DATABASE_FAILURE'
  | 'GEMINI_FAILURE'
  | 'TIMEOUT'
  | 'APPLICATION_ERROR';

export interface FormattedProductionError {
  category: FrontendErrorCategory;
  title: string;
  message: string;
  isRetryable: boolean;
  correlationId?: string;
}

export function formatProductionError(err: any): FormattedProductionError {
  const correlationId =
    err?.correlationId || err?.error?.correlationId || err?.headers?.get?.('x-correlation-id');
  const status = err?.status || err?.statusCode;
  const code = err?.code || err?.error?.code;
  const subsystem = err?.subsystem || err?.error?.subsystem;
  const rawMsg = (err?.error?.message || err?.message || '').toLowerCase();

  if (
    status === 401 ||
    status === 403 ||
    code === 'UNAUTHENTICATED' ||
    code === 'PRIVATE_ALPHA_RESTRICTED' ||
    rawMsg.includes('unauthenticated') ||
    rawMsg.includes('private alpha')
  ) {
    return {
      category: 'AUTH_FAILURE',
      title: 'Authentication Required',
      message:
        code === 'PRIVATE_ALPHA_RESTRICTED'
          ? 'This private alpha instance is restricted to authorized accounts only.'
          : 'Session credentials missing or expired. Please sign in.',
      isRetryable: false,
      correlationId
    };
  }

  if (
    subsystem === 'GEMINI' ||
    rawMsg.includes('gemini') ||
    rawMsg.includes('quota') ||
    status === 502
  ) {
    return {
      category: 'GEMINI_FAILURE',
      title: 'Intelligence Provider Standby',
      message: 'Neural generation provider is temporarily degraded. Operating in local diagnostic mode.',
      isRetryable: true,
      correlationId
    };
  }

  if (subsystem === 'DATABASE' || rawMsg.includes('database') || rawMsg.includes('store')) {
    return {
      category: 'DATABASE_FAILURE',
      title: 'Data Store Delay',
      message: 'Persistent records could not be synchronized. Please retry.',
      isRetryable: true,
      correlationId
    };
  }

  if (
    rawMsg.includes('failed to fetch') ||
    rawMsg.includes('networkerror') ||
    rawMsg.includes('econnrefused')
  ) {
    return {
      category: 'BACKEND_UNAVAILABLE',
      title: 'Gateway Offline',
      message: 'Jarvis backend server is currently unreachable. Reconnecting...',
      isRetryable: true,
      correlationId
    };
  }

  if (rawMsg.includes('timeout') || rawMsg.includes('abort')) {
    return {
      category: 'TIMEOUT',
      title: 'Transmission Timeout',
      message: 'Request exceeded maximum allowable transmission latency.',
      isRetryable: true,
      correlationId
    };
  }

  return {
    category: 'APPLICATION_ERROR',
    title: 'Directive Aborted',
    message: err?.error?.message || err?.message || 'An unexpected condition was detected.',
    isRetryable: true,
    correlationId
  };
}
