import { API_URL } from "@/utils/constants";
import { getTokenApi } from "@/api/token";
import type { CarritoItem } from "@/api/carrito";
import type { ProductoFormData } from "@/types/producto";

type RawCategoria = {
  id?: number | string;
  documentId?: string;
  nombre?: string;
  slug?: string;
};

type RawVendedora = {
  id?: number | string;
  username?: string;
  email?: string;
  nombre?: string;
};

type RawBlockChild = {
  text?: string;
};

type RawBlockNode = {
  type?: string;
  children?: RawBlockChild[];
};

type RawImageFormat = {
  url?: string;
};

type RawImage = {
  url?: string;
  name?: string;
  formats?: {
    thumbnail?: RawImageFormat;
    small?: RawImageFormat;
    medium?: RawImageFormat;
  };
};

type RawProducto = {
  id?: number | string;
  documentId?: string;
  nombre?: string;
  titulo?: string;
  vendedoraNombre?: string;
  vendedoraId?: number | string | null;
  descripcion?: string;
  Descripcion?: RawBlockNode[];
  precio?: number | string;
  stock?: number | string;
  categoria?: RawCategoria | null;
  categorias?: RawCategoria[];
  vendedora?: RawVendedora | null;
  imagen?: RawImage | null;
  attributes?: {
    documentId?: string;
    nombre?: string;
    titulo?: string;
    vendedoraNombre?: string;
    vendedoraId?: number | string | null;
    descripcion?: string;
    Descripcion?: RawBlockNode[];
    precio?: number | string;
    stock?: number | string;
    categoria?: RawCategoria | null;
    categorias?: RawCategoria[];
    vendedora?: RawVendedora | null;
    imagen?: RawImage | null;
  };
};

export type Producto = {
  id: number | string;
  documentId: string;
  nombre: string;
  descripcion: string;
  precio: number | null;
  stock: number | null;
  categoriaNombre: string;
  categoriaSlug: string;
  categoriaDocumentId: string;
  vendedoraNombre: string;
  vendedoraId: number | string | null;
  image: {
    url: string;
    name: string;
  } | null;
};

export type ProductoCarrito = Producto & {
  cantidad: number;
};

type AuthUserResponse = {
  id: number | string;
  rol_tienda?: string;
};

function blocksToText(blocks?: RawBlockNode[]): string {
  if (!Array.isArray(blocks)) {
    return "";
  }

  const lines = blocks
    .map((node) =>
      (node.children ?? [])
        .map((child) => child.text ?? "")
        .join("")
        .trim(),
    )
    .filter((line) => line.length > 0);

  return lines.join(" ");
}

function normalizeProducts(payload: unknown): Producto[] {
  const source = payload as { data?: unknown } | null;
  const rawList = Array.isArray(source?.data)
    ? (source?.data as RawProducto[])
    : source?.data && typeof source.data === "object"
      ? ([source.data] as RawProducto[])
      : Array.isArray(payload)
        ? (payload as RawProducto[])
        : [];

  return rawList
    .map((item) => {
      const values = item.attributes ?? item;
      const id = item.id;
      const documentId = item.documentId ?? values.documentId;
      const nombre = values.nombre ?? values.titulo;
      const categoria = values.categoria;
      const categoriaFromList = Array.isArray(values.categorias)
        ? values.categorias[0]
        : null;
      const categoriaNombre =
        categoria?.nombre ?? categoriaFromList?.nombre ?? "Sin categoria";
      const categoriaSlug =
        categoria?.slug ?? categoriaFromList?.slug ?? "sin-categoria";
      const categoriaDocumentId =
        categoria?.documentId ?? categoriaFromList?.documentId ?? "";
      const vendedoraNombre =
        values.vendedoraNombre ??
        values.vendedora?.nombre ??
        values.vendedora?.username ??
        values.vendedora?.email ??
        "Vendedora no disponible";
      const vendedoraId = values.vendedoraId ?? values.vendedora?.id ?? null;
      const imageUrl =
        values.imagen?.formats?.small?.url ??
        values.imagen?.formats?.medium?.url ??
        values.imagen?.formats?.thumbnail?.url ??
        values.imagen?.url ??
        "";
      const imageName = values.imagen?.name ?? nombre ?? "Producto";

      if (id == null || !documentId || !nombre) {
        return null;
      }

      const parsedPrice =
        typeof values.precio === "number"
          ? values.precio
          : typeof values.precio === "string"
            ? Number(values.precio)
            : null;
      const parsedStock =
        typeof values.stock === "number"
          ? values.stock
          : typeof values.stock === "string"
            ? Number(values.stock)
            : null;

      return {
        id,
        documentId,
        nombre,
        descripcion:
          (values.descripcion ?? blocksToText(values.Descripcion)) ||
          "Sin descripcion",
        precio:
          parsedPrice != null && Number.isFinite(parsedPrice)
            ? parsedPrice
            : null,
        stock:
          parsedStock != null && Number.isFinite(parsedStock)
            ? parsedStock
            : null,
        categoriaNombre,
        categoriaSlug,
        categoriaDocumentId,
        vendedoraNombre,
        vendedoraId,
        image: imageUrl
          ? {
              url: imageUrl,
              name: imageName,
            }
          : null,
      };
    })
    .filter((item): item is Producto => item !== null);
}

