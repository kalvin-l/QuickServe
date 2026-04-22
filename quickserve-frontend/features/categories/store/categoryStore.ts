/**
 * Category Store using Zustand
 *
 * Centralized category state management
 */

import { create } from 'zustand';
import type { Category } from '@/types';

interface CategoryStore {
  categories: Category[];
  activeCategoryId: string;
  setActiveCategory: (id: string) => void;
  setCategories: (categories: Category[]) => void;
  getActiveCategory: () => Category | undefined;
}

export const useCategoryStore = create<CategoryStore>((set, get) => ({
  categories: [],
  activeCategoryId: 'all',

  setActiveCategory: (id: string) => {
    set((state) => ({
      activeCategoryId: id,
      categories: state.categories.map((cat) => ({
        ...cat,
        active: cat.id === id,
      })),
    }));
  },

  setCategories: (categories: Category[]) => {
    set({ categories });
  },

  getActiveCategory: () => {
    const state = get();
    return state.categories.find((cat) => cat.id === state.activeCategoryId);
  },
}));
