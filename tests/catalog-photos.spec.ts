import { test, expect } from '@playwright/test';
import { products, categories } from '../data/products';
test.use({ trace: 'off' });

test('Toutes les catégories utilisent des visuels raster photoréalistes', async ({ request }) => {
  expect(categories).toHaveLength(8);
  expect(products).toHaveLength(32);
  for (const product of products) {
    expect(product.media).toBe('concept');
    for (const color of product.colors) {
      expect(color.image).toMatch(/\.webp$/);
      expect(color.image).not.toMatch(/\.svg|\/fixtures\//);
      for (const src of [color.image, color.back].filter(Boolean) as string[]) {
        const response = await request.get(src);
        expect(response.status(), `${product.name}: ${src}`).toBe(200);
        expect(response.headers()['content-type']).toContain('image/webp');
        expect((await response.body()).byteLength).toBeGreaterThan(1000);
      }
    }
  }
});

test('Catalogue et huit filtres de catégories : photos chargées, aucune illustration SVG', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const category of categories) {
    await page.goto(`/collection?categorie=${encodeURIComponent(category)}`);
    const images = page.locator('.product-front');
    await expect(images.first()).toBeVisible();
    await expect.poll(() => images.first().evaluate(el => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true);
    expect(await images.evaluateAll(items => items.every(el => !el.getAttribute('src')?.includes('.svg')))).toBe(true);
    expect(await page.locator('.product-card').count()).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});

test('Photos face et dos, variantes de couleur et carte au survol', async ({ page }) => {
  await page.goto('/produit/veste-atelier');
  const photo = page.locator('.gallery-image');
  await expect(photo).toHaveAttribute('src', /product-09-front/);
  await page.getByRole('button', {name: 'Voir le dos', exact: true}).click();
  await expect(photo).toHaveAttribute('src', /product-09-back/);
  await page.getByRole('button', {name: 'Couleur Olive', exact: true}).click();
  await expect(photo).toHaveAttribute('src', /product-09-olive-back/);
  await page.getByRole('button', {name: 'Voir la face', exact: true}).click();
  await expect(photo).toHaveAttribute('src', /product-09-olive-front/);
  await page.goto('/collection?categorie=Robes');
  const card = page.locator('.product-card').first();
  await card.hover();
  await expect(card.locator('.product-back')).toHaveCSS('opacity', '1');
  await page.goto('/collection?categorie=Hoodies');
  const hoodie = page.locator('.product-card').filter({has: page.locator('.card-meta > a', {hasText: 'Hoodie Nocturne'})});
  await hoodie.hover();
  await expect(hoodie.locator('.product-front')).toHaveCSS('opacity', '1');
});
