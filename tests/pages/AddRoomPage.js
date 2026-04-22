class AddRoomPage {
  constructor(page) {
    this.page = page;
    this.nameInput = page.locator('input[name="name"]');
    this.courtTypeSelect = page.locator('select[name="courtType"]');
    this.surfaceSelect = page.locator('select[name="surface"]');
    this.priceInput = page.locator('input[name="pricePerHour"]');
    this.descriptionInput = page.locator('input[name="description"]');
    this.addCourtButton = page.locator('button[type="submit"]');
  }

  async goto() {
    await this.page.goto('/rooms/add');
  }

  async addCourt(options) {
    if (options.name) {await this.nameInput.fill(options.name);}
    if (options.courtType) {await this.courtTypeSelect.selectOption(options.courtType);}
    if (options.surface) {await this.surfaceSelect.selectOption(options.surface);}
    if (options.pricePerHour) {await this.priceInput.fill(options.pricePerHour.toString());}
    if (options.description) {await this.descriptionInput.fill(options.description);}

    if (options.facilities) {
      for (const facility of options.facilities) {
        await this.page.locator(`input[name="facilities"][value="${facility}"]`).check();
      }
    }

    await this.addCourtButton.click();
  }
}

module.exports = { AddRoomPage };
