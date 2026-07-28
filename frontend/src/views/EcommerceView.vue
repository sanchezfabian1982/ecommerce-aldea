<template>
  <section class="ui raised segment page-section">
    <h1 class="ui header">Ecommerce Aldea</h1>
    <p>Explora los productos mas recientes de tu tienda.</p>

    <div v-if="loading" class="ui active inline loader"></div>

    <p v-else-if="errorMessage" class="ui negative message">
      {{ errorMessage }}
    </p>

    <p v-else-if="products.length === 0" class="ui message">
      No hay productos publicados.
    </p>

    <div v-else class="ui grid">
      <div
        v-for="producto in products"
        :key="producto.id"
        class="sixteen wide mobile eight wide tablet four wide computer column"
      >
        <ProductoCard :producto="producto" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getProductosApi, type Producto } from "@/api/producto";
import ProductoCard from "@/components/ProductoCard.vue";

const products = ref<Producto[]>([]);
const loading = ref(false);
const errorMessage = ref("");

onMounted(async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    products.value = await getProductosApi(8);
  } catch (_error) {
    errorMessage.value = "No se pudo cargar el listado de productos.";
    products.value = [];
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.page-section {
  border-radius: 14px;
}
</style>
