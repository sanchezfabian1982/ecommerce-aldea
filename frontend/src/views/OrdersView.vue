<template>
  <section class="orders-page">
    <h1 class="ui header">
      <i class="shopping bag icon"></i>
      <div class="content">Mis pedidos</div>
    </h1>

    <div v-if="pedidos.length === 0" class="ui message">
      <div class="header">Aun no tienes pedidos registrados</div>
      <p>Cuando finalices una compra, tus pedidos apareceran aqui.</p>
    </div>

    <div v-else-if="loading" class="ui active inline loader"></div>
    <div v-else-if="errorMessage" class="ui negative message">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else class="orders-list">
      <article
        v-for="pedido in pedidos"
        :key="pedido.documentId"
        class="ui segment order-card"
      >
        <div class="order-head">
          <div>
            <h2 class="ui small header">Pedido {{ pedido.codigoPedido }}</h2>
            <p class="order-date">{{ formatDate(pedido.createdAt) }}</p>
            <p class="order-vendor">Vendedora: {{ pedido.vendedoraNombre }}</p>
          </div>
          <div class="order-summary">
            <span
              class="order-status"
              :class="`status-${pedido.estadoDespacho}`"
            >
              {{ pedidoEstadoLabel(pedido.estadoDespacho) }}
            </span>
            <strong>{{ formatPrice(pedido.total) }}</strong>
            <span>{{ pedido.totalItems }} articulos</span>
          </div>
        </div>

        <div class="order-delivery">
          <span><strong>Entrega:</strong> {{ pedido.direccionEntrega }}</span>
          <span><strong>Telefono:</strong> {{ pedido.telefonoContacto }}</span>
          <span
            v-if="pedido.notaDespacho"
            :class="[
              'order-delivery-note',
              {
                'order-delivery-confirmed':
                  pedido.estadoDespacho === 'entregado',
              },
            ]"
          >
            <strong>
              {{
                pedido.estadoDespacho === "entregado"
                  ? "Confirmación de entrega:"
                  : "Nota de despacho:"
              }}
            </strong>
            {{ pedido.notaDespacho }}
          </span>
          <span v-if="pedido.observacionPago" class="order-payment-note">
            <strong>Estado de pago:</strong> {{ pedido.observacionPago }}
          </span>
        </div>

        <div class="order-items">
          <div
            v-for="item in pedido.items"
            :key="`${pedido.documentId}-${item.id}`"
            class="order-item"
          >
            <img
              v-if="item.image?.url"
              :src="mediaBaseUrl + item.image.url"
              :alt="item.nombre"
              class="order-item-image"
            />
            <div v-else class="order-item-placeholder">Sin imagen</div>

            <div class="order-item-content">
              <strong>{{ item.nombre }}</strong>
              <span>Cantidad: {{ item.cantidad }}</span>
              <span>{{ formatPrice(item.precio) }}</span>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  pedidosState,
  syncPedidosEstadoApi,
  type PedidoEstadoDespacho,
} from "@/api/pedidos";
import { API_URL } from "@/utils/constants";

const pedidos = computed(() => pedidosState.value);
const mediaBaseUrl = API_URL.replace(/\/api$/, "");
const loading = ref(false);
const errorMessage = ref("");

const formatPrice = (price: number | null) => {
  if (price == null || !Number.isFinite(price)) {
    return "USD 0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
};

const formatDate = (isoDate: string) => {
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoDate));
};

const pedidoEstadoLabel = (estado: PedidoEstadoDespacho) => {
  switch (estado) {
    case "pendiente":
      return "Pendiente";
    case "en_preparacion":
      return "En preparacion";
    case "despachado":
      return "Despachado";
    case "entregado":
      return "Entregado";
    default:
      return estado;
  }
};

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    await syncPedidosEstadoApi();
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : "No se pudieron cargar tus pedidos";
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.orders-page {
  padding: 1rem;
}

.orders-page .ui.header {
  color: var(--aldea-blue-900);
}

.orders-list {
  display: grid;
  gap: 1rem;
}

.order-card {
  border-radius: 16px;
  border: 1px solid var(--aldea-border);
  box-shadow: var(--aldea-shadow);
}

.order-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.order-date {
  margin: 0.25rem 0 0;
  color: var(--aldea-text-soft);
}

.order-vendor {
  margin: 0.35rem 0 0;
  color: var(--aldea-blue-700);
}

.order-summary {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
  color: var(--aldea-blue-900);
}

.order-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  text-transform: capitalize;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-pendiente {
  background: var(--aldea-gold-100);
  color: #8a6116;
}

.status-en_preparacion {
  background: var(--aldea-gold-100);
  color: #8a6116;
}

.status-despachado {
  background: var(--aldea-blue-100);
  color: var(--aldea-blue-700);
}

.status-entregado {
  background: var(--aldea-green-100);
  color: var(--aldea-green-700);
}

.order-delivery {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
  color: var(--aldea-blue-700);
}

.order-delivery-note {
  padding: 0.35rem 0;
}

.order-delivery-confirmed {
  color: #166534;
  background: rgba(22, 163, 74, 0.08);
  border: 1px solid rgba(22, 163, 74, 0.2);
  border-radius: 10px;
  padding: 0.55rem 0.75rem;
}

.order-payment-note {
  color: var(--aldea-green-700);
  background: rgba(22, 163, 74, 0.08);
  border: 1px solid rgba(22, 163, 74, 0.18);
  border-radius: 10px;
  padding: 0.55rem 0.75rem;
}

.order-items {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.order-item {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 0.85rem;
  align-items: center;
}

.order-item-image,
.order-item-placeholder {
  width: 72px;
  height: 72px;
  border-radius: 12px;
}

.order-item-image {
  object-fit: cover;
  display: block;
}

.order-item-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #eef4fb 0%, #e1ebf6 100%);
  color: #6a7d91;
  font-size: 0.8rem;
}

.order-item-content {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: #183957;
}
</style>
