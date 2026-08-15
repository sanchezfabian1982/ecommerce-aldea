<template>
  <div class="producto">
    <div class="product-heading">
      <div class="product-title">
        {{ producto.nombre ?? producto.name }}
      </div>
    </div>

    <div class="product-image">
      <img
        v-if="producto.image?.url"
        :src="mediaBaseUrl + producto.image.url"
        :alt="producto.nombre ?? producto.name ?? producto.image.name"
      />
      <div v-else class="image-placeholder">Imagen no disponible</div>
    </div>

    <div class="product-content">
      <div
        class="stock-badge"
        :class="{
          'stock-low': stockDisponible > 0 && stockDisponible <= 5,
          'stock-out': stockDisponible === 0,
        }"
      >
        Stock disponible:
        <strong>{{ stockDisponibleLabel }}</strong>
      </div>

      <div class="meta">
        {{
          producto.vendedoraNombre === "Vendedora no disponible"
            ? "Producto sin vendedora asignada"
            : `Vende: ${producto.vendedoraNombre}`
        }}
      </div>
      <div class="description">{{ formattedPrice }}</div>
      <div v-if="cartFeedback" class="ui tiny negative message cart-feedback">
        {{ cartFeedback }}
      </div>
    </div>

    <div class="action-row">
      <button
        type="button"
        class="ui primary button"
        :disabled="
          producto.id === undefined ||
          producto.id === null ||
          stockDisponible === 0
        "
        @click="increaseProductCart(producto.id)"
      >
        {{ stockDisponible === 0 ? "Sin stock" : buttonLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { addProductoCarritoApi } from "../api/carrito";
import { API_URL } from "../utils/constants";

defineOptions({
  name: "ProductoCard",
});

type ProductoImage = {
  url: string;
  name: string;
};

type ProductoCard = {
  id?: number | string;
  name?: string;
  nombre?: string;
  precio?: number | string | null;
  stock?: number | null;
  vendedoraNombre?: string;
  categoriaSlug?: string;
  image?: ProductoImage | null;
};

const props = defineProps<{
  producto: ProductoCard;
}>();

const isAdded = ref(false);
const cartFeedback = ref("");
let addedTimeoutId: number | undefined;

const mediaBaseUrl = API_URL.replace(/\/api$/, "");

const stockDisponible = computed(() => {
  const rawStock = props.producto.stock;

  if (typeof rawStock === "number" && Number.isFinite(rawStock)) {
    return Math.max(0, Math.trunc(rawStock));
  }

  return 0;
});

const stockDisponibleLabel = computed(() => {
  const stock = stockDisponible.value;

  if (stock <= 0) {
    return "Agotado";
  }

  return `${stock} unidad${stock === 1 ? "" : "es"}`;
});

const formattedPrice = computed(() => {
  const rawPrice = props.producto.precio;
  const numericPrice =
    typeof rawPrice === "number"
      ? rawPrice
      : typeof rawPrice === "string"
        ? Number(rawPrice)
        : null;

  if (numericPrice == null || !Number.isFinite(numericPrice)) {
    return "USD 0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numericPrice);
});

const buttonLabel = computed(() => (isAdded.value ? "Agregado" : "Comprar"));

const increaseProductCart = (idProducto?: number | string) => {
  if (idProducto === undefined || idProducto === null) {
    return;
  }

  const result = addProductoCarritoApi(
    idProducto,
    props.producto.stock ?? null,
  );

  if (!result.success) {
    cartFeedback.value = result.mensaje;
    return;
  }

  cartFeedback.value = "";
  isAdded.value = true;

  if (addedTimeoutId !== undefined) {
    window.clearTimeout(addedTimeoutId);
  }

  addedTimeoutId = window.setTimeout(() => {
    isAdded.value = false;
  }, 1200);
};
</script>

<style lang="scss" scoped>
.producto {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid var(--aldea-border);
  border-radius: 18px;
  box-shadow: 0 12px 24px rgba(18, 59, 102, 0.06);
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 18px 34px rgba(15, 50, 87, 0.12);

    .ui.button {
      max-height: 36px;
      min-height: 36px;
      padding: 0.75rem 1rem;
    }
  }

  .ui.button {
    width: 100%;
    max-height: 0;
    min-height: 0;
    overflow: hidden;
    padding: 0;
    border: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    transition:
      min-height 0.6s ease,
      max-height 0.6s ease,
      padding 0.3s ease;
  }

  .ui.button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
    pointer-events: none;
  }
}

.product-heading {
  padding: 1rem 1rem 0;
}

.product-title {
  color: var(--aldea-blue-900);
  font-weight: 800;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.5rem;
}

.product-image {
  height: 220px;
  background: linear-gradient(180deg, #f4f7fb 0%, #e9f1f8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem 0;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
    display: block;
  }
}

.image-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6a7d91;
  font-size: 0.95rem;
  background: linear-gradient(180deg, #eef4fb 0%, #dde8f5 100%);
}

.product-content {
  padding: 0 1rem;
}

.content .meta {
  color: var(--aldea-text-soft);
  font-weight: 600;
}

.stock-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.9rem;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  background: var(--aldea-green-100);
  color: var(--aldea-green-700);
  font-size: 0.9rem;
  font-weight: 700;
}

.action-row {
  padding: 0 1rem 1rem;
  border-top: 1px solid rgba(215, 228, 242, 0.9);
}

.stock-low {
  background: var(--aldea-gold-100);
  color: #8a5b00;
}

.stock-out {
  background: var(--aldea-red-100);
  color: var(--aldea-red-700);
}

.description {
  color: var(--aldea-red-700);
  font-weight: 700;
}

.cart-feedback {
  margin-top: 0.75rem;
}
</style>
