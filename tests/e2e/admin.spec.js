const { test, expect } = require('@playwright/test');
const { AddRoomPage } = require('../pages/AddRoomPage');
const { LoginPage } = require('../pages/LoginPage');
const { removeTestCourt } = require('../utils/db');

test.describe('Admin Flows', () => {
  let addRoomPage;
  let loginPage;
  const testCourtName = 'E2E Test Court ' + Date.now();

  test.beforeEach(async ({ page }) => {
    addRoomPage = new AddRoomPage(page);
    loginPage = new LoginPage(page);
  });

  test.afterAll(async () => {
    await removeTestCourt(testCourtName);
  });

  test('Admin successfully adds a new court', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login('admin', 'admin123');

    await addRoomPage.goto();
    await expect(page).toHaveURL(/\/rooms\/add/);

    await addRoomPage.addCourt({
      name: testCourtName,
      courtType: 'double',
      surface: 'synthetic',
      pricePerHour: 250,
      description: 'A dedicated test court',
      facilities: ['💡 ไฟส่องสว่าง', '❄️ แอร์']
    });

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('body')).toContainText(testCourtName);
  });

  test('Admin validation errors when adding a court with missing details', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login('admin', 'admin123');

    await addRoomPage.goto();

    // leave required fields (like name/price) empty and submit
    await addRoomPage.addCourt({
      name: '',
      courtType: 'double',
      surface: 'synthetic',
      pricePerHour: '',
      description: ''
    });

    // Should not bypass HTML validation, therefore not redirecting
    await expect(page).toHaveURL(/\/rooms\/add/);
  });

  test('Non-admin blocked from Add Court endpoint', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login('user1', '1234');

    await addRoomPage.goto();

    // The backend renders the login view with a 403 status code but leaves URL intact
    // We should expect the error alert to be visible
    const alertLocator = page.locator('.alert-error');
    await expect(alertLocator).toBeVisible();
    await expect(alertLocator).toContainText('ไม่มีสิทธิ์');
  });
});
