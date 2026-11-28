/* Mobile : commandes tactiles (joystick fixe en bas à gauche, 1 tape = saut, 2 tapes = switch, bouton doré
   contextuel, mini-carte ronde, pas de flou d'arrière-plan), sur un téléphone émulé. */
import { test, expect, devices } from '@playwright/test';
import { openGame, pump, start, expectNoErrors } from './helpers';

test.use({ ...devices['Pixel 7'] });

test('mobile : commandes tactiles', async ({ page }) => {
  await openGame(page, 'web');
  expect(await page.evaluate(() => document.body.classList.contains('touch'))).toBe(true);
  await start(page);
  await pump(page, 2);
  await expect(page.locator('#touch')).toBeVisible();
  const vp = page.viewportSize()!;
  // joystick fixe en bas à gauche
  const joy = (await page.locator('#joy').boundingBox())!;
  expect(joy.x + joy.width / 2).toBeLessThan(vp.width / 2);
  expect(joy.y + joy.height / 2).toBeGreaterThan(vp.height / 2);
  // mini-carte ronde
  expect(await page.evaluate(() => getComputedStyle(document.getElementById('miniWrap')!).borderRadius)).toMatch(/50%|9999|\d{3}px/);
  // aucun flou d'arrière-plan sur écran tactile
  const blurred = await page.evaluate(() => [...document.querySelectorAll('*')].filter((e) => { const cs = getComputedStyle(e) as CSSStyleDeclaration & { webkitBackdropFilter?: string }; return (cs.backdropFilter && cs.backdropFilter !== 'none') || (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== 'none'); }).map((e) => e.id || e.className));
  expect(blurred).toEqual([]);
  // le joystick pousse « schuss » : la commande ↑ s'allume
  const cx = joy.x + joy.width / 2, cy = joy.y + joy.height / 2;
  await page.evaluate(([x, y]) => {
    const z = document.getElementById('joyZone')!, ev = (t: string, yy: number) => z.dispatchEvent(new PointerEvent(t, { pointerId: 7, clientX: x, clientY: yy, bubbles: true, pointerType: 'touch' }));
    ev('pointerdown', y); ev('pointermove', y - 60);
  }, [cx, cy]);
  await pump(page, 1);
  expect(await page.evaluate(() => (window as any).__ski.input.up)).toBe(true);
  await page.evaluate(([x, y]) => document.getElementById('joyZone')!.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, clientX: x, clientY: y, bubbles: true, pointerType: 'touch' })), [cx, cy]);
  // bouton doré contextuel : apparaît au pied d'une remontée
  await page.evaluate(() => { const s = (window as any).__ski, L = s.LIFTS[0]; s.teleport(L.board.x + 2, L.board.z, L.yaw); s.step(2); });
  await pump(page, 3, 0.05);
  await expect(page.locator('#bCtx')).toBeVisible();
  await expectNoErrors(page);
});
