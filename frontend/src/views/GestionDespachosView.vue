<template>
  <section class="dispatch-page">
    <header class="dispatch-header">
      <h1 class="ui header">Gestion de despachos</h1>
      <p>Administra el avance de tus pedidos con estados secuenciales.</p>
    </header>

    <div v-if="successMessage" class="ui positive message">
      <p>{{ successMessage }}</p>
    </div>

    <div v-if="errorMessage" class="ui negative message">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="loading" class="ui active inline loader"></div>
    <div v-else-if="pedidos.length === 0" class="ui message">
      <div class="header">No tienes pedidos por despachar</div>
      <p>Cuando una clienta compre tus productos, apareceran aqui.</p>
    </div>

    <div v-else class="dispatch-list">
      <article
        v-for="pedido in pedidos"
        :key="pedido.documentId"
        class="ui segment dispatch-card"
      >
        <div class="dispatch-card-head">
          <div>
            <h2 class="ui small header">Pedido {{ pedido.codigoPedido }}</h2>
            <p class="dispatch-date">{{ formatDate(pedido.createdAt) }}</p>
          </div>
          <strong>{{ formatPrice(pedido.total) }}</strong>
        </div>

        <div class="dispatch-customer">
          <span><strong>Cliente:</strong> {{ pedido.clienteNombre }}</span>
          <span><strong>Telefono:</strong> {{ pedido.telefonoContacto }}</span>
          <span><strong>Direccion:</strong> {{ pedido.direccionEntrega }}</span>
        </div>

        <div class="dispatch-payment">
          <span>
            <strong>Metodo de pago:</strong>
            {{ metodoPagoLabel(pedido.metodoPago) }}
          </span>
          <span class="payment-status" :class="`payment-${pedido.estadoPago}`">
            {{ estadoPagoLabel(pedido.estadoPago) }}
          </span>
        </div>

        <div class="payment-actions">
          <button
            type="button"
            class="ui button tiny"
            :class="{ positive: pedido.estadoPago === 'aprobado' }"
            :disabled="
              actionLoadingId === pedido.documentId ||
              !pedido.comprobantePagoUrl
            "
            @click="updatePago(pedido, 'aprobado')"
          >
            Aprobar pago
          </button>
          <button
            type="button"
            class="ui button tiny"
            :class="{ negative: pedido.estadoPago === 'rechazado' }"
            :disabled="actionLoadingId === pedido.documentId"
            @click="togglePagoNote(pedido.documentId)"
          >
            Rechazar pago
          </button>
        </div>

        <div
          v-if="activePagoNotePedidoId === pedido.documentId"
          class="dispatch-note-form"
        >
          <div class="ui form">
            <div class="field">
              <label>Motivo del rechazo</label>
              <textarea
                v-model="notaPago"
                rows="3"
                placeholder="Ej. El comprobante no coincide con el valor transferido."
              ></textarea>
            </div>

            <div class="note-actions">
              <button
                type="button"
                class="ui negative button"
                :class="{ loading: actionLoadingId === pedido.documentId }"
                :disabled="actionLoadingId === pedido.documentId"
                @click="rejectPago(pedido, notaPago)"
              >
                Confirmar rechazo
              </button>
              <button
                type="button"
                class="ui button"
                :disabled="actionLoadingId === pedido.documentId"
                @click="closePagoNote"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>

        <p v-if="!pedido.comprobantePagoUrl" class="payment-warning">
          No se puede aprobar el pago mientras no exista un comprobante adjunto.
        </p>

        <div v-if="pedido.comprobantePagoUrl" class="dispatch-proof">
          <strong>Comprobante de pago</strong>
          <a
            :href="mediaBaseUrl + pedido.comprobantePagoUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="proof-link"
          >
            Ver comprobante
          </a>
          <img
            v-if="isImageProof(pedido.comprobantePagoUrl)"
            :src="mediaBaseUrl + pedido.comprobantePagoUrl"
            alt="Comprobante de pago"
            class="proof-image"
          />
          <div v-else class="proof-file">
            Documento adjunto disponible para descarga.
          </div>
        </div>

        <div class="dispatch-items">
          <h3 class="ui tiny header">Items comprados</h3>
          <ul>
            <li
              v-for="item in pedido.items"
              :key="`${pedido.documentId}-${item.id}`"
            >
              {{ item.cantidad }} {{ item.nombre }}
            </li>
          </ul>
        </div>

        <div class="dispatch-stepper">
          <div
            v-for="(estado, index) in ESTADOS_DESPACHO"
            :key="estado"
            class="step-item"
            :class="{
              active: index === getEstadoIndex(pedido.estadoDespacho),
              completed: index < getEstadoIndex(pedido.estadoDespacho),
            }"
          >
            <span class="step-dot">{{ index + 1 }}</span>
            <span class="step-label">{{ estadoLabel(estado) }}</span>
          </div>
        </div>

        <div v-if="pedido.notaDespacho" class="dispatch-note">
          <strong>Nota:</strong> {{ pedido.notaDespacho }}
        </div>

        <div v-if="pedido.observacionPago" class="payment-note">
          <strong>Observacion de pago:</strong> {{ pedido.observacionPago }}
        </div>

        <div class="dispatch-actions">
          <button
            v-if="
              getNextEstado(pedido.estadoDespacho) &&
              pedido.estadoDespacho !== 'en_preparacion'
            "
            type="button"
            class="ui primary button"
            :class="{ loading: actionLoadingId === pedido.documentId }"
            :disabled="actionLoadingId === pedido.documentId"
            @click="advancePedido(pedido)"
          >
            {{ actionLabel(pedido.estadoDespacho) }}
          </button>

          <button
            v-if="pedido.estadoDespacho === 'en_preparacion'"
            type="button"
            class="ui primary button"
            :disabled="actionLoadingId === pedido.documentId"
            @click="toggleDespachoNote(pedido.documentId)"
          >
            {{
              activeNotePedidoId === pedido.documentId
                ? "Cerrar nota de despacho"
                : "Marcar como Despachado"
            }}
          </button>
        </div>

        <div
          v-if="activeNotePedidoId === pedido.documentId"
          class="dispatch-note-form"
        >
          <div class="ui form">
            <div class="field">
              <label>Nota de despacho opcional</label>
              <textarea
                v-model="notaDespacho"
                rows="3"
                placeholder="Ej. Enviado en transporte cooperativa interprovincial disco 14."
              ></textarea>
            </div>

            <div class="note-actions">
              <button
                type="button"
                class="ui primary button"
                :class="{ loading: actionLoadingId === pedido.documentId }"
                :disabled="actionLoadingId === pedido.documentId"
                @click="advancePedido(pedido, notaDespacho)"
              >
                Confirmar despacho
              </button>
              <button
                type="button"
                class="ui button"
                :disabled="actionLoadingId === pedido.documentId"
                @click="closeDespachoNote"
              >
                Cancelar
              </button>
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
  type EstadoPago,
  type MetodoPago,
  syncPedidosEstadoApi,
  type Pedido,
  type PedidoEstadoDespacho,
  updatePedidoPagoApi,
  updatePedidoDespachoApi,
} from "@/api/pedidos";
import { API_URL } from "@/utils/constants";

