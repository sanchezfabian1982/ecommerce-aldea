<template>
  <section class="ui raised segment seller-section">
    <div class="seller-head">
      <div>
        <h1 class="ui header">
          {{ editingProductId ? "Editar producto" : "Publicar producto" }}
        </h1>
        <p>
          Completa la información para
          {{ editingProductId ? "actualizar" : "enviar" }} tu producto.
        </p>
      </div>
    </div>

    <form class="ui form" @submit.prevent="submitProducto">
      <div class="two fields stackable">
        <div class="field">
          <label>Nombre del producto</label>
          <input
            v-model="formData.nombre"
            type="text"
            placeholder="Ej. Canasta artesanal"
          />
        </div>

        <div class="field">
          <label>Categoría</label>
          <select v-model="formData.categoriaDocumentId" class="ui dropdown">
            <option value="">Selecciona una categoria</option>
            <option
              v-for="categoria in categorias"
              :key="categoria.id"
              :value="categoria.documentId"
            >
              {{ categoria.nombre }}
            </option>
          </select>
        </div>
      </div>

      <div class="field">
        <label>Descripción</label>
        <textarea
          v-model="formData.descripcion"
          rows="4"
          placeholder="Describe tu producto"
        ></textarea>
      </div>

      <div class="two fields stackable">
        <div class="field">
          <label>Precio</label>
          <input
            v-model.number="formData.precio"
            type="number"
            min="0"
            step="0.01"
          />
        </div>

        <div class="field">
          <label>Stock</label>
          <input
            v-model.number="formData.stock"
            type="number"
            min="0"
            step="1"
          />
        </div>
      </div>

      <div class="field">
        <label>Imagen</label>
        <input
          ref="imageInput"
          type="file"
          accept="image/*"
          @change="handleFileChange"
        />
        <div class="image-guidance">
          <strong>Requisito recomendado antes de publicar:</strong>
          <span>
            Sube una imagen cuadrada de al menos 800 x 800 px, con el producto
            centrado y fondo limpio.
          </span>
          <span>
            Formatos sugeridos: JPG, PNG o WEBP. Idealmente menor a 500 KB para
            una carga mas rapida.
          </span>
        </div>
        <div v-if="imagePreviewUrl" class="image-preview-card">
          <div class="image-preview-head">
            <span v-if="isImageReady" class="image-ready-badge">
              Imagen apta
            </span>
            <span v-else class="image-pending-badge">
              {{
                imageProcessing ? "Validando imagen..." : "Pendiente de validar"
              }}
            </span>

            <button
              type="button"
              class="ui button tiny image-remove-button"
              @click="clearSelectedImage"
            >
              Quitar imagen
            </button>
          </div>

          <img
            :src="imagePreviewUrl"
            alt="Vista previa de la imagen del producto"
            class="image-preview"
          />

          <div v-if="imageMetadata" class="image-preview-meta">
            <span v-if="imageMetadata.width > 0 && imageMetadata.height > 0"
              >{{ imageMetadata.width }} x {{ imageMetadata.height }} px</span
            >
            <span
              >Peso original:
              {{ formatFileSize(imageMetadata.originalSize) }}</span
            >
            <span>
              Peso final: {{ formatFileSize(imageMetadata.finalSize) }}
            </span>
            <span
              v-if="imageMetadata.wasCompressed"
              class="image-compressed-pill"
            >
              Comprimida automaticamente
            </span>
          </div>
        </div>
        <small v-if="imageError" class="image-error">{{ imageError }}</small>
        <small v-if="editingProductId"
          >Deja este campo vacío para mantener la imagen actual.</small
        >
      </div>

      <div class="seller-actions">
        <button
          type="submit"
          class="ui primary button"
          :class="{ loading: submitting }"
          :disabled="submitting"
        >
          {{ editingProductId ? "Actualizar producto" : "Guardar producto" }}
        </button>

        <button
          v-if="editingProductId"
          type="button"
          class="ui button"
          :disabled="submitting"
          @click="resetForm"
        >
          Cancelar edición
        </button>
      </div>

      <div v-if="successMessage" class="ui positive message">
        <p>{{ successMessage }}</p>
      </div>

      <div v-if="errorMessage" class="ui negative message">
        <p>{{ errorMessage }}</p>
      </div>
    </form>
  </section>

  <section class="ui raised segment seller-section products-section">
    <div class="seller-head">
      <div>
        <h2 class="ui header">Mis productos publicados</h2>
        <p>
          Administra tu catálogo activo. Puedes editar información, reabastecer
          stock o eliminar productos.
        </p>
      </div>
    </div>

    <div v-if="loadingProductos" class="ui active inline loader"></div>
    <div v-else-if="loadError" class="ui negative message">
      <p>{{ loadError }}</p>
    </div>
    <div v-else-if="productosDeLaVendedora.length === 0" class="ui message">
      <p>No tienes productos publicados todavía.</p>
    </div>
    <div v-else>
      <div class="product-search-box">
        <div class="product-search-row">
          <div class="ui icon input fluid">
            <input
              v-model.trim="searchTerm"
              type="text"
              placeholder="Buscar por titulo del producto"
            />
            <i class="search icon"></i>
          </div>

          <button
            type="button"
            class="ui button"
            :disabled="!searchTerm"
            @click="clearSearch"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div v-if="productosFiltrados.length === 0" class="ui message">
        <p>No se encontraron productos con ese título.</p>
      </div>

      <div v-else class="ui stackable cards seller-cards">
        <article
          v-for="producto in productosFiltrados"
          :key="producto.documentId"
          class="ui fluid card seller-card"
        >
          <div class="content">
            <div class="header">{{ producto.nombre }}</div>
            <div class="meta">Vende: {{ producto.vendedoraNombre }}</div>
            <div class="description product-copy">
              <p>{{ producto.descripcion }}</p>
              <p><strong>Precio:</strong> {{ formatPrice(producto.precio) }}</p>
              <p><strong>Stock:</strong> {{ producto.stock ?? 0 }}</p>
              <p><strong>Categoria:</strong> {{ producto.categoriaNombre }}</p>
            </div>
          </div>

          <div
            v-if="canManageProducto(producto)"
            class="extra content product-actions"
          >
            <button
              type="button"
              class="ui teal button"
              :disabled="restockingProductId === producto.documentId"
              @click="openRestockForm(producto)"
            >
              {{
                activeRestockProductId === producto.documentId
                  ? "Cerrar abastecimiento"
                  : "Abastecer"
              }}
            </button>
            <button
              type="button"
              class="ui button"
              @click="startEdit(producto)"
            >
              Editar
            </button>
            <button
              type="button"
              class="ui negative button"
              :disabled="deletingProductId === producto.documentId"
              @click="removeProducto(producto)"
            >
              {{
                deletingProductId === producto.documentId
                  ? "Eliminando..."
                  : "Eliminar"
              }}
            </button>
          </div>

          <div
            v-if="activeRestockProductId === producto.documentId"
            class="extra content restock-panel"
          >
            <form class="ui form" @submit.prevent="submitRestock(producto)">
              <div class="field">
                <label>Unidades a agregar</label>
                <input
                  v-model.number="restockQuantity"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Ej. 10"
                />
              </div>

              <div class="restock-actions">
                <button
                  type="submit"
                  class="ui teal button"
                  :class="{
                    loading: restockingProductId === producto.documentId,
                  }"
                  :disabled="restockingProductId === producto.documentId"
                >
                  Guardar stock
                </button>
                <button
                  type="button"
                  class="ui button"
                  :disabled="restockingProductId === producto.documentId"
                  @click="closeRestockForm"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
