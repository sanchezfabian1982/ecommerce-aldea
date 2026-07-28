<template>
  <div class="ui form checkout-form">
    <div class="field">
      <label>Direccion de entrega</label>
      <textarea
        :value="modelValue.direccionEntrega"
        rows="2"
        placeholder="Ej. Calle, secundaria, barrio, ciudad, provincia"
        @input="
          updateField(
            'direccionEntrega',
            ($event.target as HTMLTextAreaElement).value,
          )
        "
      ></textarea>
    </div>

    <div class="field">
      <label>Telefono de contacto</label>
      <input
        :value="modelValue.telefonoContacto"
        type="tel"
        inputmode="numeric"
        maxlength="10"
        placeholder="0999999999"
        @input="handlePhoneInput"
      />
      <small v-if="phoneError" class="input-error">{{ phoneError }}</small>
    </div>

    <div class="field">
      <label>Metodo de pago</label>
      <select
        :value="modelValue.metodoPago"
        class="ui dropdown"
        @change="
          updateField(
            'metodoPago',
            ($event.target as HTMLSelectElement).value as MetodoPago,
          )
        "
      >
        <option value="deposito_bancario">Deposito bancario</option>
        <option value="transferencia">Transferencia</option>
      </select>
    </div>

    <div class="field">
      <label>Comprobante de pago (PDF o imagen)</label>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        @change="handleFileChange"
      />
      <small class="input-help">
        Formatos permitidos: PDF, JPG, PNG, WEBP. Maximo 5 MB.
      </small>
      <div v-if="modelValue.comprobantePago" class="file-selected">
        <i :class="selectedFileIcon"></i>
        <img
          v-if="previewUrl"
          :src="previewUrl"
          alt="Vista previa del comprobante"
          class="file-preview"
        />
        <div class="file-meta">
          <small class="file-name">
            {{ modelValue.comprobantePago.name }}
          </small>
          <small class="file-size">
            {{ formatFileSize(modelValue.comprobantePago.size) }}
          </small>
        </div>
        <button
          type="button"
          class="ui button tiny remove-file-button"
          @click="clearSelectedFile"
        >
          Quitar
        </button>
      </div>
      <small v-if="fileError" class="input-error">{{ fileError }}</small>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { MetodoPago } from "@/api/pedidos";

export type FormularioPagoState = {
  direccionEntrega: string;
  telefonoContacto: string;
  metodoPago: MetodoPago;
  comprobantePago: File | null;
};

const props = defineProps<{
  modelValue: FormularioPagoState;
}>();

const phoneError = ref("");
const fileError = ref("");
const previewUrl = ref("");

const emit = defineEmits<{
  (event: "update:modelValue", value: FormularioPagoState): void;
}>();

const selectedFileIcon = computed(() => {
  const file = props.modelValue.comprobantePago;

  if (!file) {
    return "file outline icon";
  }

  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".pdf") || file.type === "application/pdf") {
    return "file pdf outline icon";
  }

  return "file image outline icon";
});

watch(
  () => props.modelValue.comprobantePago,
  (file) => {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
      previewUrl.value = "";
    }

    if (!file) {
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isPdf = lowerName.endsWith(".pdf") || file.type === "application/pdf";

    if (!isPdf) {
      previewUrl.value = URL.createObjectURL(file);
    }
  },
  { immediate: true },
);

function updateField<Key extends keyof FormularioPagoState>(
  key: Key,
  value: FormularioPagoState[Key],
) {
  emit("update:modelValue", {
    ...props.modelValue,
    [key]: value,
  });
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function handlePhoneInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const rawValue = target.value;
  const numericOnly = rawValue.replace(/\D/g, "").slice(0, 10);

  phoneError.value = /\D/.test(rawValue) ? "solo se admiten numeros" : "";
  target.value = numericOnly;
  updateField("telefonoContacto", numericOnly);
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0] ?? null;
  const maxFileSizeBytes = 5 * 1024 * 1024;

  if (!file) {
    fileError.value = "";
    updateField("comprobantePago", null);
    return;
  }

  const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ];
  const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
  const lowerName = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some((extension) =>
    lowerName.endsWith(extension),
  );

  if (!allowedMimeTypes.includes(file.type) && !hasValidExtension) {
    fileError.value = "Solo se admiten archivos PDF, JPG, PNG o WEBP.";
    target.value = "";
    updateField("comprobantePago", null);
    return;
  }

  if (file.size > maxFileSizeBytes) {
    fileError.value = "El comprobante no debe superar los 5 MB.";
    target.value = "";
    updateField("comprobantePago", null);
    return;
  }

  fileError.value = "";
  updateField("comprobantePago", file);
}

function clearSelectedFile() {
  fileError.value = "";
  updateField("comprobantePago", null);
}
</script>

<style scoped>
.file-name {
  color: #52677d;
}

.file-meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.file-size {
  color: #7d8ea0;
}

.file-selected {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.45rem;
  color: #52677d;
}

.remove-file-button {
  margin-left: auto;
}

.file-preview {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid #d6e2ef;
}

.input-help {
  display: block;
  margin-top: 0.35rem;
  color: #6d7f91;
}

.input-error {
  display: block;
  margin-top: 0.35rem;
  color: #c0392b;
}
</style>
