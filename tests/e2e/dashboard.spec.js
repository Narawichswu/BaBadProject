const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');

test.describe('Dashboard View', () => {

  test('7. Verify Admin sees "Add Room" controls', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login('admin', 'admin123');
    await expect(page).toHaveURL('/dashboard');

    const isVisible = await dashboardPage.isAddCourtVisible();
    expect(isVisible).toBeTruthy();
  });

  test('8. Verify User does NOT see "Add Room" controls', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login('user1', '1234');
    await expect(page).toHaveURL('/dashboard');

    const isVisible = await dashboardPage.isAddCourtVisible();
    expect(isVisible).toBeFalsy();

    // Attempt forced access to Add court endpoint
    const res = await page.goto('/rooms/add');
    await expect(page.locator('.alert-error')).toBeVisible();
  });

  test('9. Verify User can view their own booking list layout', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('user1', '1234');

    // We just check if the dashboard loaded and bookings container exists
    await expect(page.locator('.page-title')).toContainText('Dashboard');
    const bookingsExists = await page.locator('.glass-card').first().isVisible();
    expect(bookingsExists).toBeTruthy();
  });

});
