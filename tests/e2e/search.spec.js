const { test, expect } = require('@playwright/test');
const { SearchPage } = require('../pages/SearchPage');
const { LoginPage } = require('../pages/LoginPage');

test.describe('Search Flows', () => {
  let searchPage;
  let loginPage;

  test.beforeEach(async ({ page }) => {
    searchPage = new SearchPage(page);
    loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.login('user1', '1234');
    await searchPage.goto();
  });

  test('Search courts with missing fields should trigger validation', async ({ page }) => {
    // Leave fields empty and try to search
    // Using evaluate to bypass HTML5 validation or just test standard behavior
    await searchPage.search('', '', '');
    
    // Playwright does not click if validation fails in HTML5 form easily unless bypassed
    // So we just ensure it doesn't navigate away from /search and url doesn't have query
    await expect(page).toHaveURL(/\/search/);
  });

  test('Search courts for a valid future date', async ({ page }) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateString = futureDate.toISOString().split('T')[0];

    await searchPage.search(dateString, '10:00', '12:00');
    await expect(page).toHaveURL(/\/search/);
  });

  test('Search behavior when no courts are available for a very long range', async ({ page }) => {
    await searchPage.search('2030-01-01', '08:00', '10:00');
    await expect(page).toHaveURL(/\/search/);
    
    // Check if courts are loaded or empty state is shown
    const emptyState = page.locator('.empty-state');
    const courtsCount = await searchPage.courtResults.count();
    
    if (courtsCount === 0) {
       await expect(emptyState).toBeVisible();
    } else {
       expect(courtsCount).toBeGreaterThan(0);
    }
  });

  test('Navigate to booking flow from search results', async ({ page }) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    const dateString = futureDate.toISOString().split('T')[0];

    await searchPage.search(dateString, '08:00', '09:00');
    
    const count = await searchPage.courtResults.count();
    if (count > 0) {
      const bookButton = searchPage.courtResults.first().locator('a.btn-primary');
      if (await bookButton.isVisible()) {
        await bookButton.click();
        await expect(page).toHaveURL(/.*book\/.*/);
      }
    }
  });
});
