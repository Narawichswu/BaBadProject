class SearchPage {
  constructor(page) {
    this.page = page;
    this.dateInput = page.locator('input[name="date"]');
    this.startTimeInput = page.locator('select[name="startTime"]');
    this.endTimeInput = page.locator('select[name="endTime"]');
    this.searchButton = page.locator('button[type="submit"]');
    this.courtResults = page.locator('.court-card'); // Card for each court result
  }

  async goto() {
    await this.page.goto('/search');
  }

  async search(date, startTime, endTime) {
    if (date) await this.dateInput.fill(date);
    if (startTime) await this.startTimeInput.selectOption(startTime);
    if (endTime) await this.endTimeInput.selectOption(endTime);
    await this.searchButton.click();
  }
}

module.exports = { SearchPage };
