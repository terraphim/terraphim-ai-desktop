export function detectTauriRuntime(): boolean {
	if (typeof window === 'undefined') {
		return false;
	}

	const runtimeWindow = window as typeof window & {
		__TAURI__?: unknown;
		__TAURI_INTERNALS__?: unknown;
		__TAURI_IPC__?: unknown;
	};

	return Boolean(
		runtimeWindow.__TAURI__ !== undefined ||
			runtimeWindow.__TAURI_INTERNALS__ !== undefined ||
			runtimeWindow.__TAURI_IPC__ !== undefined
	);
}
