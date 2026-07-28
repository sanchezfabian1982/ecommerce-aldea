import { ref } from "vue";
import { API_URL } from "@/utils/constants";
import { getTokenApi, removeTokenApi } from "@/api/token";
import type { ProductoCarrito } from "@/api/producto";

export type MetodoPago = "deposito_bancario" | "transferencia";
export type EstadoPago = "pendiente_verificacion" | "aprobado" | "rechazado";

export type PedidoEstadoDespacho =
  | "pendiente"
  | "en_preparacion"
  | "despachado"
  | "entregado";

export type PedidoItem = {
  id: number | string;
  nombre: string;
  precio: number | null;
  cantidad: number;
  image: {
    url: string;
    name: string;
  } | null;
};

export type Pedido = {
  id: number | string;
  documentId: string;
  codigoPedido: string;
  createdAt: string;
  metodoPago: MetodoPago;
  estadoPago: EstadoPago;
  estadoDespacho: PedidoEstadoDespacho;
  total: number;
  totalItems: number;
  direccionEntrega: string;
  telefonoContacto: string;
  notaDespacho: string;
  observacionPago: string;
  clienteNombre: string;
  vendedoraNombre: string;
  comprobantePagoUrl: string;
  items: PedidoItem[];
};

type RawPedidoItem = {
  id?: number | string;
  nombre?: string;
  precio?: number | string;
  cantidad?: number | string;
  image?: {
    url?: string;
    name?: string;
  } | null;
};

type RawPedido = {
  id?: number | string;
  documentId?: string;
  codigo_pedido?: string;
  createdAt?: string;
  total?: number | string;
  metodo_pago?: MetodoPago;
  estado_pago?: EstadoPago;
  estado_despacho?: PedidoEstadoDespacho;
  direccion_entrega?: string;
  telefono_contacto?: string;
  nota_despacho?: string;
  observacion_pago?: string;
  clienteNombre?: string;
  vendedoraNombre?: string;
  comprobante_pago?: {
    url?: string;
    formats?: {
      small?: { url?: string };
      medium?: { url?: string };
      thumbnail?: { url?: string };
    };
  } | null;
  detalle_items?: RawPedidoItem[];
  attributes?: {
    documentId?: string;
    codigo_pedido?: string;
    createdAt?: string;
    total?: number | string;
    metodo_pago?: MetodoPago;
    estado_pago?: EstadoPago;
    estado_despacho?: PedidoEstadoDespacho;
    direccion_entrega?: string;
    telefono_contacto?: string;
    nota_despacho?: string;
    observacion_pago?: string;
    clienteNombre?: string;
    vendedoraNombre?: string;
    comprobante_pago?: {
      url?: string;
      formats?: {
        small?: { url?: string };
        medium?: { url?: string };
        thumbnail?: { url?: string };
      };
    } | null;
    detalle_items?: RawPedidoItem[];
  };
};

type CheckoutData = {
  direccionEntrega: string;
  telefonoContacto: string;
  metodoPago: MetodoPago;
  comprobantePago: File | null;
};

export type PedidoInput = {
  vendedoraId: number | string;
  direccion_entrega: string;
  telefono_contacto: string;
  items: Array<{ productoId: number | string; cantidad: number }>;
  metodo_pago: MetodoPago;
  estado_pago: "pendiente_verificacion";
  estado_despacho: "pendiente";
  comprobante_pago: number | string;
};

export const pedidosState = ref<Pedido[]>([]);

function normalizePedidoItems(items?: RawPedidoItem[]): PedidoItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (item.id == null || !item.nombre) {
        return null;
      }

      const precio =
        typeof item.precio === "number"
          ? item.precio
          : typeof item.precio === "string"
            ? Number(item.precio)
            : null;
      const cantidad =
        typeof item.cantidad === "number"
          ? item.cantidad
          : typeof item.cantidad === "string"
            ? Number(item.cantidad)
            : 0;

      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        return null;
      }

      return {
        id: item.id,
        nombre: item.nombre,
        precio: precio != null && Number.isFinite(precio) ? precio : null,
        cantidad,
        image: item.image?.url
          ? {
              url: item.image.url,
              name: item.image.name ?? item.nombre,
            }
          : null,
      };
    })
    .filter((item): item is PedidoItem => item !== null);
}

