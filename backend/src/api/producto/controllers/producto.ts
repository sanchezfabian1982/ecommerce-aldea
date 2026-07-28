/**
 * producto controller
 */

import type { Core } from "@strapi/strapi";
import { factories } from "@strapi/strapi";

function getVendedoraNombre(producto: {
  vendedora?: {
    id?: number | string;
    nombre?: string;
    username?: string;
    email?: string;
  } | null;
}) {
  return (
    producto.vendedora?.nombre ??
    producto.vendedora?.username ??
    producto.vendedora?.email ??
    "Vendedora no disponible"
  );
}

function getVendedoraId(producto: {
  vendedora?: { id?: number | string } | null;
}) {
  return producto.vendedora?.id ?? null;
}

function getProductoWhereClause(params: {
  documentId?: string;
  id?: string | number;
}) {
  if (typeof params.documentId === "string" && params.documentId.trim()) {
    return { documentId: params.documentId.trim() };
  }

  if (typeof params.id === "number" && Number.isFinite(params.id)) {
    return { id: params.id };
  }

  if (typeof params.id === "string" && params.id.trim()) {
    const normalizedId = params.id.trim();
    const parsedId = Number(normalizedId);

    if (Number.isFinite(parsedId)) {
      return { id: parsedId };
    }

    return { documentId: normalizedId };
  }

  return null;
}

async function findProductoByParams(
  strapi: Core.Strapi,
  params: { documentId?: string; id?: string | number },
) {
  const where = getProductoWhereClause(params);

  if (!where) {
    return null;
  }

  return strapi.db.query("api::producto.producto").findOne({
    where,
    populate: ["categoria", "imagen", "vendedora"],
  });
}

function isProductoOwner(
  producto: { vendedora?: { id?: number | string } | null },
  userId: number | string,
) {
  const ownerId = producto.vendedora?.id;

  if (ownerId == null) {
    return false;
  }

  return String(ownerId) === String(userId);
}

function serializeProducto(producto: Record<string, unknown>) {
  return {
    ...producto,
    vendedoraNombre: getVendedoraNombre(producto),
    vendedoraId: getVendedoraId(producto),
  };
}

type OrderInventoryItem = {
  id?: number | string;
  cantidad?: number;
};

async function enrichProductosWithVendedora(
  strapi: Core.Strapi,
  productos: Record<string, unknown>[] | Record<string, unknown> | null,
) {
  if (!productos) {
    return productos;
  }

  const list = Array.isArray(productos) ? productos : [productos];
  const ids = list
    .map((producto) => producto.id)
    .filter((id): id is number => typeof id === "number");

  if (ids.length === 0) {
    return productos;
  }

  const productosConVendedora = await strapi.db
    .query("api::producto.producto")
    .findMany({
      where: { id: { $in: ids } },
      populate: ["vendedora"],
    });

  const nombresPorId = new Map(
    productosConVendedora.map((producto) => [
      producto.id,
      {
        vendedoraNombre: getVendedoraNombre(producto),
        vendedoraId: getVendedoraId(producto),
      },
    ]),
  );

  const enriched = list.map((producto) => ({
    ...producto,
    vendedoraNombre:
      nombresPorId.get(producto.id as number)?.vendedoraNombre ??
      "Vendedora no disponible",
    vendedoraId: nombresPorId.get(producto.id as number)?.vendedoraId ?? null,
  }));

  return Array.isArray(productos) ? enriched : enriched[0];
}

