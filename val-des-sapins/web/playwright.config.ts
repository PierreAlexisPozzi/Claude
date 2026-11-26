import { defineConfig } from '@playwright/test';

/* Tests du jeu en rendu logiciel (SwiftShader) : lents par nature, d'où des délais larges.
   `npm test` construit dist/ puis le sert avec `vite preview`. La cible « legacy » (game.html d'origine via
   ../index.html) charge Three.js depuis le CDN jsDelivr, comme la page d'origine. */
export default defineConfig({
  testDir: 'tests',
  timeout: 20 * 60_000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  workers: process.env.VDS_WORKERS ? Number(process.env.VDS_WORKERS) : 2,
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    browserName: 'chromium',
    viewport: { width: 1000, height: 560 },
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
    trace: 'off',
    serviceWorkers: 'block',   // isolement des tests ; le cache est testé à part (tests/offline.spec.ts)
    actionTimeout: 120_000,
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
