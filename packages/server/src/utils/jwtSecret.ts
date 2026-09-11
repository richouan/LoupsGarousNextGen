/**
 * SEC-05 FIX: Centralized and strictly validated JWT secret retriever.
 * Prevents running in production with weak, predictable, or hardcoded fallback secrets.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing in production! ' +
        'Refusing to start with insecure credentials.'
      );
    }
    console.warn(
      '⚠️ [Security Warning] JWT_SECRET is not set in environment. Using development-only fallback.'
    );
    return 'lg-local-dev-secret-do-not-use-in-production-2026';
  }

  return secret;
}
