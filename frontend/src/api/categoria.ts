import { API_URL } from "../utils/constants";

export async function getCategoriesApi() {
  try {
    const response = await fetch(`${API_URL}/categorias`);

    const result = await response.json();
    return result;
  } catch (_error) {
    return null;
  }
}