import { getCategoriesApi } from "@/api/categoria";
import {
  createProductoApi,
  deleteProductoApi,
  getMisProductosApi,
  updateProductoApi,
  type Producto,
} from "@/api/producto";
import { getCurrentUserApi } from "@/api/user";
import type { CategoriaOption, ProductoFormData } from "@/types/producto";

type RawCategoria = {
  id?: number | string;
  documentId?: string;
  nombre?: string;
  name?: string;
  attributes?: {
    documentId?: string;
    nombre?: string;
    name?: string;
  };
};

const categorias = ref<CategoriaOption[]>([]);
const productos = ref<Producto[]>([]);
const currentUserId = ref<number | string | null>(null);
const editingProductId = ref<string | null>(null);
const deletingProductId = ref<string | null>(null);
const activeRestockProductId = ref<string | null>(null);
const restockingProductId = ref<string | null>(null);
const restockQuantity = ref(1);
const loadingProductos = ref(false);
const loadError = ref("");
const searchTerm = ref("");
const submitting = ref(false);
const successMessage = ref("");
const errorMessage = ref("");
const imageError = ref("");
const imageProcessing = ref(false);
const imagePreviewUrl = ref("");
const imageMetadata = ref<{
  width: number;
  height: number;
  originalSize: number;
  finalSize: number;
  wasCompressed: boolean;
} | null>(null);
const imageInput = useTemplateRef<HTMLInputElement>("imageInput");
const formData = ref<ProductoFormData>({
  nombre: "",
  descripcion: "",
  precio: 0,
  stock: 0,
  categoriaDocumentId: "",
  imagen: null,
});

