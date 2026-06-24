import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsState {
  downloadQuality: 'High' | 'Medium' | 'Low';
  setDownloadQuality: (quality: 'High' | 'Medium' | 'Low') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      downloadQuality: 'Medium',
      setDownloadQuality: (quality) => set({ downloadQuality: quality }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
