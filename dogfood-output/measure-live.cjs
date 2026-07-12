const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 567 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('https://dignity2-d.vercel.app/', { waitUntil: 'networkidle' });
  // click Quick Play
  await page.click('text=Quick Play');
  await page.waitForTimeout(2500);
  const geo = await page.evaluate(() => {
    const c = document.querySelector('#game-container canvas') || document.querySelector('canvas');
    const r = c ? c.getBoundingClientRect() : null;
    const gc = document.getElementById('game-container');
    const gcs = gc ? getComputedStyle(gc) : null;
    return {
      canvasTop: r ? Math.round(r.top) : null,
      canvasLeft: r ? Math.round(r.left) : null,
      vh: window.innerHeight,
      bodyOverflow: getComputedStyle(document.body).overflow,
      bodyScrollH: document.body.scrollHeight,
      gameContainerPos: gcs ? gcs.position : null,
      gameContainerInset: gcs ? `${gcs.top}/${gcs.right}/${gcs.bottom}/${gcs.left}` : null,
      imperativelyPinned: !!document.getElementById('dignity-ingame-layout'),
      phaserLoaded: !!window.PHASER_GAME,
    };
  });
  console.log(JSON.stringify({ geo, errors }, null, 2));
  await browser.close();
})().catch(e => { console.error('SCRIPT_ERR', e.message); process.exit(1); });
