<template>
  <section class="ui raised segment page-section">
    <h2 class="ui header">Categoria: {{ slug }}</h2>

    <div v-if="loading" class="ui active inline loader"></div>

    <p v-else-if="errorMessage" class="ui negative message">
      {{ errorMessage }}
    </p>

    <p v-else-if="products.length === 0" class="ui message">
      No hay productos para esta categoria.
    </p>

    <div v-else class="ui grid stackable">
      <div
        v-for="product in products"
        :key="product.id"
        class="sixteen wide mobile eight wide tablet four wide computer column"
      >
        <ProductoCard :producto="product" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { getProductosByCategoriaSlugApi, type Producto } from "@/api/producto";
import ProductoCard from "@/components/ProductoCard.vue";

const route = useRoute();
const slug = computed(() => String(route.params.slug ?? ""));

const products = ref<Producto[]>([]);
const loading = ref(false);
const errorMessage = ref("");

async function loadProductsBySlug(slugValue: string): Promise<void> {
  loading.value = true;
  errorMessage.value = "";

  try {
    products.value = await getProductosByCategoriaSlugApi(slugValue);
  } catch (_error) {
    products.value = [];
    errorMessage.value =
      "No se pudieron cargar los productos de esta categoria.";
  } finally {
    loading.value = false;
  }
}

watch(
  slug,
  (value) => {
    loadProductsBySlug(value);
  },
  { immediate: true },
);
</script>

<style scoped>
.page-section {
  border-radius: 14px;
}
</style>
