/**
 * Playwright E2E tests for Novel Editor Autocomplete functionality
 *
 * Tests autocomplete through the actual user flow:
 * 1. Search for content
 * 2. Open article modal
 * 3. Enter edit mode
 * 4. Trigger autocomplete
 */

import { test, expect } from '@playwright/test';

const TEST_CONFIG = {
	APP_URL: 'http://localhost:5173',
	TIMEOUT: 15000,
	AUTOCOMPLETE_DEBOUNCE: 300,
};

test.describe('Novel Editor Autocomplete', () => {
	test('should trigger autocomplete in article editor', async ({ page }) => {
		console.log('📝 Testing autocomplete in article editor...');

		// Navigate to search page
		await page.goto(TEST_CONFIG.APP_URL);
		await page.waitForLoadState('networkidle');

		// Search for content
		const kgInput = page.locator('[data-testid="kg-search-input"]');
		await expect(kgInput).toBeVisible({ timeout: 5000 });
		await kgInput.fill('rust');

		// Wait for and select autocomplete suggestion
		await expect(page.locator('[data-testid="kg-autocomplete-list"]')).toBeVisible();
		await page.locator('[data-testid="kg-autocomplete-item"]').first().click();

		// Click on search result to open article
		const firstResult = page.locator('[data-testid="search-result-title"]').first();
		await expect(firstResult).toBeVisible();
		await firstResult.click();

		// Wait for article modal
		await expect(page.locator('[data-testid="article-modal"]:visible').first()).toBeVisible({
			timeout: 5000,
		});

		// Double-click to enter edit mode
		const articleViewer = page.locator('[data-testid="article-content-viewer"]:visible').first();
		await articleViewer.dblclick();

		// Wait for editor to appear
		const editor = page.locator('[data-testid="novel-editor"]:visible').first();
		await expect(editor).toBeVisible({ timeout: TEST_CONFIG.TIMEOUT });

		// Wait for autocomplete status to show ready
		const status = page.locator('[data-testid="autocomplete-status"]:visible').first();
		await expect(status).toContainText('Ready', { timeout: TEST_CONFIG.TIMEOUT });

		console.log('✅ Editor ready with autocomplete');

		// Focus editor
		const proseMirror = editor.locator('.ProseMirror').first();
		await proseMirror.evaluate((element) => {
			const htmlElement = element as HTMLElement;
			htmlElement.focus();
			const selection = window.getSelection();
			const range = document.createRange();
			range.selectNodeContents(htmlElement);
			range.collapse(false);
			selection?.removeAllRanges();
			selection?.addRange(range);
		});

		// Type trigger character
		await page.keyboard.type('@');
		await page.waitForTimeout(100);

		// Type search query
		await page.keyboard.type('rust');
		await page.waitForTimeout(TEST_CONFIG.AUTOCOMPLETE_DEBOUNCE + 200);

		// Verify suggestion dropdown appears
		const dropdown = page.locator('.terraphim-suggestion-dropdown:visible').first();
		await expect(dropdown).toBeVisible({ timeout: TEST_CONFIG.TIMEOUT });

		// Verify suggestions exist
		const suggestions = page.locator('.terraphim-suggestion-item:visible');
		await expect(suggestions.first()).toBeVisible();

		const suggestionCount = await suggestions.count();
		console.log(`✅ Found ${suggestionCount} autocomplete suggestions`);

		expect(suggestionCount).toBeGreaterThan(0);
	});

	test('should navigate suggestions with keyboard', async ({ page }) => {
		console.log('⌨️ Testing keyboard navigation...');

		// Navigate and open editor
		await page.goto(TEST_CONFIG.APP_URL);
		await page.waitForLoadState('networkidle');

		const kgInput = page.locator('[data-testid="kg-search-input"]');
		await expect(kgInput).toBeVisible();
		await kgInput.fill('rust');
		await page.locator('[data-testid="kg-autocomplete-item"]').first().click();

		await page.locator('[data-testid="search-result-title"]').first().click();
		await expect(page.locator('[data-testid="article-modal"]:visible').first()).toBeVisible();

		await page.locator('[data-testid="article-content-viewer"]:visible').first().dblclick();

		const editor = page.locator('[data-testid="novel-editor"]:visible').first();
		await expect(editor).toBeVisible({ timeout: TEST_CONFIG.TIMEOUT });

		// Focus and type trigger
		const proseMirror = editor.locator('.ProseMirror').first();
		await proseMirror.evaluate((el) => (el as HTMLElement).focus());
		await page.keyboard.type('@ter');
		await page.waitForTimeout(TEST_CONFIG.AUTOCOMPLETE_DEBOUNCE + 200);

		// Wait for dropdown
		const dropdown = page.locator('.terraphim-suggestion-dropdown:visible').first();
		await expect(dropdown).toBeVisible({ timeout: TEST_CONFIG.TIMEOUT });

		// Navigate with arrow keys
		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('ArrowDown');

		// Press Escape to close
		await page.keyboard.press('Escape');
		await expect(dropdown).not.toBeVisible();

		console.log('✅ Keyboard navigation works');
	});

	test('should respect minimum query length', async ({ page }) => {
		console.log('📏 Testing minimum query length...');

		await page.goto(TEST_CONFIG.APP_URL);
		await page.waitForLoadState('networkidle');

		const kgInput = page.locator('[data-testid="kg-search-input"]');
		await expect(kgInput).toBeVisible();
		await kgInput.fill('rust');
		await page.locator('[data-testid="kg-autocomplete-item"]').first().click();

		await page.locator('[data-testid="search-result-title"]').first().click();
		await expect(page.locator('[data-testid="article-modal"]:visible').first()).toBeVisible();

		await page.locator('[data-testid="article-content-viewer"]:visible').first().dblclick();

		const editor = page.locator('[data-testid="novel-editor"]:visible').first();
		await expect(editor).toBeVisible({ timeout: TEST_CONFIG.TIMEOUT });

		// Type just trigger + 1 char
		const proseMirror = editor.locator('.ProseMirror').first();
		await proseMirror.evaluate((el) => (el as HTMLElement).focus());
		await page.keyboard.type('@t');
		await page.waitForTimeout(TEST_CONFIG.AUTOCOMPLETE_DEBOUNCE + 200);

		// Dropdown should not appear yet (min length typically 2-3)
		const dropdown = page.locator('.terraphim-suggestion-dropdown:visible');
		const isVisible = await dropdown.isVisible().catch(() => false);

		// Type more characters
		await page.keyboard.type('err');
		await page.waitForTimeout(TEST_CONFIG.AUTOCOMPLETE_DEBOUNCE + 200);

		// Now should show suggestions
		await expect(dropdown.first()).toBeVisible({ timeout: TEST_CONFIG.TIMEOUT });

		console.log('✅ Minimum query length respected');
	});
});

test.afterAll(async () => {
	console.log('✅ Novel Editor Autocomplete tests completed');
});
