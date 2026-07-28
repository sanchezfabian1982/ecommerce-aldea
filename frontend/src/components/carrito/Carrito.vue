<template>
  <div>
    <div
      class="carrito-dimmer"
      :class="{ open: showCarrito }"
      @click="closeCarrito"
    ></div>

    <aside class="carrito" :class="{ open: showCarrito }">
      <header class="carrito-header">
        <h2>Carrito de Compras en Aldea</h2>
        <button type="button" class="ui button" @click="closeCarrito">
          Cerrar carrito
        </button>
      </header>

      <div class="carrito-body">
        <p v-if="loading" class="empty-state">Cargando carrito...</p>
        <p v-else-if="productos.length === 0" class="empty-state">
          Tu carrito esta vacio.
        </p>
        <div v-else class="carrito-list">
          <article
            v-for="producto in productos"
            :key="String(producto.id)"
            class="carrito-item"
          >
            <img
              v-if="producto.image?.url"
              :src="mediaBaseUrl + producto.image.url"
              :alt="producto.nombre"
              class="carrito-item-image"
            />
            <div v-else class="carrito-item-placeholder">Sin imagen</div>

            <div class="carrito-item-content">
              <strong>{{ producto.nombre }}</strong>
              <span>Cantidad: {{ producto.cantidad }}</span>
              <span>{{ formatPrice(producto.precio) }}</span>
              <div class="carrito-item-actions">
                <button
                  type="button"
                  class="ui button quantity-button"
                  @click="decreaseProductCart(producto.id)"
                >
                  -
                </button>
                <button
                  type="button"
                  class="ui button quantity-button"
                  @click="increaseProductCart(producto.id)"
                >
                  +
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>

      <footer v-if="productos.length > 0" class="carrito-footer">
        <FormularioPago v-model="checkoutData" />

        <div class="subtotal-row">
          <strong>Subtotal</strong>
          <strong>{{ subtotal }}</strong>
        </div>
        <div
          v-if="cartActionError"
          class="ui negative message checkout-message"
        >
          <p>{{ cartActionError }}</p>
        </div>
        <div v-if="checkoutError" class="ui negative message checkout-message">
          <p>{{ checkoutError }}</p>
        </div>
        <button
          type="button"
          class="ui primary button checkout-button"
          :class="{ loading: checkoutLoading }"
          :disabled="
            checkoutLoading || hasOutOfStockProducts || hasInvalidPhone
          "
          @click="checkoutCart"
        >
          Finalizar compra
        </button>
        <button
          type="button"
          class="ui button clear-cart-button"
          @click="clearCart"
        >
          Vaciar carrito
        </button>
      </footer>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import FormularioPago, {
  type FormularioPagoState,
} from "@/components/carrito/FormularioPago.vue";
import {
  carritoState,
  clearCarritoApi,
  syncCarritoApi,
  decreaseProductoCarritoApi,
  increaseProductoCarritoApi,
} from "@/api/carrito";
import { createPedidoApi } from "@/api/pedidos";
import { getProductosByIdsApi, type ProductoCarrito } from "@/api/producto";
import { useUiStore } from "@/store";
import { API_URL } from "@/utils/constants";

defineOptions({
  name: "Carrito",
});

const uiStore = useUiStore();
const router = useRouter();
const showCarrito = computed(() => uiStore.showCarrito);
const cartItems = computed(() => carritoState.value);
const productos = ref<ProductoCarrito[]>([]);
const loading = ref(false);
const checkoutLoading = ref(false);
const cartActionError = ref("");
const checkoutError = ref("");
const checkoutData = ref<FormularioPagoState>({
  direccionEntrega: "",
  telefonoContacto: "",
  metodoPago: "deposito_bancario",
  comprobantePago: null,
});
const mediaBaseUrl = API_URL.replace(/\/api$/, "");

const closeCarrito = () => {
  uiStore.setShowCarrito(false);
};

const increaseProductCart = (idProducto: number | string) => {
  const producto = productos.value.find(
    (item) => String(item.id) === String(idProducto),
  );
  const result = increaseProductoCarritoApi(
    idProducto,
    producto?.stock ?? null,
  );

  cartActionError.value = result.success ? "" : result.mensaje;
};

