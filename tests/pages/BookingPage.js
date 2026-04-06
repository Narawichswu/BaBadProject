class BookingPage {
  constructor(page) {
    this.page = page;
    this.dateInput = page.locator('input[name="date"]');
    this.startTimeInput = page.locator('input[name="startTime"]');
    this.endTimeInput = page.locator('input[name="endTime"]');
    this.confirmButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('.alert-error');
  }

  async goto(roomId) {
    await this.page.goto(`/book/${roomId}`);
  }

  async book(date, startTime, endTime) {
    if (date) await this.dateInput.fill(date);
    if (startTime) await this.startTimeInput.fill(startTime);
    if (endTime) await this.endTimeInput.fill(endTime);
    await this.confirmButton.click();
  }
}

module.exports = { BookingPage };
