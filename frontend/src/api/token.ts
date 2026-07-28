import { ref } from "vue";
import { TOKEN } from "@/utils/constants";

export const tokenState = ref<string | null>(getTokenApi());

function setTokenState(token: string | null): void {
  tokenState.value = token;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", () => {
    setTokenState(getTokenApi());
  });
}

export function setTokenApi(token: string): void {
  localStorage.setItem(TOKEN, token);
  setTokenState(token);
}

export function getTokenApi(): string | null {
  return localStorage.getItem(TOKEN);
}

export function removeTokenApi(): void {
  localStorage.removeItem(TOKEN);
  setTokenState(null);
}
