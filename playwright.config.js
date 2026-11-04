// Configuração mínima do Playwright para a carteira-investimentos.
// Os testes E2E de data-testid vivem em tests/qa-probes/ e seguem o padrão
// do projeto: sobe o servidor HTTP local (tests/local-http-server.js),
// lança o Chromium e valida a renderização dos seletores estáveis.
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4199',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'node tests/local-http-server.js --port 4199 --synthetic-qa',
    port: 4199,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
