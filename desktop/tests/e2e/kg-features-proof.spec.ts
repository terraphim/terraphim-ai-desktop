import { expect, test } from '@playwright/test';

test.describe('KG Features Proof', () => {
	test('web mode supports KG search and editor autocomplete', async ({ page }) => {
		await page.goto('/');

		const kgInput = page.getByTestId('kg-search-input');
		await expect(kgInput).toBeVisible();

		await kgInput.fill('rust');
		await expect(page.getByTestId('kg-autocomplete-list')).toBeVisible();
		const firstKgSuggestion = page.getByTestId('kg-autocomplete-item').first();
		await expect(firstKgSuggestion).toBeVisible();
		await firstKgSuggestion.click();

		const firstResultTitle = page.getByTestId('search-result-title').first();
		await expect(firstResultTitle).toBeVisible();
		await firstResultTitle.evaluate((element: HTMLElement) => element.click());

		await expect(page.locator('[data-testid="article-modal"]:visible').first()).toBeVisible();

		const articleViewer = page.locator('[data-testid="article-content-viewer"]:visible').first();
		await expect(articleViewer).toBeVisible();

		await articleViewer.dblclick();

		const editor = page.locator('[data-testid="novel-editor"]:visible').first();
		await expect(editor).toBeVisible({ timeout: 15000 });

		const status = page.locator('[data-testid="autocomplete-status"]:visible').first();
		await expect(status).toContainText('Ready', { timeout: 15000 });

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

		await page.keyboard.type('@rust');

		const suggestionDropdown = page.locator('.terraphim-suggestion-dropdown:visible').first();
		await expect(suggestionDropdown).toBeVisible({ timeout: 15000 });
		await expect(page.locator('.terraphim-suggestion-item:visible').first()).toBeVisible();
	});
});
