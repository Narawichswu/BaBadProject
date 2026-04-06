class DashboardPage {
  constructor(page) {
    this.page = page;
    this.logoutButton = page.locator('a[href="/logout"]');
    this.addCourtButton = page.locator('#btn-add-court');
    this.bookingCards = page.locator('.booking-card'); 
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async logout() {
    await this.logoutButton.click();
  }

  async isAddCourtVisible() {
    return await this.addCourtButton.isVisible();
  }
  
  async getFirstBookingCancelButton() {
    return this.page.locator('form[action$="/remove"] button.btn-danger').first();
  }
  
  async getFirstBookingApproveButton() {
    return this.page.locator('form[action$="/approve"] button.btn-success').first();
  }
}

module.exports = { DashboardPage };
