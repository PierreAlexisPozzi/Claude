/* Mode photo (T7) : touche P ; jeu figé (le skieur ne bouge plus) ; HUD masqué, panneau affiché ; profondeur de champ
   dans la chaîne seulement pendant le mode ; « Enregistrer l'image » télécharge un PNG ; Échap rend le jeu tel qu'il
   était (HUD, heure du soleil, champ de la caméra, profondeur de champ retirée). */
import { test, expect } from '@playwright/test';
import { openGame, start, pump } from './helpers';

test('mode photo : jeu figé, profondeur de champ, image enregistrée, retour au jeu', async ({ page }) => {
  test.setTimeout(10 * 60_000);
  await openGame(page, 'web');
  await start(page);
  await pump(page, 2);
  const before = await page.evaluate(() => { const s = (window as any).__ski; s.setVel(12, 0, 12); return { hour: s.SKY.hour, fov: s.camera.fov }; });
  await page.keyboard.press('p');
  await pump(page, 3, 1 / 60);
  const p0 = await page.evaluate(() => (window as any).__ski.P.pos.toArray());
  await pump(page, 20, 1 / 60);
  const st = await page.evaluate(() => {
    const s = (window as any).__ski, cam = s.camera.position, sk = s.P.pos;
    return { open: s.PHOTO.open, pos: s.P.pos.toArray(), hud: document.getElementById('hud')!.hidden, panel: document.getElementById('photo')!.hidden, dist: Math.hypot(cam.x - sk.x, cam.z - sk.z) };
  });
  expect(st.open).toBe(true);
  expect(st.hud).toBe(true);
  expect(st.panel).toBe(false);
  expect(st.pos).toEqual(p0);                                   // simulation figée
  expect(st.dist).toBeGreaterThan(1); expect(st.dist).toBeLessThan(13);
  // réglages : heure et flou
  await page.evaluate(() => { const set = (id: string, v: string) => { const el = document.getElementById(id) as HTMLInputElement; el.value = v; el.dispatchEvent(new Event('input')); }; set('phHour', '16.5'); set('phAperture', '0.8'); });
  await pump(page, 2, 1 / 60);
  expect(await page.evaluate(() => (window as any).__ski.SKY.hour)).toBe(16.5);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#phSave')]);
  expect(dl.suggestedFilename()).toBe('val-des-sapins-photo.png');
  await page.keyboard.press('Escape');
  await pump(page, 2, 1 / 60);
  const after = await page.evaluate(() => { const s = (window as any).__ski; return { open: s.PHOTO.open, hud: document.getElementById('hud')!.hidden, panel: document.getElementById('photo')!.hidden, hour: s.SKY.hour, fov: s.camera.fov }; });
  expect(after.open).toBe(false);
  expect(after.hud).toBe(false);
  expect(after.panel).toBe(true);
  expect(after.hour).toBe(before.hour);
  expect(Math.abs(after.fov - before.fov)).toBeLessThan(0.5);
});
