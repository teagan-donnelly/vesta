# Vesta logo asset

`vesta-goddess.png` is the official transparent lockup supplied as **Engraved Vesta Goddess Logo.png**. It is copied byte for byte, at its original 1774 × 887 dimensions. The illustration, lettering, colors, proportions, and alpha channel are unchanged. No generated artwork is used in this logo. The separate decorative welcome illustration never replaces it.

The desktop sidebar and mobile navigation reference this file directly in `components/aegis-shell.tsx`. The approved ivory canvas provides contrast behind the transparent image; this is CSS, not an embedded rectangle. The full lockup scales proportionally without cropping or independent resizing of its parts.

`app/favicon.ico` (32, 48, and 64 pixels), `app/icon.png` (512 pixels), and `app/apple-icon.png` (180 pixels) are resized, uncropped versions of the same complete lockup on white. Small favicon sizes necessarily show less illustration detail. Next.js serves these through its metadata file conventions. Application title and description live in `app/layout.tsx`; loading states use restrained Vesta text rather than repeating the illustration.
