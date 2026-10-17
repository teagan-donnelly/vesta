# Vesta logo asset

`vesta-goddess.png` is the official transparent lockup supplied as **Engraved Vesta Goddess Logo.png**. It is copied byte for byte, at its original 1774 × 887 dimensions. The illustration, lettering, colors, proportions, and alpha channel are unchanged. No generated artwork is used.

The desktop sidebar and mobile navigation reference this file directly in `components/aegis-shell.tsx`. A deliberate white backing provides contrast against the navy sidebar; this is CSS behind the transparent image, not an embedded cream rectangle. The full lockup scales proportionally without cropping or independent resizing of its parts.

`app/favicon.ico` (32, 48, and 64 pixels), `app/icon.png` (512 pixels), and `app/apple-icon.png` (180 pixels) are resized, uncropped versions of the same complete lockup on white. Small favicon sizes necessarily show less illustration detail. Next.js serves these through its metadata file conventions. Application title and description live in `app/layout.tsx`; loading states use restrained Vesta text rather than repeating the illustration.
