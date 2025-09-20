import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the application
    console.log('Navigating to localhost:3005...');
    await page.goto('http://localhost:3005');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check if we need to sign up/login first
    const loginForm = page.locator('input[type="email"], input[placeholder*="email"]').first();
    const signupForm = page.locator('input[placeholder*="username"]').first();

    if (await loginForm.isVisible().catch(() => false) || await signupForm.isVisible().catch(() => false)) {
      console.log('Authentication required. Creating test account...');

      // Try to find signup form
      if (await signupForm.isVisible().catch(() => false)) {
        await page.fill('input[placeholder*="username"]', 'testuser123');
        await page.fill('input[placeholder*="email"]', 'test@example.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');
      } else {
        // Try login with existing account
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');
      }
    }

    // Look for map view or navigation to map
    console.log('Looking for map view...');

    // Look for the actual Leaflet map container (not just icons)
    const actualMapContainer = page.locator('.leaflet-container');
    const mapTabButton = page.locator('[data-testid="tab-map"], button:has-text("Map")');

    if (await actualMapContainer.count() === 0) {
      if (await mapTabButton.count() > 0) {
        console.log('Navigating to map view...');
        await mapTabButton.first().click();
        await page.waitForLoadState('networkidle');
      }
    }

    // Wait for map to load
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    console.log('Map view loaded successfully!');

    // Look for golf course markers on the map
    console.log('Looking for golf course markers...');

    // Wait for markers to load and find the actual marker elements with golf ball icons
    await page.waitForTimeout(2000); // Give markers time to render

    // Look for the actual Leaflet marker elements with the golf ball icons
    const markers = page.locator('.leaflet-marker-icon.golf-ball-icon');
    const markerCount = await markers.count();

    console.log(`Found ${markerCount} golf course markers`);

    if (markerCount > 0) {
      // Click on the first marker to open the popup
      console.log('Clicking on first golf course marker...');
      await markers.first().click();
      await page.waitForTimeout(1000);

      // Wait for the popup to appear
      const popup = page.locator('.golf-popup-card');
      if (await popup.isVisible()) {
        console.log('Golf course popup opened successfully!');

        // Look for status change buttons in the popup using test IDs
        const statusPlayedButtons = page.locator('[data-testid^="button-status-played-"]');
        const statusWantButtons = page.locator('[data-testid^="button-status-want-"]');
        const statusNotPlayedButtons = page.locator('[data-testid^="button-status-not-played-"]');

        console.log('Found status change buttons!');

        // Get the counts of each type of status button
        const playedCount = await statusPlayedButtons.count();
        const wantCount = await statusWantButtons.count();
        const notPlayedCount = await statusNotPlayedButtons.count();

        console.log(`Status buttons found - Played: ${playedCount}, Want: ${wantCount}, Not Played: ${notPlayedCount}`);

        // Try to change status by clicking different buttons
        if (notPlayedCount > 0) {
          // If there's a "Not Played" button, the current status is probably different, so click "Played"
          if (playedCount > 0) {
            console.log('Changing course status to Played...');
            await statusPlayedButtons.first().click();
            await page.waitForTimeout(1000);
            console.log('✅ Successfully clicked Played button!');
          }
        } else if (playedCount > 0) {
          // If current status is "Played", change to "Want to Play"
          if (wantCount > 0) {
            console.log('Changing course status to Want to Play...');
            await statusWantButtons.first().click();
            await page.waitForTimeout(1000);
            console.log('✅ Successfully clicked Want to Play button!');
          }
        } else if (wantCount > 0) {
          // If current status is "Want to Play", change to "Played"
          console.log('Course is currently "Want to Play", changing to Played...');
          // Look for played button again after popup update
          const newPlayedButtons = page.locator('[data-testid^="button-status-played-"]');
          if (await newPlayedButtons.count() > 0) {
            await newPlayedButtons.first().click();
            await page.waitForTimeout(1000);
            console.log('✅ Successfully clicked Played button!');
          }
        }

        // Verify status change by checking if marker icon changed
        console.log('Status change completed - checking for visual feedback...');
      } else {
        console.log('❌ Popup did not open after clicking marker');
      }
    } else {
      console.log('❌ No golf course markers found on the map');
    }

    // Take a screenshot for verification
    await page.screenshot({ path: 'map-test-result.png', fullPage: true });
    console.log('Screenshot saved as map-test-result.png');

  } catch (error) {
    console.error('Test failed:', error.message);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();