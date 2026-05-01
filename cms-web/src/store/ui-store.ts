import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  activeModal: string | null;
  modalProps: Record<string, any>;
  isMobile: boolean;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openModal: (name: string, props?: Record<string, any>) => void;
  closeModal: () => void;
  setIsMobile: (mobile: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activeModal: null,
  modalProps: {},
  isMobile: false,

  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  openModal: (name, props = {}) => set({ activeModal: name, modalProps: props }),
  closeModal: () => set({ activeModal: null, modalProps: {} }),
  setIsMobile: (mobile) => set({ isMobile: mobile }),
}));
