import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

export const securityHeaders = (isProd: boolean) => {
  return (_req: Request, res: Response, next: NextFunction) => {
    // Generate per-request cryptographically secure nonce for CSP
    const nonce = crypto.randomBytes(16).toString('base64');
    try {
      res.locals = res.locals || {};
      res.locals.cspNonce = nonce;
    } catch {}

    // 1. Content Security Policy (CSP)
    const extraFrameAncestors = (process.env.ALLOWED_FRAME_ANCESTORS || process.env.FRAME_ANCESTORS)?.trim();
    const frameAncestorsDirective = extraFrameAncestors
      ? `frame-ancestors 'self' ${extraFrameAncestors}`
      : "frame-ancestors 'self'";

    // In production: strictly no 'unsafe-inline' and no 'unsafe-eval'; nonce-based script execution
    const scriptDirective = isProd
      ? `script-src 'self' 'nonce-${nonce}'`
      : "script-src 'self' 'unsafe-inline'";

    // connect-src: limitado estrictamente a 'self' y ws:/wss: para stream/HMR, sin aceptar comodín https:
    const extraConnectSrc = process.env.ALLOWED_CONNECT_SRC?.trim() || '';
    const connectDirective = [
      "'self'",
      "ws:",
      "wss:",
      extraConnectSrc,
    ].filter(Boolean).join(' ');

    const cspPolicy = [
      "default-src 'self'",
      scriptDirective,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob:",
      `connect-src ${connectDirective}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      frameAncestorsDirective,
    ].join('; ');

    res.setHeader('Content-Security-Policy', cspPolicy);

    // 2. Prevent MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // 3. Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 4. DNS Prefetch Control
    res.setHeader('X-DNS-Prefetch-Control', 'off');

    // 5. Download Options for IE8+
    res.setHeader('X-Download-Options', 'noopen');

    // 6. Cross Origin Resource Policy
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // 7. Strict-Transport-Security in production
    if (isProd) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // Explicitly do NOT set obsolete X-XSS-Protection header as requested
    res.removeHeader('X-XSS-Protection');

    next();
  };
};
