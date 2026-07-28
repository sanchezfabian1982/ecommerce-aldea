<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import jsPDF from "jspdf";
import { getPedidosApi, type Pedido } from "@/api/pedidos";
import {
  getCurrentUserApi,
  updateCurrentUserApi,
  USER_PROFILE_UPDATED_EVENT,
  type AuthUser,
} from "@/api/user";

const router = useRouter();
const loading = ref(true);
const saving = ref(false);
const loadError = ref("");
const successMessage = ref("");
const errorMessage = ref("");
const currentUser = ref<AuthUser | null>(null);
const sellerPedidos = ref<Pedido[]>([]);
const loadingSellerBalance = ref(false);
const sellerBalanceError = ref("");
const exportingPdf = ref(false);
const formData = ref({
  nombre: "",
  correo: "",
  telefono: "",
});

const isVendedora = computed(
  () => currentUser.value?.rol_tienda === "vendedora",
);
const roleLabel = computed(() => (isVendedora.value ? "Vendedora" : "Cliente"));
const totalVentasCobradas = computed(() =>
  sellerPedidos.value
    .filter((pedido) => pedido.estadoPago === "aprobado")
    .reduce((sum, pedido) => sum + pedido.total, 0),
);
const totalVentasEntregadas = computed(() =>
  sellerPedidos.value
    .filter((pedido) => pedido.estadoDespacho === "entregado")
    .reduce((sum, pedido) => sum + pedido.total, 0),
);
const totalPedidosVendedora = computed(() => sellerPedidos.value.length);
const totalPedidosEntregados = computed(
  () =>
    sellerPedidos.value.filter(
      (pedido) => pedido.estadoDespacho === "entregado",
    ).length,
);
const totalInvertidoCliente = computed(() =>
  sellerPedidos.value.reduce((sum, pedido) => sum + pedido.total, 0),
);
const totalPedidosCliente = computed(() => sellerPedidos.value.length);
const totalPedidosConComprobante = computed(
  () =>
    sellerPedidos.value.filter((pedido) => Boolean(pedido.comprobantePagoUrl))
      .length,
);
const hasEntregasSinPagoAprobado = computed(() =>
  sellerPedidos.value.some(
    (pedido) =>
      pedido.estadoDespacho === "entregado" && pedido.estadoPago !== "aprobado",
  ),
);
const hasCobrosAunNoEntregados = computed(() =>
  sellerPedidos.value.some(
    (pedido) =>
      pedido.estadoPago === "aprobado" && pedido.estadoDespacho !== "entregado",
  ),
);
const sellerBalanceStatus = computed(() => {
  if (hasEntregasSinPagoAprobado.value) {
    return {
      tone: "danger",
      label: "Entrega sin pago aprobado",
      message:
        "Hay pedidos marcados como entregados que todavia no tienen el pago aprobado.",
    };
  }

  if (hasCobrosAunNoEntregados.value) {
    return {
      tone: "warning",
      label: "Cobro pendiente de entrega",
      message: "Hay ventas cobradas que aun no se han entregado completamente.",
    };
  }

  return {
    tone: "success",
    label: "Caja y entrega alineadas",
    message:
      "Los cobros aprobados y las entregas registradas estan en equilibrio.",
  };
});

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

