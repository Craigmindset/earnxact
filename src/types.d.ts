// Allows TypeScript to accept CSS side-effect imports such as
//   import "./globals.css"
// Next.js handles CSS at build time; this declaration satisfies the
// language server when the generated .next/types/ folder is absent.
declare module "*.css";
