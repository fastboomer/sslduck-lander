# SSLDUCK Premium CSS Manifest
Date: February 15, 2026

## Global Styles (app/globals.css)
```css
@import "tailwindcss";

@theme {
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

:root {
  --background: #FAFAFA;
  --foreground: #171717;
  --card-bg: #FFFFFF;
  --card-border: #E5E5E5;
  --ice-blue: #EBF5FF;
  --ice-border: #93C5FD;
  --emerald: #10B981;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}

/* Custom UI Utilities */
.ice-blue-zone {
  background-color: var(--ice-blue);
  border: 2px dashed var(--ice-border);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.ice-blue-zone:hover {
  background-color: #DBEAFE;
  border-color: #60A5FA;
}

.standard-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
```

## Component-Specific Visual Logic

### Resume Upload Zone (v12-PRO)
- **Background**: `bg-[#F0F7FF]` (Royal Ice) or `var(--ice-blue)`
- **Border**: `border-2 border-dashed border-[#A5C9FF]` (Thicker, more defined)
- **Icon/Check**: `text-emerald-500` (Emerald Green for verified state)

### Job Description Zone
- **Container**: `bg-white` (Solid background for contrast)
- **Border**: `border border-gray-200` (Thin, solid)
- **Shadow**: `shadow-sm`

### Typography & Branding
- **Version Watermark**: `bg-black text-white px-2 py-1 text-[8px] z-[9999] opacity-50 font-mono`
- **Header Label**: `text-[10px] text-gray-400 font-mono font-bold tracking-tighter`
