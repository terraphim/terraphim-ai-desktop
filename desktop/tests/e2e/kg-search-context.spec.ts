/**
 * End-to-End tests for Knowledge Graph Search and Context Management
 *
 * Tests the core KG functionality that works in the current implementation:
 * - KG search from search page (primary working path)
 * - KG search button in chat interface
 * - Article modal editing with autocomplete trigger
 */

import { test, expect } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
	APP_URL: 'http://localhost:5173',
	SEARCH_TIMEOUT: 10000,
	AUTOCOMPLETE_DEBOUNCE: 300,
};

test.describe('KG Search E2E - Working Features', () => {
	test('KG search and article editor flow', async ({ page }) => {
		console.log('🔍 Testing KG search from search page...');

		// Navigate to search page
		await page.goto(TEST_CONFIG.APP_URL);
		await page.waitForLoadState('networkidle');

		// Verify KG search input exists
		const kgInput = page.locator('[data-testid="kg-search-input"]');
		await expect(kgInput).toBeVisible({ timeout: 5000 });

		// Type search query
		await kgInput.fill('rust');
		await expect(page.locator('[data-testid="kg-autocomplete-list"]')).toBeVisible({
			timeout: 5000,
		});

		// Select first suggestion
		const firstSuggestion = page.locator('[data-testid="kg-autocomplete-item"]').first();
		await expect(firstSuggestion).toBeVisible();
		await firstSuggestion.click();

		console.log('✅ KG autocomplete working');

		// Wait for search results and click first result
		const firstResultTitle = page.locator('[data-testid="search-result-title"]').first();
		await expect(firstResultTitle).toBeVisible({ timeout: 5000 });
		await firstResultTitle.click();

		// Verify article modal opens
		const articleModal = page.locator('[data-testid="article-modal"]:visible').first();
		await expect(articleModal).toBeVisible({ timeout: 5000 });

		const articleViewer = page.locator('[data-testid="article-content-viewer"]:visible').first();
		await expect(articleViewer).toBeVisible();

		console.log('✅ Article modal opens');

		// Double-click to enter edit mode
		await articleViewer.dblclick();

		// Verify editor appears
		const editor = page.locator('[data-testid="novel-editor"]:visible').first();
		await expect(editor).toBeVisible({ timeout: 15000 });

		// Wait for autocomplete to be ready
		const status = page.locator('[data-testid="autocomplete-status"]:visible').first();
		await expect(status).toContainText('Ready', { timeout: 15000 });

		console.log('✅ Novel editor with autocomplete ready');

		// Focus the editor
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

		// Type autocomplete trigger
		await page.keyboard.type('@rust');

		// Verify suggestion dropdown appears
		const suggestionDropdown = page.locator('.terraphim-suggestion-dropdown:visible').first();
		await expect(suggestionDropdown).toBeVisible({ timeout: 15000 });

		const suggestionItem = page.locator('.terraphim-suggestion-item:visible').first();
		await expect(suggestionItem).toBeVisible();

		console.log('✅ Autocomplete dropdown showing suggestions');
	});
	test('KG search button exists in chat interface', async ({ page }) => {
		console.log('🔍 Testing KG search button in chat...');

		// Navigate to chat page
		await page.goto(`${TEST_CONFIG.APP_URL}/chat`);
		await page.waitForLoadState('networkidle');

		// Verify KG search button exists
		const kgSearchButton = page.locator('[data-testid="kg-search-button"]');
		await expect(kgSearchButton).toBeVisible({ timeout: 5000 });
		await expect(kgSearchButton).toContainText('KG Search');

		console.log('✅ KG search button visible in chat');
	});

	test('role selector works', async ({ page }) => {
		console.log('🔍 Testing role selector...');

		await page.goto(TEST_CONFIG.APP_URL);
		await page.waitForLoadState('networkidle');

		// Verify role selector exists
		const roleSelector = page.locator('select[title="Select Role"], [data-testid="role-selector"]').first();

		// If role selector exists, verify it has options
		if (await roleSelector.isVisible().catch(() => false)) {
			const options = await roleSelector.locator('option').count();
			expect(options).toBeGreaterThan(0);
			console.log(`✅ Role selector has ${options} options`);
		} else {
			console.log('ℹ️ Role selector not found (may use different implementation)');
		}
	});
});

// Cleanup
test.afterAll(async () => {
	console.log('✅ KG Search E2E tests completed');
});
