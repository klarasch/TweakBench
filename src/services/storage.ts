import type { AppState } from '../types.ts';

const STORAGE_KEY = 'tweakbench_data';

export const storageService = {
    async save(data: Partial<AppState>): Promise<void> {
        await chrome.storage.local.set({ [STORAGE_KEY]: data });
    },

    async load(): Promise<Partial<AppState>> {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        return result[STORAGE_KEY] || {};
    },

    async clear(): Promise<void> {
        await chrome.storage.local.remove(STORAGE_KEY);
    }
};