const ESTADOS_DESPACHO: PedidoEstadoDespacho[] = [
  "pendiente",
  "en_preparacion",
  "despachado",
  "entregado",
];

const pedidos = computed(() => pedidosState.value);
const loading = ref(false);
const actionLoadingId = ref<string | null>(null);
const activeNotePedidoId = ref<string | null>(null);
const activePagoNotePedidoId = ref<string | null>(null);
const notaDespacho = ref("");
const notaPago = ref("");
const successMessage = ref("");
const errorMessage = ref("");
const mediaBaseUrl = API_URL.replace(/\/api$/, "");

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

const isImageProof = (url: string) => /\.(png|jpe?g|webp|gif)$/i.test(url);

const metodoPagoLabel = (metodo: MetodoPago) => {
  switch (metodo) {
    case "deposito_bancario":
      return "Deposito bancario";
    case "transferencia":
      return "Transferencia";
    default:
      return metodo;
  }
};

const estadoPagoLabel = (estado: EstadoPago) => {
  switch (estado) {
    case "pendiente_verificacion":
      return "Pendiente de verificacion";
    case "aprobado":
      return "Pago aprobado";
    case "rechazado":
      return "Pago rechazado";
    default:
      return estado;
  }
};

const estadoLabel = (estado: PedidoEstadoDespacho) => {
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

const getEstadoIndex = (estado: PedidoEstadoDespacho) =>
  ESTADOS_DESPACHO.indexOf(estado);

const getNextEstado = (
  estado: PedidoEstadoDespacho,
): PedidoEstadoDespacho | null => {
  switch (estado) {
    case "pendiente":
      return "en_preparacion";
    case "en_preparacion":
      return "despachado";
    case "despachado":
      return "entregado";
    default:
      return null;
  }
};

const actionLabel = (estado: PedidoEstadoDespacho) => {
  switch (estado) {
    case "pendiente":
      return "Iniciar Preparacion";
    case "en_preparacion":
      return "Marcar como Despachado";
    case "despachado":
      return "Confirmar Entrega";
    default:
      return "Sin acciones";
  }
};

const closeDespachoNote = () => {
  activeNotePedidoId.value = null;
  notaDespacho.value = "";
};

const closePagoNote = () => {
  activePagoNotePedidoId.value = null;
  notaPago.value = "";
};

const toggleDespachoNote = (pedidoDocumentId: string) => {
  if (activeNotePedidoId.value === pedidoDocumentId) {
    closeDespachoNote();
    return;
  }

  closePagoNote();
  activeNotePedidoId.value = pedidoDocumentId;
  notaDespacho.value = "";
};

const togglePagoNote = (pedidoDocumentId: string) => {
  if (activePagoNotePedidoId.value === pedidoDocumentId) {
    closePagoNote();
    return;
  }

  closeDespachoNote();
  activePagoNotePedidoId.value = pedidoDocumentId;
  notaPago.value = "";
};

const updatePago = async (pedido: Pedido, estadoPago: EstadoPago) => {
  actionLoadingId.value = pedido.documentId;
  successMessage.value = "";
  errorMessage.value = "";

  try {
    await updatePedidoPagoApi(pedido.documentId, { estadoPago });
    successMessage.value = `El pago del pedido ${pedido.codigoPedido} cambio a ${estadoPagoLabel(estadoPago)}.`;
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar el estado del pago";
  } finally {
    actionLoadingId.value = null;
  }
};

const rejectPago = async (pedido: Pedido, note = "") => {
  actionLoadingId.value = pedido.documentId;
  successMessage.value = "";
  errorMessage.value = "";

  try {
    await updatePedidoPagoApi(pedido.documentId, {
      estadoPago: "rechazado",
      observacionPago: note,
    });
    successMessage.value = `El pago del pedido ${pedido.codigoPedido} fue rechazado.`;
    closePagoNote();
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar el estado del pago";
  } finally {
    actionLoadingId.value = null;
  }
};

const advancePedido = async (pedido: Pedido, note = "") => {
  const nextEstado = getNextEstado(pedido.estadoDespacho);

  if (!nextEstado) {
    return;
  }

  actionLoadingId.value = pedido.documentId;
  successMessage.value = "";
  errorMessage.value = "";

  try {
    await updatePedidoDespachoApi(pedido.documentId, {
      estadoDespacho: nextEstado,
      notaDespacho: nextEstado === "despachado" ? note : "",
    });

    successMessage.value = `El pedido ${pedido.codigoPedido} cambio a ${estadoLabel(nextEstado)}.`;
    closeDespachoNote();
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar el despacho";
  } finally {
    actionLoadingId.value = null;
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
        : "No se pudieron cargar los despachos";
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.dispatch-page {
  padding: 1rem;
}

.dispatch-header {
  margin-bottom: 1.5rem;
  padding-left: 1rem;
  border-left: 4px solid var(--aldea-red-700);
}

.dispatch-header .ui.header {
  color: var(--aldea-blue-900);
}

.dispatch-header p {
  margin: 0;
  color: var(--aldea-text-soft);
}

.dispatch-list {
  display: grid;
  gap: 1rem;
}

.dispatch-card {
  border-radius: 16px;
  border: 1px solid var(--aldea-border);
  box-shadow: var(--aldea-shadow);
}

.dispatch-card-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.dispatch-date {
  margin: 0.3rem 0 0;
  color: var(--aldea-text-soft);
}

.dispatch-customer {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
  color: var(--aldea-blue-700);
}

.dispatch-payment {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
  color: var(--aldea-blue-700);
}

.payment-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.payment-warning {
  margin: -0.35rem 0 1rem;
  color: #a35519;
  font-size: 0.9rem;
}

.payment-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.payment-pendiente_verificacion {
  background: var(--aldea-gold-100);
  color: #8a6116;
}

.payment-aprobado {
  background: var(--aldea-green-100);
  color: var(--aldea-green-700);
}

.payment-rechazado {
  background: var(--aldea-red-100);
  color: #a22b2b;
}

.dispatch-proof {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.proof-link {
  width: fit-content;
  font-weight: 600;
}

.proof-image {
  width: min(240px, 100%);
  border-radius: 12px;
  border: 1px solid var(--aldea-border);
  object-fit: cover;
}

.proof-file {
  color: #587089;
}

.dispatch-items {
  margin-bottom: 1rem;
}

.dispatch-items ul {
  margin: 0;
  padding-left: 1.2rem;
}

.dispatch-stepper {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  text-align: center;
  color: #7991aa;
}

.step-item.active,
.step-item.completed {
  color: var(--aldea-blue-900);
}

.step-dot {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #dfe8f3;
  font-weight: 700;
}

.step-item.active .step-dot {
  background: var(--aldea-red-700);
  color: #fff;
}

.step-item.completed .step-dot {
  background: var(--aldea-blue-100);
  color: var(--aldea-blue-700);
}

.step-label {
  font-size: 0.85rem;
}

.dispatch-note {
  margin-bottom: 1rem;
  color: var(--aldea-blue-700);
}

.payment-note {
  margin-bottom: 1rem;
  color: var(--aldea-red-700);
}

.dispatch-actions,
.note-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.dispatch-note-form {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e4ebf3;
}

@media (max-width: 767px) {
  .dispatch-stepper {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
