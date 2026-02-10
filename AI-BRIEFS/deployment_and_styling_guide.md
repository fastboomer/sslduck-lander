# SSLDUCK Deployment & Styling Guide

## 🚀 Deployment Instructions
If GitHub-to-Vercel synchronization appears to be lagging, use the manual CLI deployment to force production updates:
```powershell
npx vercel --prod --yes
```

## 🎨 Styling Notes
To ensure immediate visual updates and bypass potential CSS/Tailwind caching during active design iterations:
1. **Card Color**: The "In a rush?" card background is currently set via an **inline style** in `app/components/ResumeOfferCard.tsx`.
   - To change the color, update the `style={{ backgroundColor: '#xxxxxx' }}` attribute on the card's main div.
2. **Global Background**: The page background is controlled via the `:root` variables in `app/globals.css`.

## 📝 Recent Changes (Feb 10, 2026)
- Changed background color to `rgb(245, 239, 224)` (#F5EFE0).
- Changed ResumeOfferCard background to `#d3b892`.
- Updated Hero title: "Premium Content" -> "Premium Research".
- Reverted deployment test labels.