async function exportSellerBalancePdf() {
  if (!isVendedora.value || !currentUser.value) {
    return;
  }

  exportingPdf.value = true;

  try {
    const document = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const left = 18;
    let currentY = 20;
    const tableStartX = 18;
    const tableWidth = 174;
    const labelWidth = 104;
    const valueWidth = 70;
    const rowHeight = 12;
    const sellerName =
      currentUser.value.nombre?.trim() || "Vendedora no disponible";
    const pedidosIncluidos = sellerPedidos.value.slice(0, 5);
    const rows: Array<[string, string]> = [
      ["Ventas cobradas", formatPrice(totalVentasCobradas.value)],
      ["Ventas entregadas realmente", formatPrice(totalVentasEntregadas.value)],
      ["Total pedidos", String(totalPedidosVendedora.value)],
      ["Pedidos entregados", String(totalPedidosEntregados.value)],
      ["Estado de balance", sellerBalanceStatus.value.label],
    ];

    document.setFillColor(15, 52, 96);
    document.rect(0, 0, 210, 32, "F");
    document.setTextColor(255, 255, 255);
    document.setFont("helvetica", "bold");
    document.setFontSize(18);
    document.text("Fundacion ALDEA", left, currentY);

    currentY += 8;
    document.setFontSize(10);
    document.setFont("helvetica", "normal");
    document.text("Reporte de balance de ventas de vendedora", left, currentY);

    currentY = 44;
    document.setTextColor(24, 50, 75);
    document.setFont("helvetica", "bold");
    document.setFontSize(12);
    document.text("Datos de la vendedora", left, currentY);

    currentY += 8;
    document.setFont("helvetica", "normal");
    document.setFontSize(10.5);
    document.text(`Nombre: ${sellerName}`, left, currentY);
    currentY += 6;
    document.text(
      `Correo: ${currentUser.value.email?.trim() || "No registrado"}`,
      left,
      currentY,
    );
    currentY += 6;
    document.text(
      `Telefono: ${currentUser.value.telefono?.trim() || "No registrado"}`,
      left,
      currentY,
    );
    currentY += 6;
    document.text(
      `Fecha de emision: ${new Date().toLocaleDateString("es-EC")}`,
      left,
      currentY,
    );

    currentY += 14;
    document.setFont("helvetica", "bold");
    document.setFontSize(12);
    document.text("Desglose del balance", left, currentY);

    currentY += 6;
    document.setFillColor(232, 240, 250);
    document.setDrawColor(196, 212, 229);
    document.rect(tableStartX, currentY, labelWidth, rowHeight, "FD");
    document.rect(
      tableStartX + labelWidth,
      currentY,
      valueWidth,
      rowHeight,
      "FD",
    );
    document.setTextColor(24, 50, 75);
    document.setFont("helvetica", "bold");
    document.setFontSize(10.5);
    document.text("Concepto", tableStartX + 4, currentY + 7.5);
    document.text("Valor", tableStartX + labelWidth + 4, currentY + 7.5);

    currentY += rowHeight;
    document.setFont("helvetica", "normal");

    rows.forEach(([label, value], index) => {
      const isEven = index % 2 === 0;
      const fillColor: [number, number, number] = isEven
        ? [248, 251, 255]
        : [255, 255, 255];
      document.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
      document.rect(tableStartX, currentY, tableWidth, rowHeight, "FD");
      document.line(
        tableStartX + labelWidth,
        currentY,
        tableStartX + labelWidth,
        currentY + rowHeight,
      );
      document.text(label, tableStartX + 4, currentY + 7.5);
      document.text(value, tableStartX + labelWidth + 4, currentY + 7.5);
      currentY += rowHeight;
    });

    document.setFontSize(9.5);
    document.setTextColor(79, 104, 128);
    document.text(
      sellerBalanceStatus.value.message,
      left,
      Math.min(currentY + 10, 285),
      { maxWidth: 172 },
    );

    if (pedidosIncluidos.length > 0) {
      currentY = Math.min(currentY + 22, 250);
      document.setTextColor(24, 50, 75);
      document.setFont("helvetica", "bold");
      document.setFontSize(11);
      document.text("Pedidos incluidos en el balance", left, currentY);

      currentY += 7;
      document.setFont("helvetica", "normal");
      document.setFontSize(9.5);

      pedidosIncluidos.forEach((pedido) => {
        if (currentY > 280) {
          return;
        }

        document.text(
          `${pedido.codigoPedido}  |  ${formatPrice(pedido.total)}`,
          left,
          currentY,
        );
        currentY += 5.5;
      });
    }

    const normalizedName = sellerName
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "-");
    document.save(`balance-vendedora-${normalizedName || "aldea"}.pdf`);
  } finally {
    exportingPdf.value = false;
  }
}

async function loadSellerBalance() {
  if (!currentUser.value) {
    sellerPedidos.value = [];
    sellerBalanceError.value = "";
    return;
  }

  loadingSellerBalance.value = true;
  sellerBalanceError.value = "";

  try {
    sellerPedidos.value = await getPedidosApi();
  } catch (err) {
    sellerBalanceError.value =
      err instanceof Error
        ? err.message
        : "No se pudo cargar el balance de ventas";
  } finally {
    loadingSellerBalance.value = false;
  }
}