export default factories.createCoreController(
  "api::producto.producto",
  ({ strapi }) => ({
    async find(ctx) {
      const isMineQuery =
        ctx.query.mine === true ||
        ctx.query.mine === "true" ||
        ctx.query.mine === 1 ||
        ctx.query.mine === "1";

      if (isMineQuery) {
        const authUser = ctx.state.user;

        if (!authUser?.id) {
          return ctx.unauthorized(
            "Debes iniciar sesion para consultar tus productos",
          );
        }

        const user = await strapi.db
          .query("plugin::users-permissions.user")
          .findOne({
            where: { id: authUser.id },
          });

        if (!user || user.rol_tienda !== "vendedora") {
          return ctx.forbidden(
            "Solo una vendedora puede consultar sus productos",
          );
        }

        const rawLimit =
          typeof ctx.query.pagination === "object" &&
          ctx.query.pagination !== null &&
          "limit" in ctx.query.pagination
            ? Number(ctx.query.pagination.limit)
            : null;
        const limit =
          rawLimit != null && Number.isFinite(rawLimit) && rawLimit > 0
            ? rawLimit
            : 1000;

        const productLinks = await strapi.db
          .connection("productos_vendedora_lnk")
          .select("producto_id")
          .where("user_id", authUser.id)
          .limit(limit);
        const productoIds = productLinks
          .map((row: { producto_id?: number }) => row.producto_id)
          .filter((id): id is number => typeof id === "number");

        if (productoIds.length === 0) {
          return {
            data: [],
            meta: {
              pagination: {
                page: 1,
                pageSize: 0,
                pageCount: 0,
                total: 0,
              },
            },
          };
        }

        const productos = await strapi.db
          .query("api::producto.producto")
          .findMany({
            where: {
              id: {
                $in: productoIds,
              },
            },
            populate: ["categoria", "imagen", "vendedora"],
            orderBy: {
              createdAt: "desc",
            },
            limit,
          });

        return {
          data: (await enrichProductosWithVendedora(
            strapi,
            productos as Record<string, unknown>[],
          )) as typeof productos,
          meta: {
            pagination: {
              page: 1,
              pageSize: productos.length,
              pageCount: productos.length > 0 ? 1 : 0,
              total: productos.length,
            },
          },
        };
      }

      const response = await super.find(ctx);

      response.data = (await enrichProductosWithVendedora(
        strapi,
        response.data as Record<string, unknown>[] | null,
      )) as typeof response.data;

      return response;
    },

    async findOne(ctx) {
      const response = await super.findOne(ctx);

      response.data = (await enrichProductosWithVendedora(
        strapi,
        response.data as Record<string, unknown> | null,
      )) as typeof response.data;

      return response;
    },

    async applyOrderInventory(ctx) {
      const authUser = ctx.state.user;

      if (!authUser?.id) {
        return ctx.unauthorized(
          "Debes iniciar sesion para actualizar el inventario",
        );
      }

      const body = ctx.request.body as {
        items?: OrderInventoryItem[];
      };

      const items = Array.isArray(body.items) ? body.items : [];

      if (items.length === 0) {
        return ctx.badRequest(
          "No se recibieron productos para actualizar stock",
        );
      }

      const normalizedItems = items
        .map((item) => {
          const rawId = item.id;
          const parsedId =
            typeof rawId === "number"
              ? rawId
              : typeof rawId === "string"
                ? Number(rawId.trim())
                : NaN;
          const cantidad =
            typeof item.cantidad === "number" ? item.cantidad : NaN;

          if (
            !Number.isFinite(parsedId) ||
            !Number.isFinite(cantidad) ||
            cantidad <= 0
          ) {
            return null;
          }

          return {
            id: parsedId,
            cantidad,
          };
        })
        .filter(
          (
            item,
          ): item is {
            id: number;
            cantidad: number;
          } => item !== null,
        );

      if (normalizedItems.length === 0) {
        return ctx.badRequest("Los productos recibidos son invalidos");
      }

      const updatedProducts = [] as Record<string, unknown>[];

      for (const item of normalizedItems) {
        const producto = await strapi.db
          .query("api::producto.producto")
          .findOne({
            where: { id: item.id },
            populate: ["categoria", "imagen", "vendedora"],
          });

        if (!producto) {
          return ctx.notFound(`Producto no encontrado: ${item.id}`);
        }

        const currentStock =
          typeof producto.stock === "number"
            ? producto.stock
            : typeof producto.stock === "string"
              ? Number(producto.stock)
              : 0;

        if (!Number.isFinite(currentStock) || currentStock < item.cantidad) {
          return ctx.badRequest(
            `Stock insuficiente para el producto ${producto.nombre ?? item.id}`,
          );
        }

        await strapi.db.query("api::producto.producto").update({
          where: { id: item.id },
          data: {
            stock: currentStock - item.cantidad,
          },
        });

        const updatedProduct = await strapi.db
          .query("api::producto.producto")
          .findOne({
            where: { id: item.id },
            populate: ["categoria", "imagen", "vendedora"],
          });

        if (updatedProduct) {
          updatedProducts.push(serializeProducto(updatedProduct));
        }
      }

      ctx.body = {
        data: updatedProducts,
      };
    },

    async update(ctx) {
      const authUser = ctx.state.user;

      if (!authUser?.id) {
        return ctx.unauthorized(
          "Debes iniciar sesion para actualizar productos",
        );
      }

      const user = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: { id: authUser.id },
        });

      if (!user || user.rol_tienda !== "vendedora") {
        return ctx.forbidden("Solo una vendedora puede actualizar productos");
      }

      const productoActual = await findProductoByParams(strapi, ctx.params);

      if (!productoActual) {
        return ctx.notFound("Producto no encontrado");
      }

      if (!isProductoOwner(productoActual, authUser.id)) {
        return ctx.forbidden("Solo puedes actualizar tus propios productos");
      }

      const body = ctx.request.body as {
        data?: {
          nombre?: string;
          Descripcion?: unknown;
          precio?: number;
          stock?: number;
          categoriaDocumentId?: string;
          imageId?: number | string;
        };
      };

      const data = body.data;

      if (!data) {
        return ctx.badRequest(
          "No se recibieron datos para actualizar el producto",
        );
      }

      const updateData: Record<string, unknown> = {};

      if (typeof data.nombre === "string") {
        const nombre = data.nombre.trim();

        if (!nombre) {
          return ctx.badRequest("El nombre del producto es obligatorio");
        }

        updateData.nombre = nombre;
      }

      if (data.Descripcion !== undefined) {
        if (!Array.isArray(data.Descripcion)) {
          return ctx.badRequest("La descripcion del producto es invalida");
        }

        updateData.Descripcion = data.Descripcion;
      }

      if (data.precio !== undefined) {
        if (
          typeof data.precio !== "number" ||
          !Number.isFinite(data.precio) ||
          data.precio < 0
        ) {
          return ctx.badRequest("El precio del producto es invalido");
        }

        updateData.precio = data.precio;
      }

      if (data.stock !== undefined) {
        if (
          typeof data.stock !== "number" ||
          !Number.isFinite(data.stock) ||
          data.stock < 0
        ) {
          return ctx.badRequest("El stock del producto es invalido");
        }

        updateData.stock = data.stock;
      }

      if (typeof data.categoriaDocumentId === "string") {
        const categoriaDocumentId = data.categoriaDocumentId.trim();

        if (!categoriaDocumentId) {
          return ctx.badRequest("La categoria seleccionada es invalida");
        }

        const categoria = await strapi.db
          .query("api::categoria.categoria")
          .findOne({
            where: { documentId: categoriaDocumentId },
          });

        if (!categoria) {
          return ctx.badRequest("La categoria seleccionada no existe");
        }

        updateData.categoria = categoria.id;
      }

      if (data.imageId !== undefined) {
        if (
          (typeof data.imageId !== "number" &&
            typeof data.imageId !== "string") ||
          String(data.imageId).trim().length === 0
        ) {
          return ctx.badRequest("La imagen seleccionada es invalida");
        }

        updateData.imagen = data.imageId;
      }

      if (Object.keys(updateData).length === 0) {
        return ctx.badRequest("No hay cambios para actualizar el producto");
      }

      const where = getProductoWhereClause(ctx.params);

      if (!where) {
        return ctx.badRequest("No se encontro el identificador del producto");
      }

      await strapi.db.query("api::producto.producto").update({
        where,
        data: updateData,
      });

      const productoCompleto = await findProductoByParams(strapi, ctx.params);

      if (!productoCompleto) {
        return ctx.notFound("Producto no encontrado");
      }

      ctx.body = {
        data: serializeProducto(productoCompleto),
      };
    },

    async delete(ctx) {
      const authUser = ctx.state.user;

      if (!authUser?.id) {
        return ctx.unauthorized("Debes iniciar sesion para eliminar productos");
      }

      const user = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: { id: authUser.id },
        });

      if (!user || user.rol_tienda !== "vendedora") {
        return ctx.forbidden("Solo una vendedora puede eliminar productos");
      }

      const productoActual = await findProductoByParams(strapi, ctx.params);

      if (!productoActual) {
        return ctx.notFound("Producto no encontrado");
      }

      if (!isProductoOwner(productoActual, authUser.id)) {
        return ctx.forbidden("Solo puedes eliminar tus propios productos");
      }

      const where = getProductoWhereClause(ctx.params);

      if (!where) {
        return ctx.badRequest("No se encontro el identificador del producto");
      }

      await strapi.db.query("api::producto.producto").delete({
        where,
      });

      ctx.body = {
        data: {
          id: productoActual.id,
          documentId: productoActual.documentId,
        },
      };
    },

    async create(ctx) {
      const authUser = ctx.state.user;

      if (!authUser?.id) {
        return ctx.unauthorized("Debes iniciar sesion para publicar productos");
      }

      const body = ctx.request.body as {
        data?: {
          nombre?: string;
          Descripcion?: unknown;
          precio?: number;
          stock?: number;
          categoriaDocumentId?: string;
          imageId?: number | string;
        };
      };

      const data = body.data;

      if (!data?.nombre || !data.categoriaDocumentId || !data.imageId) {
        return ctx.badRequest(
          "Faltan datos obligatorios para crear el producto",
        );
      }

      const user = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: { id: authUser.id },
        });

      if (!user || user.rol_tienda !== "vendedora") {
        return ctx.forbidden("Solo una vendedora puede publicar productos");
      }

      const categoria = await strapi.db
        .query("api::categoria.categoria")
        .findOne({
          where: { documentId: data.categoriaDocumentId },
        });

      if (!categoria) {
        return ctx.badRequest("La categoria seleccionada no existe");
      }

      const productoCreado = await strapi.db
        .query("api::producto.producto")
        .create({
          data: {
            nombre: data.nombre.trim(),
            Descripcion: Array.isArray(data.Descripcion)
              ? data.Descripcion
              : [],
            precio: data.precio ?? 0,
            stock: data.stock ?? 0,
            categoria: categoria.id,
            vendedora: user.id,
            imagen: data.imageId,
            publishedAt: new Date().toISOString(),
          },
        });

      const productoCompleto = await strapi.db
        .query("api::producto.producto")
        .findOne({
          where: { id: productoCreado.id },
          populate: ["categoria", "imagen", "vendedora"],
        });

      ctx.body = {
        data: serializeProducto(productoCompleto),
      };
    },
  }),
);
