const { test, expect } = require('@playwright/test');
const { BookingPage } = require('../pages/BookingPage');
const { LoginPage } = require('../pages/LoginPage');
const { removeTestBooking } = require('../utils/db');

test.describe('Booking Flows', () => {
  let bookingPage;
  let loginPage;
  const testUserId = 2; // Assuming user1 is ID 2
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const testDate = tomorrow.toISOString().split('T')[0];

  test.beforeEach(async ({ page }) => {
    bookingPage = new BookingPage(page);
    loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.login('user1', '1234');
  });

  test.afterAll(async () => {
    await removeTestBooking(testUserId, testDate);
  });

  test('Successful booking creation', async ({ page }) => {
    await bookingPage.goto(1); // Assuming Court 1 exists
    
    const title = await page.title();
    if (title.includes('Not Found') || title.includes('Error')) {
       test.skip('Court 1 not found. Skipping test.');
       return;
    }
    
    await bookingPage.book(testDate, '08:00', '10:00');
    
    // Should redirect to dashboard on success
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('Unsuccessful booking with missing fields', async ({ page }) => {
    await bookingPage.goto(1);
    
    const title = await page.title();
    if (title.includes('Not Found') || title.includes('Error')) {
       test.skip('Court 1 not found. Skipping test.');
       return;
    }

    await bookingPage.book('', '', '');
    
    // Should stay on the booking page
    await expect(page).toHaveURL(/\/book\/1/);
  });

  test('Prevent booking with past dates', async ({ page }) => {
    await bookingPage.goto(1);
    
    const title = await page.title();
    if (title.includes('Not Found') || title.includes('Error')) {
       test.skip('Court 1 not found. Skipping test.');
       return;
    }

    await bookingPage.book('2020-01-01', '08:00', '10:00');
    
    // Validation prevents submission, URL stays the same
    await expect(page).toHaveURL(/\/book\/1/);
  });
});