async function loadProfile() {
  loading.value = true;
  loadError.value = "";

  try {
    const user = await getCurrentUserApi();

    if (!user) {
      await router.replace("/login");
      return;
    }

    currentUser.value = user;
    formData.value = {
      nombre: user.nombre?.trim() || "",
      correo: user.email?.trim() || "",
      telefono: user.telefono?.trim() || "",
    };

    await loadSellerBalance();
  } catch (err) {
    loadError.value =
      err instanceof Error ? err.message : "No se pudo cargar tu perfil";
  } finally {
    loading.value = false;
  }
}

function handlePhoneInput(event: Event) {
  const target = event.target as HTMLInputElement | null;

  if (!target) {
    return;
  }

  const sanitizedValue = target.value.replace(/\D/g, "").slice(0, 10);
  formData.value.telefono = sanitizedValue;
}

async function saveProfile() {
  errorMessage.value = "";
  successMessage.value = "";

  const nombre = formData.value.nombre.trim();
  const correo = formData.value.correo.trim().toLowerCase();
  const telefono = formData.value.telefono.replace(/\D/g, "");

  if (!nombre || !correo) {
    errorMessage.value = "Debes completar nombre y correo.";
    return;
  }

  if (telefono && telefono.length !== 10) {
    errorMessage.value = "El telefono debe tener exactamente 10 digitos.";
    return;
  }

  saving.value = true;

  try {
    const updatedUser = await updateCurrentUserApi({
      nombre,
      correo,
      telefono,
    });

    currentUser.value = updatedUser;
    formData.value = {
      nombre: updatedUser.nombre?.trim() || "",
      correo: updatedUser.email?.trim() || "",
      telefono: updatedUser.telefono?.trim() || "",
    };
    successMessage.value = "Tu perfil fue actualizado correctamente.";
    window.dispatchEvent(new Event(USER_PROFILE_UPDATED_EVENT));
  } catch (err) {
    errorMessage.value =
      err instanceof Error ? err.message : "No se pudo actualizar el perfil";
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await loadProfile();
});
</script>

