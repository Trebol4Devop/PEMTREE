import { spawn } from 'child_process';
import { chromium } from 'playwright';

const prefix = process.argv[2] || 'before';

async function run() {
  const devServer = spawn('pnpm', ['dev', '--port', '5179', '--strictPort'], {
    cwd: '/home/carlos/Escritorio/PEMTREE2/pemtree-react',
    shell: true,
  });

  devServer.stdout.on('data', (data) => {
    console.log(`Vite: ${data}`);
  });

  await new Promise((resolve) => setTimeout(resolve, 3000));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const pages = [
    { name: 'home', path: '/' },
    { name: 'visualizer', path: '/visualizador' },
    { name: 'planner', path: '/visualizador?view=planner' },
    { name: 'schedule', path: '/visualizador?view=schedule' },
    { name: 'forum', path: '/foro' },
    { name: 'groups', path: '/grupos' },
  ];

  const viewports = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
  ];

  const themes = ['light', 'dark'];

  for (const pageInfo of pages) {
    for (const theme of themes) {
      for (const viewport of viewports) {
        const page = await context.newPage();
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        await page.goto(`http://localhost:5179${pageInfo.path}`);
        await page.evaluate((t) => {
          localStorage.setItem('pemtree_theme', t);
        }, theme);

        await page.goto(`http://localhost:5179${pageInfo.path}`);
        await page.waitForTimeout(1000);

        if (pageInfo.name === 'visualizer') {
          await page.waitForTimeout(2000);
        }

        const screenshotPath = `/tmp/opencode/${prefix}-${pageInfo.name}-${theme}-${viewport.name}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`Saved screenshot: ${screenshotPath}`);
        await page.close();
      }
    }
  }

  await browser.close();
  devServer.kill('SIGINT');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