const productosDeLaVendedora = computed(() =>
  productos.value.filter((producto) => canManageProducto(producto)),
);
const productosFiltrados = computed(() => {
  const query = searchTerm.value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (!query) {
    return productosDeLaVendedora.value;
  }

  return productosDeLaVendedora.value.filter((producto) =>
    producto.nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .includes(query),
  );
});
const isImageReady = computed(
  () =>
    Boolean(formData.value.imagen) &&
    !imageError.value &&
    !imageProcessing.value,
);

function resetImageState() {
  if (imagePreviewUrl.value) {
    URL.revokeObjectURL(imagePreviewUrl.value);
  }

  imagePreviewUrl.value = "";
  imageMetadata.value = null;
  imageError.value = "";
  imageProcessing.value = false;
  formData.value.imagen = null;

  if (imageInput.value) {
    imageInput.value.value = "";
  }
}

function clearSelectedImage() {
  resetImageState();
}

function resetForm() {
  editingProductId.value = null;
  resetImageState();
  formData.value = {
    nombre: "",
    descripcion: "",
    precio: 0,
    stock: 0,
    categoriaDocumentId: "",
    imagen: null,
  };
}

function clearSearch() {
  searchTerm.value = "";
}

function normalizeCategorias(payload: unknown): CategoriaOption[] {
  const source = payload as { data?: unknown } | null;
  const rawCategorias = Array.isArray(source?.data)
    ? (source?.data as RawCategoria[])
    : Array.isArray(payload)
      ? (payload as RawCategoria[])
      : [];

  return rawCategorias
    .map((item) => {
      const values = item.attributes ?? item;
      const id = item.id;
      const documentId = item.documentId ?? values.documentId;
      const nombre = values.nombre ?? values.name;

      if (id == null || !documentId || !nombre) {
        return null;
      }

      return {
        id,
        documentId,
        nombre,
        slug: "",
      };
    })
    .filter((item): item is CategoriaOption => item !== null);
}

async function loadCategorias() {
  const response = await getCategoriesApi();
  categorias.value = normalizeCategorias(response);
}

async function loadProductos() {
  loadingProductos.value = true;
  loadError.value = "";

  try {
    productos.value = await getMisProductosApi();
  } catch (error) {
    loadError.value =
      error instanceof Error
        ? error.message
        : "No se pudieron cargar los productos";
  } finally {
    loadingProductos.value = false;
  }
}

async function loadCurrentUser() {
  const currentUser = await getCurrentUserApi();
  currentUserId.value = currentUser?.id ?? null;
}

function canManageProducto(producto: Producto) {
  if (currentUserId.value == null || producto.vendedoraId == null) {
    return false;
  }

  return String(producto.vendedoraId) === String(currentUserId.value);
}

function startEdit(producto: Producto) {
  editingProductId.value = producto.documentId;
  successMessage.value = "";
  errorMessage.value = "";
  resetImageState();
  closeRestockForm();
  formData.value = {
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    precio: producto.precio ?? 0,
    stock: producto.stock ?? 0,
    categoriaDocumentId: producto.categoriaDocumentId,
    imagen: null,
  };
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openRestockForm(producto: Producto) {
  if (activeRestockProductId.value === producto.documentId) {
    closeRestockForm();
    return;
  }

  activeRestockProductId.value = producto.documentId;
  restockQuantity.value = 1;
  successMessage.value = "";
  errorMessage.value = "";
}

function closeRestockForm() {
  activeRestockProductId.value = null;
  restockQuantity.value = 1;
}

async function submitRestock(producto: Producto) {
  if (!canManageProducto(producto)) {
    return;
  }

  const cantidadAgregar = Number(restockQuantity.value);

  if (!Number.isFinite(cantidadAgregar) || cantidadAgregar <= 0) {
    successMessage.value = "";
    errorMessage.value =
      "Ingresa una cantidad válida para abastecer el producto.";
    return;
  }

  restockingProductId.value = producto.documentId;
  successMessage.value = "";
  errorMessage.value = "";

  try {
    await updateProductoApi(producto.documentId, {
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precio: producto.precio ?? 0,
      stock: (producto.stock ?? 0) + cantidadAgregar,
      categoriaDocumentId: producto.categoriaDocumentId,
      imagen: null,
    });

    successMessage.value = `Se agregaron ${cantidadAgregar} unidades a ${producto.nombre}.`;
    await loadProductos();
    closeRestockForm();

    if (editingProductId.value === producto.documentId) {
      const updatedProducto = productos.value.find(
        (item) => item.documentId === producto.documentId,
      );

      if (updatedProducto) {
        startEdit(updatedProducto);
      }
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : "No se pudo abastecer el producto";
  } finally {
    restockingProductId.value = null;
  }
}

async function removeProducto(producto: Producto) {
  if (!canManageProducto(producto)) {
    return;
  }

  const shouldDelete = window.confirm(
    `Vas a eliminar el producto \"${producto.nombre}\". Esta acción no se puede deshacer.`,
  );

  if (!shouldDelete) {
    return;
  }

  deletingProductId.value = producto.documentId;
  successMessage.value = "";
  errorMessage.value = "";

  try {
    await deleteProductoApi(producto.documentId);
    successMessage.value = "Producto eliminado correctamente.";
    await loadProductos();

    if (editingProductId.value === producto.documentId) {
      resetForm();
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : "No se pudo eliminar el producto";
  } finally {
    deletingProductId.value = null;
  }
}

function formatPrice(price: number | null) {
  const numericPrice = typeof price === "number" ? price : 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numericPrice);
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

function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const dimensions = {
        width: image.naturalWidth,
        height: image.naturalHeight,
      };

      URL.revokeObjectURL(imageUrl);
      resolve(dimensions);
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("No se pudo leer la imagen seleccionada."));
    };

    image.src = imageUrl;
  });
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("No se pudo procesar la imagen seleccionada."));
    };

    image.src = imageUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new Error(
              "No se pudo generar una version comprimida de la imagen.",
            ),
          );
          return;
        }

        resolve(blob);
      },
      type,
      quality,
    );
  });
}

