const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');

test.describe('Auth Flow', () => {

  test('1. Successful Login as Admin', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin', 'admin123');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('.user-name')).toHaveText('admin');
  });

  test('2. Successful Login as User1', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('user1', '1234');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('.user-name')).toHaveText('user1');
  });

  test('3. Failed Login with incorrect username', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('wronguser', '1234');
    
    await expect(page).toHaveURL(/login/);
    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('4. Failed Login with incorrect password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin', 'wrongpass');
    
    await expect(page).toHaveURL(/login/);
    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('5. Logout functionality', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    
    await loginPage.goto();
    await loginPage.login('user1', '1234');
    await expect(page).toHaveURL('/dashboard');
    
    await dashboardPage.logout();
    await expect(page).toHaveURL('/login');
  });

  test('6. Guarded route protection (redirect to login)', async ({ page }) => {
    // Unauthenticated user trying to access dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

});
