# SSLDUCK-LANDER Troubleshooting & Fixes (Feb 2026)

## Issues Encountered
1. **Mobile Menu Displacement**: The header logo was occupying significant space, causing the mobile menu button to be pushed off-screen or clipped on smaller devices.
2. **Missing Client Directive**: The `Header.tsx` component was missing the `'use client';` directive. In Next.js (App Router), components using interactivity (React hooks like `useState`, `useEffect`) must explicitly declare this, otherwise, JavaScript-driven elements (like menus) will not mount or function.
3. **Z-Index Stacking**: Standard z-index values were insufficient to overcome some parent container clipping, requiring highly elevated stacking contexts (`z-[1000]`).

## Corrective Measures
1. **Mandatory 'use client'**: Always ensure `'use client';` is at the very top of interactive UI components.
2. **Responsive Component Isolation**:
   - Switched from "relative-within-header" positioning to a more robust flex-justify pattern for the menu button.
   - For mobile-specific menus, standardizing on a fixed-height header (`h-20` for mobile, `h-28` for desktop) ensures consistent vertical alignment.
3. **Pancake Menu Optimization**:
   - Replaced text-labeled debug buttons with a "lightweight" Lucid React `Menu` icon.
   - Applied `md:hidden` to the mobile toggle and `hidden md:flex` to the desktop links to ensure zero interference between breakpoints.
4. **Scroll Locking**: Implemented a `useEffect` hook to set `document.body.style.overflow = 'hidden'` when the menu is open to prevent background scrolling—a standard for premium mobile UX.

## Future Recommendations
- **Default Exports**: Use `export default` for main page components (like Header) to ensure smoother handling by the Next.js compiler and hot-reloading systems.
- **Cache Management**: When deploying to Vercel, if changes don't appear immediately on mobile, use a "Hard Refresh" or check the specific deployment URL (the one containing the unique hash) to bypass ISP-level caching.