function normalizePedidos(payload: unknown): Pedido[] {
  const source = payload as { data?: unknown } | null;
  const rawList = Array.isArray(source?.data)
    ? (source.data as RawPedido[])
    : source?.data && typeof source.data === "object"
      ? ([source.data] as RawPedido[])
      : Array.isArray(payload)
        ? (payload as RawPedido[])
        : [];

  return rawList
    .map((pedido) => {
      const values = pedido.attributes ?? pedido;
      const id = pedido.id;
      const documentId = pedido.documentId ?? values.documentId;
      const items = normalizePedidoItems(values.detalle_items);
      const total =
        typeof values.total === "number"
          ? values.total
          : typeof values.total === "string"
            ? Number(values.total)
            : 0;

      if (id == null || !documentId) {
        return null;
      }

      return {
        id,
        documentId,
        codigoPedido: values.codigo_pedido ?? documentId,
        createdAt: values.createdAt ?? "",
        metodoPago: values.metodo_pago ?? "deposito_bancario",
        estadoPago: values.estado_pago ?? "pendiente_verificacion",
        estadoDespacho: values.estado_despacho ?? "pendiente",
        total: Number.isFinite(total) ? total : 0,
        totalItems: items.reduce((sum, item) => sum + item.cantidad, 0),
        direccionEntrega: values.direccion_entrega ?? "",
        telefonoContacto: values.telefono_contacto ?? "",
        notaDespacho: values.nota_despacho ?? "",
        observacionPago: values.observacion_pago ?? "",
        clienteNombre: values.clienteNombre ?? "Cliente no disponible",
        vendedoraNombre: values.vendedoraNombre ?? "Vendedora no disponible",
        comprobantePagoUrl:
          values.comprobante_pago?.formats?.small?.url ??
          values.comprobante_pago?.formats?.medium?.url ??
          values.comprobante_pago?.formats?.thumbnail?.url ??
          values.comprobante_pago?.url ??
          "",
        items,
      };
    })
    .filter((pedido): pedido is Pedido => pedido !== null);
}

