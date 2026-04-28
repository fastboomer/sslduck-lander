/**
 * ═══════════════════════════════════════════════════════════════
 *  SSLDUCK SECURE FULFILLMENT — PROTECTED PAGES CONFIG
 * ═══════════════════════════════════════════════════════════════
 *
 *  HOW TO ADD A NEW PROTECTED PAGE:
 *  ─────────────────────────────────
 *  1. Add its route to PROTECTED_ROUTES below (one line)
 *  2. Create the page file at: app/fulfillment/[your-slug]/page.tsx
 *  3. That's it — middleware protects it automatically.
 *
 *  Example:
 *    '/fulfillment/bonus-videos',
 *    '/fulfillment/course-week-1',
 *
 * ═══════════════════════════════════════════════════════════════
 */

export const PROTECTED_ROUTES = [
  '/fulfillment',
  // ↓ Add new protected routes below this line:
  // '/fulfillment/course-materials',
  // '/fulfillment/bonus-videos',
  // '/fulfillment/weekly-calls',
];

/** Stripe plan types passed as metadata in checkout sessions */
export const PLAN_TYPES = {
  SIX_MONTH: '6_month',
  TWELVE_MONTH: '12_month',
} as const;

export type PlanType = typeof PLAN_TYPES[keyof typeof PLAN_TYPES];