<template>
  <section class="profile-view">
    <div class="ui container profile-container">
      <div class="profile-grid">
        <article class="ui raised segment profile-summary-card">
          <p class="profile-eyebrow">Mi perfil</p>
          <h1 class="profile-title">Gestion de perfil</h1>
          <p class="profile-copy">
            Revisa y actualiza los datos de tu cuenta autenticada.
          </p>

          <div v-if="loading" class="ui active inline loader"></div>

          <div v-else-if="currentUser" class="profile-summary-content">
            <div class="profile-role-pill">
              {{ roleLabel }}
            </div>

            <dl class="profile-summary-list">
              <div>
                <dt>Nombre</dt>
                <dd>{{ currentUser.nombre || "Sin nombre registrado" }}</dd>
              </div>
              <div>
                <dt>Correo</dt>
                <dd>{{ currentUser.email || "Sin correo registrado" }}</dd>
              </div>
              <div>
                <dt>Telefono</dt>
                <dd>{{ currentUser.telefono || "No registrado" }}</dd>
              </div>
            </dl>

            <RouterLink
              v-if="isVendedora"
              class="ui button profile-action-button"
              to="/gestion_productos"
            >
              Ir a mi panel de gestion
            </RouterLink>

            <div v-if="isVendedora" class="seller-balance-card">
              <div class="seller-balance-head">
                <div>
                  <p class="seller-balance-label">Balance real de ventas</p>
                  <strong class="seller-balance-amount">
                    {{ formatPrice(totalVentasCobradas) }}
                  </strong>
                  <p class="seller-balance-caption">
                    Caja actual basada en pagos aprobados.
                  </p>
                </div>
                <RouterLink
                  class="ui button tiny profile-action-button secondary"
                  to="/gestion_despachos"
                >
                  Ver despachos
                </RouterLink>
              </div>

              <div class="seller-balance-actions">
                <button
                  type="button"
                  class="ui button tiny profile-action-button secondary"
                  :class="{ loading: exportingPdf }"
                  :disabled="loadingSellerBalance || exportingPdf"
                  @click="exportSellerBalancePdf"
                >
                  Exportar PDF
                </button>
              </div>

              <div
                v-if="loadingSellerBalance"
                class="ui active inline loader"
              ></div>

              <div v-else class="seller-balance-stats">
                <div class="seller-balance-stat">
                  <span>Ventas cobradas</span>
                  <strong>{{ formatPrice(totalVentasCobradas) }}</strong>
                </div>
                <div class="seller-balance-stat">
                  <span>Ventas entregadas realmente</span>
                  <strong>{{ formatPrice(totalVentasEntregadas) }}</strong>
                </div>
                <div class="seller-balance-stat">
                  <span>Total pedidos</span>
                  <strong>{{ totalPedidosVendedora }}</strong>
                </div>
              </div>

              <div
                v-if="!loadingSellerBalance"
                class="seller-balance-footnote"
                :class="`seller-balance-${sellerBalanceStatus.tone}`"
              >
                <span>
                  Cumplimiento logistico:
                  {{ totalPedidosEntregados }} entregados.
                </span>
                <span>
                  {{ sellerBalanceStatus.label }}
                </span>
                <span>{{ sellerBalanceStatus.message }}</span>
              </div>

              <p v-if="sellerBalanceError" class="seller-balance-error">
                {{ sellerBalanceError }}
              </p>
            </div>

            <div v-else class="customer-loyalty-card">
              <div class="seller-balance-head">
                <div>
                  <p class="seller-balance-label">Resumen de fidelidad</p>
                  <strong class="seller-balance-amount">
                    {{ formatPrice(totalInvertidoCliente) }}
                  </strong>
                  <p class="seller-balance-caption">
                    Total invertido por tu cuenta en la Fundacion ALDEA.
                  </p>
                </div>
                <RouterLink
                  class="ui button tiny profile-action-button secondary"
                  to="/orders"
                >
                  Ver mis pedidos
                </RouterLink>
              </div>

              <div
                v-if="loadingSellerBalance"
                class="ui active inline loader"
              ></div>

              <div v-else class="seller-balance-stats">
                <div class="seller-balance-stat">
                  <span>Total invertido</span>
                  <strong>{{ formatPrice(totalInvertidoCliente) }}</strong>
                </div>
                <div class="seller-balance-stat">
                  <span>Pedidos realizados</span>
                  <strong>{{ totalPedidosCliente }}</strong>
                </div>
                <div class="seller-balance-stat">
                  <span>Comprobantes disponibles</span>
                  <strong>{{ totalPedidosConComprobante }}</strong>
                </div>
              </div>

              <div class="customer-loyalty-footnote">
                <span>
                  Desde Mis pedidos puedes revisar cada orden y descargar el
                  comprobante adjunto cuando lo necesites.
                </span>
              </div>

              <p v-if="sellerBalanceError" class="seller-balance-error">
                {{ sellerBalanceError }}
              </p>
            </div>
          </div>

          <div v-if="loadError" class="ui negative message profile-message">
            <p>{{ loadError }}</p>
          </div>
        </article>

        <article class="ui raised segment profile-form-card">
          <h2 class="ui header">Actualizar datos personales</h2>
          <form class="ui form" @submit.prevent="saveProfile">
            <div class="field">
              <label>Nombre</label>
              <input
                v-model="formData.nombre"
                type="text"
                placeholder="Tu nombre"
                :disabled="loading || saving"
              />
            </div>

            <div class="field">
              <label>Correo</label>
              <input
                v-model="formData.correo"
                type="email"
                placeholder="correo@ejemplo.com"
                :disabled="loading || saving"
              />
            </div>

            <div class="field">
              <label>Telefono</label>
              <input
                :value="formData.telefono"
                type="tel"
                maxlength="10"
                placeholder="09XXXXXXXX"
                :disabled="loading || saving"
                @input="handlePhoneInput"
              />
              <small class="profile-help-text">
                Solo numeros. Debe tener exactamente 10 digitos.
              </small>
            </div>

            <button
              class="ui primary button"
              type="submit"
              :class="{ loading: saving }"
              :disabled="loading || saving"
            >
              Guardar cambios
            </button>

            <div
              v-if="successMessage"
              class="ui positive message profile-message"
            >
              <p>{{ successMessage }}</p>
            </div>

            <div
              v-if="errorMessage"
              class="ui negative message profile-message"
            >
              <p>{{ errorMessage }}</p>
            </div>
          </form>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.profile-view {
  padding: 2rem 0 3rem;
}