function getAuthHeaders() {
  const token = getTokenApi();

  if (!token) {
    throw new Error("Debes iniciar sesion para gestionar pedidos");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

function resolveAuthErrorMessage(
  status: number,
  fallback: string,
  payload: unknown,
) {
  if (status === 401) {
    removeTokenApi();
    return "Tu sesion expiro o no es valida. Inicia sesion nuevamente para continuar.";
  }

  if (status === 403) {
    return "Tu cuenta no tiene permisos para completar esta accion.";
  }

  return (
    (payload as { error?: { message?: string }; message?: string } | null)
      ?.error?.message ||
    (payload as { message?: string } | null)?.message ||
    fallback
  );
}

export async function getPedidosApi(): Promise<Pedido[]> {
  const params = new URLSearchParams();
  params.append("sort[0]", "createdAt:desc");
  params.append("pagination[limit]", "100");
  params.append("populate[0]", "cliente");
  params.append("populate[1]", "vendedora");
  params.append("populate[2]", "productos");
  params.append("populate[3]", "comprobante_pago");

  const response = await fetch(`${API_URL}/pedidos?${params.toString()}`, {
    headers: getAuthHeaders(),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (result as { error?: { message?: string }; message?: string } | null)
        ?.error?.message ||
      (result as { message?: string } | null)?.message ||
      "No se pudieron obtener los pedidos";

    throw new Error(message);
  }

  return normalizePedidos(result);
}

export async function syncPedidosEstadoApi(): Promise<void> {
  pedidosState.value = await getPedidosApi();
}

function getRequiredToken(): string {
  const token = getTokenApi();

  if (!token) {
    throw new Error("Debes iniciar sesion para gestionar pedidos");
  }

  return token;
}

/**
 * Paso 1: Sube el comprobante (Imagen o PDF)
 */
export async function uploadComprobanteApi(
  file: File,
  token: string,
): Promise<number> {
  const formData = new FormData();
  formData.append("files", file);

  const response = await fetch(`${API_URL}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !Array.isArray(data) || data.length === 0) {
    const message = resolveAuthErrorMessage(
      response.status,
      `Error al subir el comprobante de pago (HTTP ${response.status})`,
      data,
    );

    throw new Error(message);
  }

  return Number((data[0] as { id: number | string }).id);
}

/**
 * Paso 2: Crea el registro del Pedido enlazando el ID del comprobante
 */
export async function createPedidoRegistroApi(
  pedido: PedidoInput,
  token: string,
) {
  const response = await fetch(`${API_URL}/pedidos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ data: pedido }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveAuthErrorMessage(
      response.status,
      "Error al crear el registro del pedido",
      result,
    );

    throw new Error(message);
  }

  return result;
}

export async function createPedidoApi(
  productos: ProductoCarrito[],
  checkoutData: CheckoutData,
): Promise<Pedido[]> {
  const token = getRequiredToken();

  if (productos.length === 0) {
    return [];
  }

  const direccionEntrega = checkoutData.direccionEntrega.trim();
  const telefonoContacto = checkoutData.telefonoContacto.trim();
  const metodoPago = checkoutData.metodoPago;
  const comprobantePago = checkoutData.comprobantePago;

  if (
    !direccionEntrega ||
    !telefonoContacto ||
    !metodoPago ||
    !comprobantePago
  ) {
    throw new Error(
      "Debes completar la direccion, el telefono, el metodo de pago y adjuntar el comprobante.",
    );
  }

  let comprobantePagoId: number;

  try {
    comprobantePagoId = await uploadComprobanteApi(comprobantePago, token);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`No se pudo subir el comprobante: ${error.message}`);
    }

    throw new Error("No se pudo subir el comprobante de pago");
  }

  const groupedBySeller = new Map<
    string,
    {
      vendedoraId: number | string;
      items: Array<{ productoId: number | string; cantidad: number }>;
    }
  >();

  for (const producto of productos) {
    if (producto.vendedoraId == null) {
      throw new Error(
        `El producto ${producto.nombre} no tiene vendedora asignada`,
      );
    }

    const sellerKey = String(producto.vendedoraId);
    const group = groupedBySeller.get(sellerKey) ?? {
      vendedoraId: producto.vendedoraId,
      items: [],
    };

    group.items.push({
      productoId: producto.id,
      cantidad: producto.cantidad,
    });

    groupedBySeller.set(sellerKey, group);
  }

  const createdOrders: Pedido[] = [];

  for (const group of groupedBySeller.values()) {
    let result: unknown;

    try {
      result = await createPedidoRegistroApi(
        {
          vendedoraId: group.vendedoraId,
          direccion_entrega: direccionEntrega,
          telefono_contacto: telefonoContacto,
          items: group.items,
          metodo_pago: metodoPago,
          estado_pago: "pendiente_verificacion",
          estado_despacho: "pendiente",
          comprobante_pago: comprobantePagoId,
        },
        token,
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`No se pudo crear el pedido: ${error.message}`);
      }

      throw new Error("No se pudo crear el pedido");
    }

    const created = normalizePedidos(result)[0];

    if (created) {
      createdOrders.push(created);
    }
  }

  await syncPedidosEstadoApi();
  return createdOrders;
}

export async function updatePedidoDespachoApi(
  documentId: string,
  payload: {
    estadoDespacho: PedidoEstadoDespacho;
    notaDespacho?: string;
  },
): Promise<Pedido> {
  const response = await fetch(`${API_URL}/pedidos/${documentId}`, {
    method: "PUT",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        estado_despacho: payload.estadoDespacho,
        nota_despacho: payload.notaDespacho ?? "",
      },
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (result as { error?: { message?: string }; message?: string } | null)
        ?.error?.message ||
      (result as { message?: string } | null)?.message ||
      "No se pudo actualizar el despacho";

    throw new Error(message);
  }

  const pedido = normalizePedidos(result)[0];

  if (!pedido) {
    throw new Error("Strapi respondio sin datos del pedido actualizado");
  }

  await syncPedidosEstadoApi();
  return pedido;
}

export async function updatePedidoPagoApi(
  documentId: string,
  payload: {
    estadoPago: EstadoPago;
    observacionPago?: string;
  },
): Promise<Pedido> {
  const response = await fetch(`${API_URL}/pedidos/${documentId}`, {
    method: "PUT",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        estado_pago: payload.estadoPago,
        observacion_pago: payload.observacionPago ?? "",
      },
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (result as { error?: { message?: string }; message?: string } | null)
        ?.error?.message ||
      (result as { message?: string } | null)?.message ||
      "No se pudo actualizar el estado del pago";

    throw new Error(message);
  }

  const pedido = normalizePedidos(result)[0];

  if (!pedido) {
    throw new Error("Strapi respondio sin datos del pedido actualizado");
  }

  await syncPedidosEstadoApi();
  return pedido;
}