async function compressImageFile(file: File, maxBytes: number): Promise<File> {
  const image = await loadImageElement(file);
  const outputType =
    file.type === "image/webp"
      ? "image/webp"
      : file.type === "image/png"
        ? "image/webp"
        : "image/jpeg";
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const extension = outputType === "image/webp" ? "webp" : "jpg";
  const dimensionFactors = [1, 0.92, 0.86, 0.8, 0.74];
  const qualities = [0.92, 0.86, 0.8, 0.74, 0.68, 0.62, 0.56];

  for (const factor of dimensionFactors) {
    const targetWidth = Math.max(800, Math.round(image.naturalWidth * factor));
    const targetHeight = Math.max(
      800,
      Math.round(image.naturalHeight * factor),
    );
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("No se pudo preparar la compresion de la imagen.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    for (const quality of qualities) {
      const blob = await canvasToBlob(canvas, outputType, quality);

      if (blob.size <= maxBytes) {
        return new File([blob], `${baseName}.${extension}`, {
          type: outputType,
          lastModified: Date.now(),
        });
      }
    }
  }

  throw new Error(
    "No fue posible optimizar la imagen por debajo de 500 KB. Prueba con una imagen mas liviana.",
  );
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0] ?? null;

  resetImageState();

  if (!file) {
    return;
  }

  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
  const lowerName = file.name.toLowerCase();
  const hasValidExtension = [".jpg", ".jpeg", ".png", ".webp"].some(
    (extension) => lowerName.endsWith(extension),
  );

  if (!allowedMimeTypes.includes(file.type) && !hasValidExtension) {
    imageError.value = "La imagen debe estar en formato JPG, PNG o WEBP.";
    target.value = "";
    return;
  }

  imagePreviewUrl.value = URL.createObjectURL(file);
  imageMetadata.value = {
    width: 0,
    height: 0,
    originalSize: file.size,
    finalSize: file.size,
    wasCompressed: false,
  };
  imageProcessing.value = true;

  try {
    const sourceFile = file;
    const optimizedFile =
      sourceFile.size > 500 * 1024
        ? await compressImageFile(sourceFile, 500 * 1024)
        : sourceFile;

    if (imagePreviewUrl.value) {
      URL.revokeObjectURL(imagePreviewUrl.value);
    }

    const previewUrl = URL.createObjectURL(optimizedFile);
    const { width, height } = await readImageDimensions(optimizedFile);
    const aspectRatio = width / height;
    const isSquare = aspectRatio >= 0.95 && aspectRatio <= 1.05;

    if (width < 800 || height < 800) {
      imageError.value =
        "La imagen debe tener al menos 800 x 800 px para publicar el producto.";
      URL.revokeObjectURL(previewUrl);
      target.value = "";
      imageProcessing.value = false;
      return;
    }

    if (!isSquare) {
      imageError.value =
        "La imagen debe ser cuadrada o casi cuadrada para que se vea uniforme en el catalogo.";
      URL.revokeObjectURL(previewUrl);
      target.value = "";
      imageProcessing.value = false;
      return;
    }

    imagePreviewUrl.value = previewUrl;
    imageMetadata.value = {
      width,
      height,
      originalSize: sourceFile.size,
      finalSize: optimizedFile.size,
      wasCompressed: optimizedFile.size !== sourceFile.size,
    };
    formData.value.imagen = optimizedFile;
  } catch (error) {
    imageError.value =
      error instanceof Error
        ? error.message
        : "No se pudo validar la imagen seleccionada.";
    target.value = "";
  } finally {
    imageProcessing.value = false;
  }
}