.profile-container {
  max-width: 1100px;
}

.profile-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  align-items: start;
}

.profile-summary-card,
.profile-form-card {
  border-radius: 20px;
  border: 1px solid #dbe6f2;
  box-shadow: 0 18px 45px rgba(15, 52, 96, 0.08);
}

.profile-summary-card {
  background:
    radial-gradient(
      circle at top left,
      rgba(21, 101, 192, 0.14),
      transparent 42%
    ),
    linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%);
}

.profile-eyebrow {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0b63ce;
}

.profile-title {
  margin: 0;
  font-size: 2rem;
  line-height: 1.1;
  color: #18324b;
}

.profile-copy {
  margin: 0.85rem 0 1.5rem;
  color: #4c6782;
  line-height: 1.6;
}

.profile-summary-content {
  display: grid;
  gap: 1rem;
}

.profile-role-pill {
  display: inline-flex;
  width: fit-content;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  background: #0b63ce;
  color: #fff;
  font-weight: 700;
}

.profile-summary-list {
  margin: 0;
  display: grid;
  gap: 0.9rem;
}

.profile-summary-list div {
  padding: 0.9rem 1rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.74);
}

.profile-summary-list dt {
  margin-bottom: 0.35rem;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64809a;
}

.profile-summary-list dd {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #17324c;
}

.profile-action-button {
  width: fit-content;
  background: #18324b;
  color: #fff;
}

.profile-help-text {
  display: block;
  margin-top: 0.45rem;
  color: #58728b;
}

.seller-balance-card {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(24, 50, 75, 0.12);
}

.customer-loyalty-card {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(24, 50, 75, 0.12);
}

.seller-balance-head {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  align-items: center;
}

.seller-balance-label {
  margin: 0 0 0.3rem;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64809a;
}

.seller-balance-amount {
  font-size: 1.8rem;
  color: #17324c;
}

.seller-balance-caption {
  margin: 0.35rem 0 0;
  color: #58728b;
  font-size: 0.88rem;
}

.profile-action-button.secondary {
  background: #f3f7fb;
  color: #18324b;
}

.seller-balance-actions {
  display: flex;
  justify-content: flex-end;
}

.seller-balance-stats {
  display: grid;
  gap: 0.8rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.seller-balance-stat {
  padding: 0.85rem;
  border-radius: 14px;
  background: #f7fbff;
  border: 1px solid #dbe6f2;
}

.seller-balance-stat span {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.82rem;
  color: #58728b;
}

.seller-balance-stat strong {
  color: #17324c;
  font-size: 1rem;
}

.seller-balance-error {
  margin: 0;
  color: #9f3a38;
  font-weight: 600;
}

.seller-balance-footnote {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  font-size: 0.88rem;
  color: #4f6880;
}

.seller-balance-success {
  background: #edf9f1;
  border: 1px solid #b7e2c4;
  color: #1d6b3b;
}

.seller-balance-warning {
  background: #fff7e8;
  border: 1px solid #f1d18c;
  color: #9a6500;
}

.seller-balance-danger {
  background: #fff1f0;
  border: 1px solid #f0b3ae;
  color: #a3332d;
}

.customer-loyalty-footnote {
  padding: 0.85rem 1rem;
  border-radius: 14px;
  background: #eef5ff;
  border: 1px solid #d8e4f4;
  color: #35526c;
  font-size: 0.88rem;
  line-height: 1.5;
}

.profile-message {
  margin-top: 1rem;
}

@media (max-width: 860px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }

  .seller-balance-head,
  .seller-balance-stats {
    grid-template-columns: 1fr;
  }

  .seller-balance-head {
    display: grid;
  }
}
</style>
