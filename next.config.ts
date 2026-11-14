import type { NextConfig } from 'next';
const staticExport = process.env.MAISON_EDIT_STATIC_EXPORT === '1';
const config: NextConfig = {
  poweredByHeader: false,
  ...(staticExport ? { output: 'export', trailingSlash: true } : {}),
  images: { unoptimized: staticExport, formats: ['image/avif', 'image/webp'], qualities: [75, 85] },
};
export default config;
