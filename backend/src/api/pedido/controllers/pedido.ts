/**
 * pedido controller
 */

import type { Core } from "@strapi/strapi";
import { factories } from "@strapi/strapi";

type PedidoEstadoDespacho =
  | "pendiente"
  | "en_preparacion"
  | "despachado"
  | "entregado";

type PedidoMetodoPago = "deposito_bancario" | "transferencia";
type PedidoEstadoPago = "pendiente_verificacion" | "aprobado" | "rechazado";

type PedidoItemPayload = {
  productoId?: number | string;
  cantidad?: number;
};

type PedidoBody = {
  data?: {
    vendedoraId?: number | string;
    direccion_entrega?: string;
    telefono_contacto?: string;
    items?: PedidoItemPayload[];
    metodo_pago?: PedidoMetodoPago;
    estado_pago?: PedidoEstadoPago;
    comprobante_pago?: number | string;
    observacion_pago?: string;
    estado_despacho?: PedidoEstadoDespacho;
    nota_despacho?: string;
  };
};

const NEXT_ESTADO: Record<PedidoEstadoDespacho, PedidoEstadoDespacho | null> = {
  pendiente: "en_preparacion",
  en_preparacion: "despachado",
  despachado: "entregado",
  entregado: null,
};

function normalizeId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function getPedidoWhereClause(params: {
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

async function findPedidoByParams(
  strapi: Core.Strapi,
  params: { documentId?: string; id?: string | number },
) {
  const where = getPedidoWhereClause(params);

  if (!where) {
    return null;
  }

  return strapi.db.query("api::pedido.pedido").findOne({
    where,
    populate: ["cliente", "vendedora", "productos", "comprobante_pago"],
  });
}

function getDisplayUserName(
  user?: {
    nombre?: string;
    username?: string;
    email?: string;
  } | null,
) {
  return (
    user?.nombre ?? user?.username ?? user?.email ?? "Usuario no disponible"
  );
}

function formatOrderCode(documentId?: string | null) {
  if (!documentId) {
    return "N/A";
  }

  let hashNumerico = 0;
  for (let index = 0; index < documentId.length; index += 1) {
    hashNumerico =
      documentId.charCodeAt(index) + ((hashNumerico << 5) - hashNumerico);
  }

  const numeroCorto = Math.abs(hashNumerico % 9000) + 1000;

  return `#PED-${numeroCorto}`;
}

function serializePedido(
  pedido: Record<string, unknown> & {
    documentId?: string;
    cliente?: { nombre?: string; username?: string; email?: string } | null;
    vendedora?: { nombre?: string; username?: string; email?: string } | null;
    comprobante_pago?: {
      url?: string;
      formats?: {
        small?: { url?: string };
        medium?: { url?: string };
        thumbnail?: { url?: string };
      };
    } | null;
    observacion_pago?: string | null;
    detalle_items?: unknown;
  },
) {
  return {
    ...pedido,
    codigo_pedido: formatOrderCode(pedido.documentId),
    clienteNombre: getDisplayUserName(pedido.cliente),
    vendedoraNombre: getDisplayUserName(pedido.vendedora),
    comprobante_pago:
      pedido.comprobante_pago == null
        ? null
        : {
            ...pedido.comprobante_pago,
          },
    observacion_pago: pedido.observacion_pago ?? "",
    detalle_items: Array.isArray(pedido.detalle_items)
      ? pedido.detalle_items
      : [],
  };
}

export default factories.createCoreController(
  "api::pedido.pedido",
  ({ strapi }) => ({
    async find(ctx) {
      const authUser = ctx.state.user;

      if (!authUser?.id) {
        return ctx.unauthorized("Debes iniciar sesion para consultar pedidos");
      }

      const user = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: { id: authUser.id },
        });

      if (!user) {
        return ctx.unauthorized(
          "No se pudo identificar el usuario autenticado",
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
          : 100;

      const pedidos = await strapi.db.query("api::pedido.pedido").findMany({
        where:
          user.rol_tienda === "vendedora"
            ? { vendedora: authUser.id }
            : { cliente: authUser.id },
        populate: ["cliente", "vendedora", "productos", "comprobante_pago"],
        orderBy: {
          createdAt: "desc",
        },
        limit,
      });

      return {
        data: pedidos.map((pedido) => serializePedido(pedido)),
        meta: {
          pagination: {
            page: 1,
            pageSize: pedidos.length,
            pageCount: pedidos.length > 0 ? 1 : 0,
            total: pedidos.length,
          },
        },
      };
    },

    async findOne(ctx) {
      const authUser = ctx.state.user;

      if (!authUser?.id) {
        return ctx.unauthorized("Debes iniciar sesion para consultar pedidos");
      }

      const pedido = await findPedidoByParams(strapi, ctx.params);

      if (!pedido) {
        return ctx.notFound("Pedido no encontrado");
      }

      const isOwner =
        String(pedido.cliente?.id ?? "") === String(authUser.id) ||
        String(pedido.vendedora?.id ?? "") === String(authUser.id);

      if (!isOwner) {
        return ctx.forbidden("No puedes consultar este pedido");
      }

      return {
        data: serializePedido(pedido),
      };
    },

    async create(ctx) {
      const authUser = ctx.state.user;

      if (!authUser?.id) {
        return ctx.unauthorized("Debes iniciar sesion para crear pedidos");
      }

      const body = ctx.request.body as PedidoBody;
      const data = body.data;

      if (!data) {
        return ctx.badRequest("No se recibieron datos del pedido");
      }

      const direccionEntrega = data.direccion_entrega?.trim();
      const telefonoContacto = data.telefono_contacto?.trim();
      const vendedoraId = normalizeId(data.vendedoraId);
      const comprobantePagoId = normalizeId(data.comprobante_pago);
      const metodoPago = data.metodo_pago;
      const estadoPago = data.estado_pago ?? "pendiente_verificacion";
      const items = Array.isArray(data.items) ? data.items : [];

      if (
        !direccionEntrega ||
        !telefonoContacto ||
        !vendedoraId ||
        !comprobantePagoId ||
        !metodoPago ||
        items.length === 0
      ) {
        return ctx.badRequest("Faltan datos obligatorios para crear el pedido");
      }

      if (!["deposito_bancario", "transferencia"].includes(metodoPago)) {
        return ctx.badRequest("El metodo de pago seleccionado es invalido");
      }

      if (
        !["pendiente_verificacion", "aprobado", "rechazado"].includes(
          estadoPago,
        )
      ) {
        return ctx.badRequest("El estado de pago seleccionado es invalido");
      }

      const vendedora = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: { id: vendedoraId },
        });

      if (!vendedora || vendedora.rol_tienda !== "vendedora") {
        return ctx.badRequest("La vendedora seleccionada no existe");
      }

      const normalizedItems = items
        .map((item) => ({
          productoId: normalizeId(item.productoId),
          cantidad:
            typeof item.cantidad === "number" && Number.isFinite(item.cantidad)
              ? item.cantidad
              : NaN,
        }))
        .filter(
          (item): item is { productoId: number; cantidad: number } =>
            item.productoId != null && item.cantidad > 0,
        );

      if (normalizedItems.length === 0) {
        return ctx.badRequest("Los items del pedido son invalidos");
      }

      const productIds = normalizedItems.map((item) => item.productoId);
      const productos = await strapi.db
        .query("api::producto.producto")
        .findMany({
          where: {
            id: {
              $in: productIds,
            },
          },
          populate: ["vendedora", "imagen"],
        });

      if (productos.length !== normalizedItems.length) {
        return ctx.badRequest("Algunos productos del pedido no existen");
      }

      const productosPorId = new Map(
        productos.map((producto) => [producto.id, producto]),
      );
      const detalleItems = [] as Array<Record<string, unknown>>;
      let total = 0;

      for (const item of normalizedItems) {
        const producto = productosPorId.get(item.productoId);

        if (!producto) {
          return ctx.badRequest("Algunos productos del pedido no existen");
        }

        if (String(producto.vendedora?.id ?? "") !== String(vendedoraId)) {
          return ctx.badRequest(
            "Todos los productos deben pertenecer a la misma vendedora",
          );
        }

        const currentStock =
          typeof producto.stock === "number"
            ? producto.stock
            : typeof producto.stock === "string"
              ? Number(producto.stock)
              : 0;

        if (!Number.isFinite(currentStock) || currentStock < item.cantidad) {
          return ctx.badRequest(
            `Stock insuficiente para el producto ${producto.nombre ?? producto.id}`,
          );
        }

        const precio =
          typeof producto.precio === "number"
            ? producto.precio
            : typeof producto.precio === "string"
              ? Number(producto.precio)
              : 0;

        total += precio * item.cantidad;
        detalleItems.push({
          id: producto.id,
          nombre: producto.nombre,
          cantidad: item.cantidad,
          precio,
          image: producto.imagen?.url
            ? {
                url: producto.imagen.url,
                name: producto.imagen.name ?? producto.nombre ?? "Producto",
              }
            : null,
        });
      }

      for (const item of normalizedItems) {
        const producto = productosPorId.get(item.productoId);

        if (!producto) {
          continue;
        }

        const currentStock =
          typeof producto.stock === "number"
            ? producto.stock
            : typeof producto.stock === "string"
              ? Number(producto.stock)
              : 0;

        await strapi.db.query("api::producto.producto").update({
          where: { id: item.productoId },
          data: {
            stock: currentStock - item.cantidad,
          },
        });
      }

      const pedidoCreado = await strapi.db.query("api::pedido.pedido").create({
        data: {
          total,
          metodo_pago: metodoPago,
          estado_pago: estadoPago,
          estado_despacho: "pendiente",
          direccion_entrega: direccionEntrega,
          telefono_contacto: telefonoContacto,
          detalle_items: detalleItems,
          cliente: authUser.id,
          vendedora: vendedoraId,
          productos: productIds,
          comprobante_pago: comprobantePagoId,
        },
      });

      const pedidoCompleto = await strapi.db
        .query("api::pedido.pedido")
        .findOne({
          where: { id: pedidoCreado.id },
          populate: ["cliente", "vendedora", "productos", "comprobante_pago"],
        });

      return {
        data: serializePedido(pedidoCompleto),
      };
    },

    async update(ctx) {
      const authUser = ctx.state.user;

      if (!authUser?.id) {
        return ctx.unauthorized("Debes iniciar sesion para actualizar pedidos");
      }

      const user = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: { id: authUser.id },
        });

      if (!user || user.rol_tienda !== "vendedora") {
        return ctx.forbidden("Solo una vendedora puede gestionar despachos");
      }

      const pedidoActual = await findPedidoByParams(strapi, ctx.params);

      if (!pedidoActual) {
        return ctx.notFound("Pedido no encontrado");
      }

      if (String(pedidoActual.vendedora?.id ?? "") !== String(authUser.id)) {
        return ctx.forbidden("Solo puedes gestionar tus propios despachos");
      }

      const body = ctx.request.body as PedidoBody;
      const data = body.data;

      if (!data) {
        return ctx.badRequest("No se recibieron cambios del despacho");
      }

      const updateData: Record<string, unknown> = {};

      if (data.estado_despacho) {
        const currentState =
          pedidoActual.estado_despacho as PedidoEstadoDespacho;
        const nextState = NEXT_ESTADO[currentState];

        if (!nextState || data.estado_despacho !== nextState) {
          return ctx.badRequest(
            "La transicion de estado del despacho no es valida",
          );
        }

        updateData.estado_despacho = data.estado_despacho;
      }

      if (data.nota_despacho !== undefined) {
        if (typeof data.nota_despacho !== "string") {
          return ctx.badRequest("La nota de despacho es invalida");
        }

        updateData.nota_despacho = data.nota_despacho.trim();
      }

      if (data.estado_pago !== undefined) {
        if (
          !["pendiente_verificacion", "aprobado", "rechazado"].includes(
            data.estado_pago,
          )
        ) {
          return ctx.badRequest("El estado de pago es invalido");
        }

        if (data.estado_pago === "aprobado" && !pedidoActual.comprobante_pago) {
          return ctx.badRequest(
            "No puedes aprobar el pago si el pedido no tiene comprobante adjunto",
          );
        }

        if (
          data.estado_pago === "rechazado" &&
          (!data.observacion_pago || !data.observacion_pago.trim())
        ) {
          return ctx.badRequest(
            "Debes escribir un motivo para rechazar el pago",
          );
        }

        if (data.estado_pago === "rechazado") {
          updateData.observacion_pago = data.observacion_pago?.trim() ?? "";
        }

        if (data.estado_pago === "aprobado") {
          updateData.observacion_pago = "";
        }

        updateData.estado_pago = data.estado_pago;
      }

      if (Object.keys(updateData).length === 0) {
        return ctx.badRequest(
          "No hay cambios validos para actualizar el despacho",
        );
      }

      const where = getPedidoWhereClause(ctx.params);

      if (!where) {
        return ctx.badRequest("No se encontro el identificador del pedido");
      }

      await strapi.db.query("api::pedido.pedido").update({
        where,
        data: updateData,
      });

      const pedidoCompleto = await findPedidoByParams(strapi, ctx.params);

      if (!pedidoCompleto) {
        return ctx.notFound("Pedido no encontrado");
      }

      return {
        data: serializePedido(pedidoCompleto),
      };
    },
  }),
);
