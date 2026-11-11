import { test, expect } from '@playwright/test';
test.use({ trace: 'off' });

test('Huit hoodies : tous pivotent, compteur, boucle et huit créations distinctes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const atlases = new Set<string>();
  page.on('request', req => { if (req.url().includes('/atlas')) atlases.add(req.url()); });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.locator('#wardrobe').scrollIntoViewIfNeeded();
  const garments = page.locator('.rack-garment');
  await expect(garments).toHaveCount(8);
  for (let i = 0; i < 8; i++) {
    await garments.nth(i).hover();
    await expect(garments.nth(i).locator('canvas')).toHaveAttribute('data-frame', '7');
    await expect(page.locator('.rack-info > .micro')).toHaveText(`0${i + 1} / 08`);
    await page.mouse.move(5, 5);
    await expect(garments.nth(i).locator('canvas')).toHaveAttribute('data-frame', '0');
  }
  expect(atlases.size).toBe(8);
  await garments.last().focus();
  await page.keyboard.press('ArrowRight');
  await expect(garments.first()).toBeFocused();
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'docs/screenshots/showroom-eight-desktop.png' });
});

test('Huit hoodies : dernier accessible au toucher et largeur 714 sans débordement', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/');
  await page.locator('#wardrobe').scrollIntoViewIfNeeded();
  for (let i = 0; i < 7; i++) await page.getByRole('button', { name: 'Pièce suivante' }).tap();
  await expect(page.locator('.rack-info > .micro')).toHaveText('08 / 08');
  await expect(page.locator('.rack-garment').last().locator('canvas')).toHaveAttribute('data-frame', '7');
  expect(await page.locator('.rack-scroll').evaluate(el => el.scrollLeft)).toBeGreaterThan(500);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/screenshots/showroom-eight-mobile.png' });
  await page.locator('.rack-controls a').tap();
  await expect(page).toHaveURL(/hoodie-indigo/);
  await page.setViewportSize({ width: 714, height: 615 });
  await page.goto('/');
  await page.locator('#wardrobe').scrollIntoViewIfNeeded();
  await expect(page.locator('.rack-garment')).toHaveCount(8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

test('Chaque hoodie possède sa fiche et son propre visuel, avec ajout au panier', async ({ page }) => {
  const ids = ['noir','sable','olive','bordeaux','ecru','cobalt','rose','indigo'];
  const sources = new Set<string>();
  for (const id of ids) {
    await page.goto(`/produit/hoodie-${id === 'sable' ? 'dune' : id}`);
    await expect(page.locator('.product-detail h1')).toContainText('Hoodie');
    const image = page.locator('.gallery-image');
    await expect(image).toBeVisible();
    expect(await image.evaluate(el => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true);
    sources.add((await image.getAttribute('src'))!);
    await expect(page.getByRole('button', { name: 'Voir le dos', exact: true })).toHaveCount(0);
  }
  expect(sources.size).toBe(8);
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByRole('button', { name: 'Ajouter au panier', exact: true }).click();
  const cart = page.getByRole('dialog', { name: /Votre panier/ });
  await expect(cart).toContainText('Hoodie Fragment');
  await expect(cart).toContainText('Indigo / M');
});
