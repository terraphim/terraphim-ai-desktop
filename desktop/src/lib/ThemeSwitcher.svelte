<script lang="ts">
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/tauri';
import { CONFIG } from '../config';
import type { Role as RoleInterface } from './generated/types';
import { detectTauriRuntime } from './runtime';
import { configStore, is_tauri, role, roles, theme, thesaurus, typeahead } from './stores';

interface ConfigResponse {
	status: string;
	config: {
		id: string;
		global_shortcut: string;
		roles: { [key: string]: RoleInterface };
		selected_role: string;
	};
}

let configURL = '';
export async function loadConfig() {
	try {
		is_tauri.set(detectTauriRuntime());
		if ($is_tauri) {
			console.log('Loading config from Tauri');
			invoke<ConfigResponse>('get_config')
				.then((res) => {
					console.log('get_config response', res);
					if (res && res.status === 'success') {
						updateStoresFromConfig(res.config);
					}
				})
				.catch((err) => {
					console.error('Error loading config from Tauri:', err);
				});
		} else {
			console.log('Loading config from REST API');
			// For web mode, load from API endpoint
			try {
				const response = await fetch(`${CONFIG.ServerURL}/config`);
				if (response.ok) {
					const data = await response.json();
					if (data.status === 'success') {
						updateStoresFromConfig(data.config);
					}
				}
			} catch (err) {
				console.error('Error loading config from API:', err);
			}
		}
	} catch (err) {
		console.error('Error in loadConfig:', err);
	}
}

function updateStoresFromConfig(config: ConfigResponse['config']) {
	// Update config store (generated types vs runtime shape can differ slightly)
	configStore.set(config as any);

	// Update roles store
	const roleArray = Object.entries(config.roles).map(([key, value]) => ({
		...value,
		name: key,
	}));
	roles.set(roleArray as any);

	// Do NOT derive theme from global_shortcut; use role theme instead.

	// Update selected role (handle both string and RoleName object)
	if ((config as any).selected_role) {
		const selected = (config as any).selected_role;
		const roleName = typeof selected === 'string' ? selected : (selected as any).original;
		role.set(roleName);

		// Update theme based on the selected role
		const selectedRoleSettings = config.roles[roleName];
		if (selectedRoleSettings && selectedRoleSettings.theme) {
			theme.set(selectedRoleSettings.theme);
		}

		// Enable typeahead (KG-aware search) when the role has a KG configured
		try {
			const kg = (selectedRoleSettings as any)?.kg;
			const hasLocal =
				Boolean(kg?.knowledge_graph_local?.path) &&
				String(kg.knowledge_graph_local.path).length > 0;
			const ap = kg?.automata_path as any | undefined;
			const hasAutomata =
				Boolean(ap?.Local && String(ap.Local).length > 0) ||
				Boolean(ap?.Remote && String(ap.Remote).length > 0);
			typeahead.set(Boolean(hasLocal || hasAutomata));
			void syncThesaurusForRole(roleName, Boolean(hasLocal || hasAutomata));
		} catch {
			typeahead.set(false);
			thesaurus.set({});
		}
	}
}

async function syncThesaurusForRole(roleName: string, enabled: boolean) {
	if (!enabled || !roleName) {
		thesaurus.set({});
		return;
	}

	try {
		if ($is_tauri) {
			const data = (await invoke('publish_thesaurus', { roleName })) as Record<string, any>;
			thesaurus.set(normalizeThesaurus(data));
			return;
		}

		const response = await fetch(`${CONFIG.ServerURL}/thesaurus/${encodeURIComponent(roleName)}`);
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const data = await response.json();
		thesaurus.set(normalizeThesaurus(data?.thesaurus ?? {}));
	} catch (error) {
		console.error(`Error loading thesaurus for role ${roleName}:`, error);
		thesaurus.set({});
	}
}

function normalizeThesaurus(
	data: Record<string, any> | null | undefined
): Record<string, string> {
	if (!data || typeof data !== 'object') {
		return {};
	}

	return Object.fromEntries(
		Object.entries(data).map(([key, value]) => [
			key,
			typeof value === 'string' ? value : value?.value || value?.term || String(value ?? ''),
		])
	);
}

export async function saveConfig(config: any) {
	try {
		if ($is_tauri) {
			console.log('Saving config to Tauri');
			const response = await invoke('update_config', { configNew: config });
			console.log('update_config response', response);
			return response;
		} else {
			console.log('Saving config to REST API');
			const response = await fetch(`${CONFIG.ServerURL}/config`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(config),
			});
			const data = await response.json();
			console.log('save config API response', data);
			return data;
		}
	} catch (err) {
		console.error('Error saving config:', err);
		throw err;
	}
}

// Theme switching functionality
export function switchTheme(newTheme: string) {
	theme.set(newTheme);
	// For web mode, theme is handled by CSS variables
}

// Listen for theme changes from Tauri backend
$effect(() => {
	if ($is_tauri) {
		// Listen for theme changes
		listen('theme-changed', (event: any) => {
			theme.set(event.payload);
		});

		// Listen for role changes from system tray
		listen('role_changed', (event: any) => {
			console.log('Role changed event received from system tray:', event.payload);
			updateStoresFromConfig(event.payload);
		});
	}
	// Load config on mount
	initializeConfig();
});

async function initializeConfig() {
	await loadConfig();
}

function updateRole(event: Event) {
	const target = event.currentTarget as HTMLSelectElement;
	const newRoleName = target.value;
	console.log('Role change requested:', newRoleName);

	// Persist the newly selected role
	role.set(newRoleName);

	// Find role settings
	const roleSettings = $roles.find((r) => {
		const roleName = typeof r.name === 'string' ? r.name : r.name.original;
		return roleName === newRoleName;
	});
	if (!roleSettings) {
		console.error(`No role settings found for role: ${newRoleName}.`);
		return;
	}

	const newTheme = roleSettings.theme || 'spacelab';
	theme.set(newTheme);
	console.log(`Theme changed to ${newTheme}`);

	// Toggle typeahead based on the newly selected role's KG configuration
	try {
		const kg = (roleSettings as any)?.kg;
		const hasLocal =
			Boolean(kg?.knowledge_graph_local?.path) && String(kg.knowledge_graph_local.path).length > 0;
		const ap = kg?.automata_path as any | undefined;
		const hasAutomata =
			Boolean(ap?.Local && String(ap.Local).length > 0) ||
			Boolean(ap?.Remote && String(ap.Remote).length > 0);
		typeahead.set(Boolean(hasLocal || hasAutomata));
		void syncThesaurusForRole(newRoleName, Boolean(hasLocal || hasAutomata));
	} catch {
		typeahead.set(false);
		thesaurus.set({});
	}

	// Update selected role in config
	configStore.update((cfg) => {
		(cfg as any).selected_role = newRoleName;
		return cfg;
	});

	// In Tauri, notify the backend
	if ($is_tauri) {
		invoke('select_role', { roleName: newRoleName }).catch((e) =>
			console.error('Error selecting role:', e)
		);
	} else {
		fetch(`${CONFIG.ServerURL}/config/selected_role`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ selected_role: newRoleName }),
		}).catch((error) => console.error('Error updating config on server:', error));
	}
}
</script>

<div class="field is-grouped is-grouped-right">
	<div class="control">
		<div class="select">
			<select value={$role} on:change={updateRole} data-testid="role-selector">
				{#each $roles as r}
					{@const roleName = typeof r.name === 'string' ? r.name : r.name.original}
					<option value={roleName}>{roleName}</option>
				{/each}
			</select>
		</div>
	</div>
</div>
