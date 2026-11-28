import { test } from '@playwright/test';
import { openGame, pump, start } from './helpers';
test('dbg', async ({ page }) => {
  test.setTimeout(900_000);
  await page.setViewportSize({ width: 560, height: 700 });
  await openGame(page, 'web'); await page.evaluate(() => (window as any).__ski.quality('medium')); await start(page); await pump(page, 2);
  const near0 = await page.evaluate(() => {
    const s = (window as any).__ski, T = s.THREE; s.clear(); s.unlockAll();
    const p = s.PISTES.filter((x: any) => x.real && x.lvl === 'bleue' && x.samples && x.samples.length > 60).sort((a: any, b: any) => b.w - a.w || b.samples.length - a.samples.length)[0];
    const S = p.samples, i0 = Math.floor(S.length * 0.3), a = S[i0], b = S[i0 + 4];
    s.teleport(a.x, a.z, Math.atan2(b.x - a.x, b.z - a.z)); s.input.up = true; for (let i = 0; i < 240; i++) s.stepSim(s.STEP);
    for (let i = 0; i < 40; i++) s.skierTick(1 / 60);
    s.photoMode(true); document.getElementById('photo')!.hidden = true;
    const B = s.playerHuman.bones, P = (n: string) => B[n].getWorldPosition(new T.Vector3());
    const l = P('thigh_l'), rr = P('thigh_r'), fwd = new T.Vector3(0, 1, 0).cross(rr.clone().sub(l)), y0 = Math.atan2(fwd.x, fwd.z);
    const f = new T.Vector3(Math.sin(y0), 0, Math.cos(y0)), rt = new T.Vector3(-Math.cos(y0), 0, Math.sin(y0));
    const at = P('pelvis'); at.y -= 0.12;
    const from = at.clone().addScaledVector(rt, 0.6).addScaledVector(f, 0.25); from.y -= 0.3;
    Object.assign(s.PHOTO, { fixed: { from, at }, aperture: 0, fov: 40 });
    s.humanDebug(2);
    return s.camera.near;
  });
  const count = async () => { await pump(page, 1, 1 / 60); const png = await page.screenshot(); return page.evaluate(async (src) => { const im = new Image(); im.src = src; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d')!; g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] - d[i + 1] > 50 && d[i + 2] - d[i + 1] > 50) n++; return n; }, 'data:image/png;base64,' + png.toString('base64')); };
  const a = await count();
  await page.evaluate(() => { const c = (window as any).__ski.camera; c.near = 0.02; c.updateProjectionMatrix(); });
  const b = await count();
  console.log('NEAR', near0, 'magenta', a, 'near 0.02 ->', b);
});
