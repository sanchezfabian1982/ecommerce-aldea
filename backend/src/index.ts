import type { Core } from "@strapi/strapi";

function enablePermission(
  permissions: Record<
    string,
    {
      controllers?: Record<
        string,
        Record<string, { enabled: boolean; policy: string }>
      >;
    }
  >,
  action: string,
): void {
  const [typeName, controllerName, actionName] = action.split(".");

  if (!typeName || !controllerName || !actionName) {
    return;
  }

  const typePermissions = permissions[typeName];
  const controllerPermissions = typePermissions?.controllers?.[controllerName];

  if (!controllerPermissions || !controllerPermissions[actionName]) {
    return;
  }

  controllerPermissions[actionName].enabled = true;
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const roleService = strapi.service("plugin::users-permissions.role");
    const roles = await roleService.find();
    const authenticatedRole = roles.find(
      (role: { type?: string }) => role.type === "authenticated",
    );

    if (!authenticatedRole) {
      return;
    }

    const roleDetail = await roleService.findOne(authenticatedRole.id);
    const permissions = roleDetail.permissions as Record<
      string,
      {
        controllers?: Record<
          string,
          Record<string, { enabled: boolean; policy: string }>
        >;
      }
    >;

    [
      "api::pedido.pedido.create",
      "api::pedido.pedido.find",
      "api::pedido.pedido.findOne",
      "api::pedido.pedido.update",
      "api::producto.producto.applyOrderInventory",
      "api::producto.producto.create",
      "api::producto.producto.update",
      "api::producto.producto.delete",
      "api::producto.producto.find",
      "api::producto.producto.findOne",
      "plugin::users-permissions.user.updateMe",
      "plugin::upload.content-api.upload",
    ].forEach((action) => {
      enablePermission(permissions, action);
    });

    await roleService.updateRole(authenticatedRole.id, {
      name: roleDetail.name,
      description: roleDetail.description,
      permissions,
    });
  },
};
