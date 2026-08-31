import {defineStore} from "pinia";

interface AppState {
  sidebar: {
    opened: boolean
  }
}

export const useAppStore = defineStore("app", {
  state: (): AppState => ({
    sidebar: {
      opened: true,
    },
  }),
  actions: {
    toggleSidebar() {
      this.sidebar.opened = !this.sidebar.opened;
    },
  },
});
