import { create } from 'zustand';
import type { SearchResultVO } from '@/types';
import { searchArticles } from '@/api/search';

interface SearchState {
  keyword: string;
  results: SearchResultVO[];
  isSearching: boolean;
  showDropdown: boolean;

  search: (keyword: string, portalMode?: boolean) => Promise<void>;
  clearSearch: () => void;
  setShowDropdown: (show: boolean) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  keyword: '',
  results: [],
  isSearching: false,
  showDropdown: false,

  search: async (keyword: string, portalMode = false) => {
    set({ keyword, isSearching: true });
    try {
      const results = await searchArticles(keyword, portalMode) as unknown as SearchResultVO[];
      set({ results, isSearching: false, showDropdown: true });
    } catch {
      set({ isSearching: false });
    }
  },

  clearSearch: () => set({ keyword: '', results: [], showDropdown: false }),
  setShowDropdown: (show) => set({ showDropdown: show }),
}));
