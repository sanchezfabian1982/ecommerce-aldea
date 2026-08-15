import { API_URL } from "@/utils/constants";
import { getTokenApi } from "@/api/token";

interface RegistroFormData {
  nombre: string;
  correo: string;
  contrasena: string;
  rol_tienda: "cliente" | "vendedora";
}

interface LoginFormData {
  correo: string;
  contrasena: string;
}

interface AuthResponse {
  jwt: string;
}

export interface UpdateProfileFormData {
  nombre: string;
  correo: string;
  telefono: string;
}

export const USER_PROFILE_UPDATED_EVENT = "user-profile-updated";

export interface AuthUser {
  id: number | string;
  nombre?: string;
  username?: string;
  email?: string;
  telefono?: string;
  rol_tienda?: "cliente" | "vendedora";
}

export async function registroApi(
  formData: RegistroFormData,
): Promise<unknown> {
  const url = `${API_URL}/auth/local/register`;
  const nombre = formData.nombre.trim();
  const email = formData.correo.trim().toLowerCase();
  const payload = {
    // En Strapi, username debe ser unico. Usar email evita choques por nombres repetidos.
    username: email,
    nombre,
    email,
    password: formData.contrasena,
    rol_tienda: formData.rol_tienda,
  };

  const params: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  };

  const response = await fetch(url, params);
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const rawMessage =
      (result as { error?: { message?: string }; message?: string } | null)
        ?.error?.message ||
      (result as { message?: string } | null)?.message ||
      "";

    if (
      typeof rawMessage === "string" &&
      rawMessage.includes("Email or Username are already taken")
    ) {
      throw new Error("El correo ya esta registrado. Prueba con otro.");
    }

    throw new Error(rawMessage || "No se pudo registrar el usuario");
  }

  return result;
}

export async function loginApi(formData: LoginFormData): Promise<AuthResponse> {
  const url = `${API_URL}/auth/local`;
  const payload = {
    identifier: formData.correo.trim().toLowerCase(),
    password: formData.contrasena,
  };

  const params: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  };

  let response: Response;

  try {
    response = await fetch(url, params);
  } catch {
    throw new Error(
      "No fue posible conectarse al servidor. Verifica tu conexion o intenta nuevamente en unos minutos.",
    );
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const rawMessage =
      (result as { error?: { message?: string }; message?: string } | null)
        ?.error?.message ||
      (result as { message?: string } | null)?.message ||
      "";

    if (
      response.status === 400 ||
      response.status === 401 ||
      rawMessage.includes("Invalid identifier or password") ||
      rawMessage.includes("identifier or password")
    ) {
      throw new Error("Correo o contrasena incorrectos. Intenta nuevamente.");
    }

    throw new Error(rawMessage || "No se pudo iniciar sesión");
  }

  return result as AuthResponse;
}

export async function getCurrentUserApi(): Promise<AuthUser | null> {
  const token = getTokenApi();

  if (!token) {
    return null;
  }

  const response = await fetch(`${API_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    return null;
  }

  return result as AuthUser;
}

export async function updateCurrentUserApi(
  formData: UpdateProfileFormData,
): Promise<AuthUser> {
  const token = getTokenApi();

  if (!token) {
    throw new Error("Debes iniciar sesion para actualizar tu perfil");
  }

  const payload = {
    data: {
      nombre: formData.nombre.trim(),
      email: formData.correo.trim().toLowerCase(),
      telefono: formData.telefono.replace(/\D/g, ""),
    },
  };

  const response = await fetch(`${API_URL}/users/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const rawMessage =
      (result as { error?: { message?: string }; message?: string } | null)
        ?.error?.message ||
      (result as { message?: string } | null)?.message ||
      "";

    throw new Error(rawMessage || "No se pudo actualizar el perfil");
  }

  return result as AuthUser;
}
