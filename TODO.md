# TODO: Downgrade Tailwind CSS to v3 to Fix Vercel Build

- [x] Update package.json: Remove "@tailwindcss/vite" from dependencies; add "tailwindcss": "^3.4.0", "autoprefixer": "^10.4.0", "postcss": "^8.4.0" as devDependencies.
- [x] Create tailwind.config.ts: Move theme variables from index.css to config, configure content paths.
- [x] Update vite.config.ts: Remove tailwindcss() plugin.
- [x] Update src/index.css: Replace @import "tailwindcss"; with @tailwind base; @tailwind components; @tailwind utilities; and remove @theme block.
- [x] Run npm install to update dependencies.
- [x] Test build locally with npm run build.
- [x] Commit changes and redeploy to Vercel.
