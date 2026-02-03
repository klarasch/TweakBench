import type { AppState } from '../types.ts';

const STORAGE_KEY = 'tweakbench_data';

const isExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

export const storageService = {
    async save(data: Partial<AppState>): Promise<void> {
        if (isExtension) {
            await chrome.storage.local.set({ [STORAGE_KEY]: data });
        } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
    },

    async load(): Promise<Partial<AppState>> {
        if (isExtension) {
            const result = await chrome.storage.local.get(STORAGE_KEY);
            return result[STORAGE_KEY] || {};
        } else {
            const item = localStorage.getItem(STORAGE_KEY);
            return item ? JSON.parse(item) : {};
        }
    },

    async clear(): Promise<void> {
        if (isExtension) {
            await chrome.storage.local.remove(STORAGE_KEY);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }
};