const decreaseProductCart = (idProducto: number | string) => {
  decreaseProductoCarritoApi(idProducto);
  cartActionError.value = "";
};

const clearCart = () => {
  clearCarritoApi();
  cartActionError.value = "";
};

const hasOutOfStockProducts = computed(() =>
  productos.value.some(
    (producto) =>
      producto.stock == null ||
      !Number.isFinite(producto.stock) ||
      producto.stock <= 0,
  ),
);

const hasInvalidPhone = computed(
  () => !/^\d{10}$/.test(checkoutData.value.telefonoContacto.trim()),
);

const checkoutCart = async () => {
  if (productos.value.length === 0) {
    return;
  }

  checkoutError.value = "";

  if (hasOutOfStockProducts.value) {
    checkoutError.value =
      "No puedes finalizar la compra porque uno o mas productos ya no tienen stock disponible.";
    return;
  }

  if (hasInvalidPhone.value) {
    checkoutError.value =
      "El telefono de contacto debe contener exactamente 10 digitos numericos.";
    return;
  }

  checkoutLoading.value = true;

  try {
    await createPedidoApi(productos.value, checkoutData.value);
    clearCarritoApi();
    checkoutData.value = {
      direccionEntrega: "",
      telefonoContacto: "",
      metodoPago: "deposito_bancario",
      comprobantePago: null,
    };
    closeCarrito();
    await router.push("/orders");
  } catch (error) {
    checkoutError.value =
      error instanceof Error ? error.message : "No se pudo generar el pedido";
  } finally {
    checkoutLoading.value = false;
  }
};

const formatPrice = (price: number | null) => {
  if (price == null || !Number.isFinite(price)) {
    return "USD 0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
};

const subtotal = computed(() => {
  const total = productos.value.reduce((sum, producto) => {
    const price = producto.precio ?? 0;
    return sum + price * producto.cantidad;
  }, 0);

  return formatPrice(total);
});

watch(
  cartItems,
  async (items) => {
    loading.value = true;
    productos.value = await getProductosByIdsApi(items);

    const validIds = new Set(
      productos.value.map((producto) => String(producto.id)),
    );
    const sanitizedItems = items.filter((item) =>
      validIds.has(String(item.id)),
    );

    if (sanitizedItems.length !== items.length) {
      syncCarritoApi(sanitizedItems);
    }

    loading.value = false;
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.carrito-dimmer {
  opacity: 0;
  transition: opacity 0.5s ease;
  pointer-events: none;
}

.carrito-dimmer.open {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #000;
  opacity: 0.7;
  pointer-events: auto;
  z-index: 35;
}

.carrito {
  position: fixed;
  right: 0;
  top: 0;
  width: min(400px, 100vw);
  height: 100vh;
  background-color: #fff;
  box-shadow: 0 0 26px 5px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transform: translateX(150%);
  transition: transform 0.3s ease;
  z-index: 40;
}

.carrito.open {
  transform: translateX(0);
}

.carrito-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem;
  border-bottom: 1px solid #e4ebf3;
}

.carrito-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #123b66;
}

.carrito-body {
  flex: 1;
  padding: 1.25rem;
  overflow-y: auto;
}

.carrito-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.empty-state {
  color: #51667d;
}

.carrito-item {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 0.85rem;
  align-items: center;
  padding-bottom: 0.9rem;
  border-bottom: 1px solid #e8eef5;
}

.carrito-item-image,
.carrito-item-placeholder {
  width: 72px;
  height: 72px;
  border-radius: 12px;
}

.carrito-item-image {
  object-fit: cover;
  display: block;
}

.carrito-item-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef4fb;
  color: #6a7d91;
  font-size: 0.8rem;
}

.carrito-item-content {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: #183957;
}

.carrito-item-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.2rem;
}

.quantity-button {
  min-width: 36px;
  padding: 0.55rem 0.8rem;
}

.carrito-footer {
  border-top: 1px solid #e4ebf3;
  padding: 1rem 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.checkout-form {
  display: grid;
  gap: 0.75rem;
}

.checkout-message {
  margin: 0;
}

.subtotal-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #123b66;
}

.clear-cart-button {
  width: 100%;
}

.checkout-button {
  width: 100%;
}
</style>