async function submitProducto() {
  successMessage.value = "";
  errorMessage.value = "";

  if (imageError.value) {
    errorMessage.value = imageError.value;
    return;
  }

  if (imageProcessing.value) {
    errorMessage.value =
      "Espera a que termine la validacion de la imagen antes de publicar.";
    return;
  }

  submitting.value = true;

  try {
    if (editingProductId.value) {
      await updateProductoApi(editingProductId.value, formData.value);
      successMessage.value = "Producto actualizado correctamente.";
    } else {
      await createProductoApi(formData.value);
      successMessage.value = "Producto enviado correctamente.";
    }

    resetForm();
    await loadProductos();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "No se pudo enviar el producto";
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadCategorias(), loadCurrentUser(), loadProductos()]);
});

onBeforeUnmount(() => {
  if (imagePreviewUrl.value) {
    URL.revokeObjectURL(imagePreviewUrl.value);
  }
});
</script>

<style scoped>
.seller-section {
  border-radius: 16px;
  max-width: 920px;
  margin-bottom: 1.5rem;
  border: 1px solid var(--aldea-border);
  box-shadow: var(--aldea-shadow);
}

.seller-head {
  margin-bottom: 1.5rem;
  padding-left: 1rem;
  border-left: 4px solid var(--aldea-red-700);
}

.seller-head .ui.header {
  color: var(--aldea-blue-900);
}

.seller-head p {
  margin: 0;
  color: var(--aldea-text-soft);
}

.seller-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.products-section {
  margin-top: 1.5rem;
}

.seller-cards {
  margin-top: 1rem;
}

.product-search-box {
  margin: 0.75rem 0 1rem;
}

.product-search-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.65rem;
  align-items: center;
}

@media (max-width: 640px) {
  .product-search-row {
    grid-template-columns: 1fr;
  }
}

.seller-card {
  width: 100%;
  border: 1px solid var(--aldea-border);
  box-shadow: 0 10px 22px rgba(18, 59, 102, 0.06);
}

.product-copy p {
  margin-bottom: 0.6rem;
}

.product-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.restock-panel {
  background: linear-gradient(180deg, #f8fbff 0%, #eef5fb 100%);
  border-top: 1px solid var(--aldea-border);
}

.restock-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
}

.image-guidance {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-top: 0.55rem;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  background: linear-gradient(180deg, #fff7f3 0%, #fffdfb 100%);
  border: 1px solid rgba(185, 71, 44, 0.18);
  color: var(--aldea-blue-900);
  font-size: 0.9rem;
  line-height: 1.45;
}

.image-guidance strong {
  color: var(--aldea-red-700);
}

.image-preview-card {
  margin-top: 0.8rem;
  padding: 0.9rem;
  border-radius: 16px;
  border: 1px solid var(--aldea-border);
  background: linear-gradient(180deg, #f9fcff 0%, #f1f7fd 100%);
}

.image-preview-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.65rem;
}

.image-ready-badge,
.image-pending-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.image-ready-badge {
  background: var(--aldea-green-100);
  color: var(--aldea-green-700);
}

.image-pending-badge {
  background: var(--aldea-gold-100);
  color: #8a6116;
}

.image-preview {
  width: min(220px, 100%);
  aspect-ratio: 1 / 1;
  object-fit: contain;
  object-position: center;
  display: block;
  margin: 0 auto;
  padding: 0.6rem;
  border-radius: 14px;
  background: #fff;
  border: 1px solid rgba(215, 228, 242, 0.9);
}

.image-preview-meta {
  margin-top: 0.7rem;
  display: flex;
  justify-content: center;
  gap: 0.9rem;
  flex-wrap: wrap;
  color: var(--aldea-text-soft);
  font-size: 0.84rem;
  font-weight: 600;
}

.image-compressed-pill {
  background: var(--aldea-blue-100);
  color: var(--aldea-blue-700);
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
}

.image-remove-button {
  border-radius: 10px !important;
}

.image-error {
  display: block;
  margin-top: 0.45rem;
  color: #a22b2b;
  font-size: 0.88rem;
  font-weight: 600;
}
</style>
