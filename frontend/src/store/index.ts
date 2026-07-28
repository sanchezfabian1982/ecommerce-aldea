import { defineStore } from "pinia";

export const useUiStore = defineStore("ui", {
  state: () => ({
    showCarrito: false,
  }),
  actions: {
    setShowCarrito(payload: boolean) {
      this.showCarrito = payload;
    },
  },
});
