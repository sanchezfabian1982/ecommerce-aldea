import { ref } from "vue";
import { PRODUCTOS } from "../utils/constants";

export type CarritoItem = {
  id: number | string;
  cantidad: number;
};

export type CartActionResult = {
  success: boolean;
  mensaje: string;
};

export const carritoState = ref<CarritoItem[]>(readCarritoStorage());

function normalizeLegacyCart(parsed: unknown): CarritoItem[] {
  if (!Array.isArray(parsed)) {
    return [];
  }

  if (
    parsed.every(
      (item) =>
        item && typeof item === "object" && "id" in item && "cantidad" in item,
    )
  ) {
    return parsed
      .map((item) => item as { id?: number | string; cantidad?: number })
      .filter(
        (item) =>
          item.id !== undefined &&
          item.id !== null &&
          typeof item.cantidad === "number" &&
          item.cantidad > 0,
      )
      .map((item) => ({
        id: item.id as number | string,
        cantidad: item.cantidad as number,
      }));
  }

  const quantityMap = new Map<
    string,
    { id: number | string; cantidad: number }
  >();

  parsed.forEach((item) => {
    if (typeof item !== "string" && typeof item !== "number") {
      return;
    }

    const key = String(item);
    const current = quantityMap.get(key);

    if (current) {
      current.cantidad += 1;
      return;
    }

    quantityMap.set(key, {
      id: item,
      cantidad: 1,
    });
  });

  return Array.from(quantityMap.values());
}

function readCarritoStorage(): CarritoItem[] {
  const productos = localStorage.getItem(PRODUCTOS);

  if (!productos) {
    return [];
  }

  try {
    const parsed = JSON.parse(productos);
    return normalizeLegacyCart(parsed);
  } catch (_error) {
    return [];
  }
}

function setCarritoState(productos: CarritoItem[]): void {
  carritoState.value = productos;
}

function persistCarrito(productos: CarritoItem[]): void {
  localStorage.setItem(PRODUCTOS, JSON.stringify(productos));
  setCarritoState(productos);
}

function getCantidadProductoEnCarrito(idProducto: number | string): number {
  const current = getCarritoApi().find(
    (item) => String(item.id) === String(idProducto),
  );

  return current?.cantidad ?? 0;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", () => {
    setCarritoState(readCarritoStorage());
  });
}

export function addProductoCarritoApi(
  idProducto: number | string,
  stockDisponible?: number | null,
): CartActionResult {
  const productos = getCarritoApi();
  const cantidadActual = getCantidadProductoEnCarrito(idProducto);

  if (
    stockDisponible != null &&
    Number.isFinite(stockDisponible) &&
    stockDisponible >= 0 &&
    cantidadActual >= stockDisponible
  ) {
    return {
      success: false,
      mensaje:
        "No puedes agregar mas unidades porque superas el stock disponible.",
    };
  }

  const current = productos.find(
    (item) => String(item.id) === String(idProducto),
  );

  if (current) {
    current.cantidad += 1;
  } else {
    productos.push({ id: idProducto, cantidad: 1 });
  }

  persistCarrito(productos);

  return {
    success: true,
    mensaje: "Producto agregado al carrito.",
  };
}

export function increaseProductoCarritoApi(
  idProducto: number | string,
  stockDisponible?: number | null,
): CartActionResult {
  return addProductoCarritoApi(idProducto, stockDisponible);
}

export function decreaseProductoCarritoApi(idProducto: number | string): void {
  const targetId = String(idProducto);
  const productos = getCarritoApi();
  const index = productos.findIndex((item) => String(item.id) === targetId);

  if (index === -1) {
    return;
  }

  const current = productos[index];

  if (!current) {
    return;
  }

  if (current.cantidad > 1) {
    current.cantidad -= 1;
  } else {
    productos.splice(index, 1);
  }

  persistCarrito(productos);
}

export function getCarritoApi(): CarritoItem[] {
  return readCarritoStorage();
}

export function clearCarritoApi(): void {
  persistCarrito([]);
}

export function syncCarritoApi(productos: CarritoItem[]): void {
  persistCarrito(productos.filter((item) => item.cantidad > 0));
}