function buildDescripcionBlocks(descripcion: string): RawBlockNode[] {
  const text = descripcion.trim();

  if (!text) {
    return [];
  }

  return [
    {
      type: "paragraph",
      children: [
        {
          text,
        },
      ],
    },
  ];
}

async function getCurrentUserApi(token: string): Promise<AuthUserResponse> {
  const response = await fetch(`${API_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (result as { error?: { message?: string }; message?: string } | null)
        ?.error?.message ||
      (result as { message?: string } | null)?.message ||
      "No se pudo obtener la vendedora autenticada";

    throw new Error(message);
  }

  return result as AuthUserResponse;
}

async function uploadProductoImageApi(
  file: File,
  token: string,
): Promise<number | string> {
  const formData = new FormData();
  formData.append("files", file);

  const response = await fetch(`${API_URL}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || !Array.isArray(result) || result.length === 0) {
    const message =
      (result as { error?: { message?: string }; message?: string } | null)
        ?.error?.message ||
      (result as { message?: string } | null)?.message ||
      "No se pudo subir la imagen del producto";

    throw new Error(message);
  }

  return (result[0] as { id: number | string }).id;
}

export async function createProductoApi(
  formData: ProductoFormData,
): Promise<Producto> {
  const token = getTokenApi();

  if (!token) {
    throw new Error("Debes iniciar sesion para publicar productos");
  }

  if (!formData.imagen) {
    throw new Error("Debes seleccionar una imagen para el producto");
  }

  const user = await getCurrentUserApi(token);

  if (user.rol_tienda !== "vendedora") {
    throw new Error("Tu usuario no tiene rol de vendedora");
  }

  const imageId = await uploadProductoImageApi(formData.imagen, token);

  const payload = {
    data: {
      nombre: formData.nombre.trim(),
      Descripcion: buildDescripcionBlocks(formData.descripcion),
      precio: formData.precio,
      stock: formData.stock,
      categoriaDocumentId: formData.categoriaDocumentId,
      imageId,
    },
  };

  const response = await fetch(`${API_URL}/productos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (result as { error?: { message?: string }; message?: string } | null)
        ?.error?.message ||
      (result as { message?: string } | null)?.message ||
      "No se pudo crear el producto";

    throw new Error(message);
  }

  const products = normalizeProducts(result);

  const createdProduct = products[0];

  if (!createdProduct) {
    throw new Error("Strapi respondio sin datos del producto creado");
  }

  return createdProduct;
}

export async function updateProductoApi(
  documentId: string,
  formData: ProductoFormData,
): Promise<Producto> {
  const token = getTokenApi();

  if (!token) {
    throw new Error("Debes iniciar sesion para actualizar productos");
  }

  const user = await getCurrentUserApi(token);

  if (user.rol_tienda !== "vendedora") {
    throw new Error("Tu usuario no tiene rol de vendedora");
  }

  const payload: {
    data: {
      nombre: string;
      Descripcion: RawBlockNode[];
      precio: number;
      stock: number;
      categoriaDocumentId: string;
      imageId?: number | string;
    };
  } = {
    data: {
      nombre: formData.nombre.trim(),
      Descripcion: buildDescripcionBlocks(formData.descripcion),
      precio: formData.precio,
      stock: formData.stock,
      categoriaDocumentId: formData.categoriaDocumentId,
    },
  };

  if (formData.imagen) {
    payload.data.imageId = await uploadProductoImageApi(formData.imagen, token);
  }

  const response = await fetch(`${API_URL}/productos/${documentId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (result as { error?: { message?: string }; message?: string } | null)
        ?.error?.message ||
      (result as { message?: string } | null)?.message ||
      "No se pudo actualizar el producto";

    throw new Error(message);
  }

  const products = normalizeProducts(result);
  const updatedProduct = products[0];

  if (!updatedProduct) {
    throw new Error("Strapi respondio sin datos del producto actualizado");
  }

  return updatedProduct;
}

export async function deleteProductoApi(documentId: string): Promise<void> {
  const token = getTokenApi();

  if (!token) {
    throw new Error("Debes iniciar sesion para eliminar productos");
  }

  const response = await fetch(`${API_URL}/productos/${documentId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (result as { error?: { message?: string }; message?: string } | null)
        ?.error?.message ||
      (result as { message?: string } | null)?.message ||
      "No se pudo eliminar el producto";

    throw new Error(message);
  }
}

export async function applyOrderInventoryApi(
  items: Array<{ id: number | string; cantidad: number }>,
): Promise<void> {
  const token = getTokenApi();

  if (!token) {
    throw new Error("Debes iniciar sesion para actualizar el inventario");
  }

  if (items.length === 0) {
    return;
  }

  const response = await fetch(`${API_URL}/productos/apply-order-inventory`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (result as { error?: { message?: string }; message?: string } | null)
        ?.error?.message ||
      (result as { message?: string } | null)?.message ||
      "No se pudo actualizar el inventario";

    throw new Error(message);
  }
}

export async function getProductosApi(limit = 1000): Promise<Producto[]> {
  try {
    const params = new URLSearchParams();
    params.append("sort[0]", "createdAt:desc");
    params.append("pagination[limit]", String(limit));
    params.append("populate[0]", "categoria");
    params.append("populate[1]", "imagen");
    params.append("populate[2]", "vendedora");

    const response = await fetch(`${API_URL}/productos?${params.toString()}`);

    if (!response.ok) {
      throw new Error("No se pudieron obtener los productos");
    }

    const result = await response.json();
    return normalizeProducts(result);
  } catch (_error) {
    return [];
  }
}

export async function getMisProductosApi(limit = 1000): Promise<Producto[]> {
  const token = getTokenApi();

  if (!token) {
    throw new Error("Debes iniciar sesion para consultar tus productos");
  }

  const params = new URLSearchParams();
  params.append("sort[0]", "createdAt:desc");
  params.append("pagination[limit]", String(limit));
  params.append("populate[0]", "categoria");
  params.append("populate[1]", "imagen");
  params.append("populate[2]", "vendedora");
  params.append("mine", "true");

  const response = await fetch(`${API_URL}/productos?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (result as { error?: { message?: string }; message?: string } | null)
        ?.error?.message ||
      (result as { message?: string } | null)?.message ||
      "No se pudieron obtener tus productos";

    throw new Error(message);
  }

  return normalizeProducts(result);
}

export async function getProductosByIdsApi(
  items: CarritoItem[],
): Promise<ProductoCarrito[]> {
  const normalizedItems = items
    .map((item) => ({
      id: String(item.id).trim(),
      cantidad: item.cantidad,
    }))
    .filter((item) => item.id.length > 0 && item.cantidad > 0);

  const normalizedIds = normalizedItems.map((item) => item.id);
  const quantityMap = new Map(
    normalizedItems.map((item) => [item.id, item.cantidad]),
  );

  if (normalizedIds.length === 0) {
    return [];
  }

  try {
    const params = new URLSearchParams();
    params.append("populate[0]", "categoria");
    params.append("populate[1]", "imagen");
    params.append("populate[2]", "vendedora");

    normalizedIds.forEach((id, index) => {
      params.append(`filters[id][$in][${index}]`, id);
    });

    const response = await fetch(`${API_URL}/productos?${params.toString()}`);

    if (!response.ok) {
      throw new Error("No se pudieron obtener los productos del carrito");
    }

    const result = await response.json();
    const products = normalizeProducts(result);

    return normalizedIds
      .map((id) => {
        const product = products.find((item) => String(item.id) === id);

        if (!product) {
          return null;
        }

        return {
          ...product,
          cantidad: quantityMap.get(id) ?? 1,
        };
      })
      .filter((product): product is ProductoCarrito => product !== null);
  } catch (_error) {
    return [];
  }
}

async function fetchByRelation(
  slug: string,
  relationField: "categoria" | "categorias",
): Promise<Producto[]> {
  const params = new URLSearchParams();
  params.append(`filters[${relationField}][slug][$eq]`, slug);
  params.append("populate[0]", relationField);
  params.append("populate[1]", "imagen");
  params.append("populate[2]", "vendedora");

  const response = await fetch(`${API_URL}/productos?${params.toString()}`);

  if (!response.ok) {
    throw new Error("No se pudo obtener productos");
  }

  const result = await response.json();
  return normalizeProducts(result);
}

export async function getProductosByCategoriaSlugApi(
  slug: string,
): Promise<Producto[]> {
  const cleanSlug = slug.replace(/^\/+/, "").trim();

  if (!cleanSlug) {
    return [];
  }

  try {
    const list = await fetchByRelation(cleanSlug, "categoria");
    if (list.length > 0) {
      return list;
    }
  } catch (_error) {
    // Try plural relation if schema uses categorias.
  }

  try {
    return await fetchByRelation(cleanSlug, "categorias");
  } catch (_error) {
    return [];
  }
}
