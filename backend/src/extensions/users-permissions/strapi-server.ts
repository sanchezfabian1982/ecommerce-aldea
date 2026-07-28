type UserProfilePayload = {
  nombre?: string;
  email?: string;
  telefono?: string;
};

type PluginShape = {
  controllers?: Record<string, Record<string, unknown>>;
  routes?: {
    "content-api"?: {
      routes: Array<{
        method: string;
        path: string;
        handler: string;
        config?: Record<string, unknown>;
      }>;
    };
  };
};

function sanitizeProfilePayload(body: unknown): UserProfilePayload {
  const source =
    body && typeof body === "object" && "data" in body
      ? (body as { data?: unknown }).data
      : body;

  if (!source || typeof source !== "object") {
    return {};
  }

  const payload = source as UserProfilePayload;
  const nombre =
    typeof payload.nombre === "string" ? payload.nombre.trim() : "";
  const email =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const telefono =
    typeof payload.telefono === "string"
      ? payload.telefono.replace(/\D/g, "")
      : "";

  return {
    nombre,
    email,
    telefono,
  };
}

function serializeUserProfile(user: Record<string, unknown> | null) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    nombre: user.nombre,
    telefono: user.telefono,
    rol_tienda: user.rol_tienda,
  };
}

export default (plugin: PluginShape) => {
  if (!plugin.controllers?.user) {
    return plugin;
  }

  const updateMe = async (ctx: {
    state: { user?: { id?: number | string } };
    request: { body: unknown };
    body?: unknown;
    unauthorized: (message?: string) => unknown;
    badRequest: (message?: string) => unknown;
  }) => {
    const authUser = ctx.state.user;

    if (!authUser?.id) {
      return ctx.unauthorized("Debes iniciar sesion para actualizar tu perfil");
    }

    const { nombre, email, telefono } = sanitizeProfilePayload(
      ctx.request.body,
    );

    if (!nombre || !email) {
      return ctx.badRequest("Debes completar nombre y correo");
    }

    if (telefono && !/^\d{10}$/.test(telefono)) {
      return ctx.badRequest("El telefono debe tener exactamente 10 digitos");
    }

    const existingUser = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({
        where: { email },
      });

    if (existingUser && String(existingUser.id) !== String(authUser.id)) {
      return ctx.badRequest("El correo ya esta registrado por otra cuenta");
    }

    const updatedUser = await strapi.db
      .query("plugin::users-permissions.user")
      .update({
        where: { id: authUser.id },
        data: {
          nombre,
          email,
          username: email,
          telefono: telefono || null,
        },
      });

    ctx.body = serializeUserProfile(
      updatedUser as Record<string, unknown> | null,
    );
  };

  (updateMe as unknown as Record<PropertyKey, unknown>)[
    Symbol.for("__type__")
  ] = ["content-api"];

  plugin.controllers.user.updateMe = updateMe;

  const contentApiRoutes = plugin.routes?.["content-api"]?.routes;

  if (Array.isArray(contentApiRoutes)) {
    const hasRoute = contentApiRoutes.some(
      (route) => route.method === "PUT" && route.path === "/users/me",
    );

    if (!hasRoute) {
      contentApiRoutes.unshift({
        method: "PUT",
        path: "/users/me",
        handler: "user.updateMe",
        config: {
          prefix: "",
        },
      });
    }
  }

  return plugin;
};
