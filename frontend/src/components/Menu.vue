<template>
  <header class="menu-wrapper">
    <div class="ui container">
      <nav class="ui secondary stackable menu custom-menu">
        <RouterLink class="item logo-item" :to="homeRoute">
          <img
            src="../assets/logo_aldea.png"
            alt="Logo Ecommerce Aldea"
            class="brand-logo"
          />
          <span class="brand-copy">
            <span class="brand-kicker">Fundacion ALDEA</span>
            <span class="brand-title">Ecommerce Aldea</span>
          </span>
        </RouterLink>

        <template
          v-if="!canPublishProducts"
          v-for="categoria in categories"
          :key="categoria.id"
        >
          <RouterLink class="item" :to="`/categoria/${categoria.slug}`">
            {{ categoria.title }}
          </RouterLink>
        </template>

        <span
          v-if="!canPublishProducts"
          class="ui item cart-item"
          @click="openCarrito"
        >
          <i class="shopping cart icon"></i>
          Carrito
          <span v-if="cartCount > 0" class="cart-badge">{{ cartCount }}</span>
        </span>

        <RouterLink
          v-if="token && canPublishProducts"
          class="item"
          to="/gestion_productos"
        >
          Gestionar productos
        </RouterLink>

        <RouterLink
          v-if="token && canPublishProducts"
          class="item"
          to="/gestion_despachos"
        >
          Gestionar despachos
        </RouterLink>

        <RouterLink
          v-if="token && !canPublishProducts"
          class="item"
          to="/orders"
        >
          Mis pedidos
        </RouterLink>

        <RouterLink v-if="token" class="item" to="/perfil">
          Mi perfil
        </RouterLink>

        <div class="right menu">
          <span v-if="token && currentUserDisplay" class="ui item current-user">
            <i class="user circle outline icon"></i>
            {{ currentUserDisplay }}
          </span>

          <span v-if="token" class="ui item logout" @click="logout">
            <i class="sign-out icon"></i>
            Cerrar sesion
          </span>

          <RouterLink v-else class="item login-item" to="/login">
            <i class="user outline icon"></i>
            Iniciar sesion
          </RouterLink>
        </div>
      </nav>
    </div>
  </header>
</template>

<script lang="ts">
import { ref, onMounted, computed, watch, onBeforeUnmount } from "vue";
import { defineComponent } from "vue";
import { useRouter } from "vue-router";
import { removeTokenApi, tokenState } from "@/api/token";
import { getCategoriesApi } from "@/api/categoria";
import { carritoState } from "@/api/carrito";
import { getCurrentUserApi, USER_PROFILE_UPDATED_EVENT } from "@/api/user";
import { useUiStore } from "@/store";

type RawCategoria = {
  id?: number | string;
  slug?: string;
  title?: string;
  name?: string;
  nombre?: string;
  attributes?: {
    slug?: string;
    title?: string;
    name?: string;
    nombre?: string;
  };
};

type CategoriaMenu = {
  id: number | string;
  slug: string;
  title: string;
};

export default defineComponent({
  setup() {
    const categories = ref<CategoriaMenu[]>([]);
    const rolTienda = ref<"cliente" | "vendedora" | null>(null);
    const currentUserLabel = ref("");
    const router = useRouter();
    const uiStore = useUiStore();
    const token = tokenState;
    const cartCount = computed(() =>
      carritoState.value.reduce((sum, item) => sum + item.cantidad, 0),
    );
    const canPublishProducts = computed(() => rolTienda.value === "vendedora");
    const homeRoute = computed(() =>
      canPublishProducts.value ? "/gestion_productos" : "/ecommerce",
    );
    const currentUserRoleLabel = computed(() => {
      if (rolTienda.value === "vendedora") {
        return "Vendedora";
      }

      if (rolTienda.value === "cliente") {
        return "Cliente";
      }

      return "";
    });
    const currentUserDisplay = computed(() => {
      if (!currentUserLabel.value) {
        return "";
      }

      if (!currentUserRoleLabel.value) {
        return currentUserLabel.value;
      }

      return `${currentUserLabel.value} | ${currentUserRoleLabel.value}`;
    });

    const loadCurrentUser = async () => {
      const currentUser = await getCurrentUserApi();
      rolTienda.value = currentUser?.rol_tienda ?? null;
      currentUserLabel.value =
        currentUser?.nombre?.trim() ||
        currentUser?.username?.trim() ||
        currentUser?.email?.trim() ||
        "";
    };

    onMounted(async () => {
      const response = await getCategoriesApi();
      const rawCategories: RawCategoria[] = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];

      await loadCurrentUser();

      categories.value = rawCategories
        .map((item) => {
          const values = item.attributes ?? item;
          const id = item.id;
          const slug = values.slug;
          const title = values.title ?? values.name ?? values.nombre;

          if (id == null || !slug || !title) {
            return null;
          }

          return {
            id,
            slug: slug.replace(/^\/+/, ""),
            title,
          };
        })
        .filter((item): item is CategoriaMenu => item !== null);

      window.addEventListener(USER_PROFILE_UPDATED_EVENT, loadCurrentUser);
    });

    onBeforeUnmount(() => {
      window.removeEventListener(USER_PROFILE_UPDATED_EVENT, loadCurrentUser);
    });

    watch(
      token,
      async () => {
        await loadCurrentUser();
      },
      { immediate: true },
    );

    const logout = () => {
      removeTokenApi();
      rolTienda.value = null;
      currentUserLabel.value = "";
      router.replace("/");
    };

    const openCarrito = () => {
      uiStore.setShowCarrito(true);
    };

    return {
      token,
      logout,
      categories,
      cartCount,
      openCarrito,
      canPublishProducts,
      homeRoute,
      currentUserDisplay,
    };
  },
});
</script>

<style scoped>
.menu-wrapper {
  position: sticky;
  top: 0;
  z-index: 20;
  background: linear-gradient(90deg, #ffffff 0%, #eef5ff 100%);
  border-bottom: 1px solid #dbe4f0;
  box-shadow: 0 8px 20px rgba(16, 44, 84, 0.08);
}

.custom-menu {
  margin: 0;
  border: 0;
  background: transparent;
  min-height: 68px;
}

.custom-menu .item {
  font-weight: 600;
  color: #1f3b57;
  transition: all 0.2s ease;
}

.custom-menu .item:hover {
  color: #0b63ce;
  background: rgba(11, 99, 206, 0.08);
  border-radius: 8px;
}

.logo-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding-left: 0;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.82),
    rgba(241, 247, 255, 0.9)
  );
  padding: 0.4rem 0.65rem 0.4rem 0;
  border-radius: 16px;
}

.brand-logo {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  background: #fff;
  object-fit: contain;
  padding: 0.16rem;
  box-shadow: 0 8px 18px rgba(18, 59, 102, 0.08);
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 0.08rem;
}

.brand-kicker {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #b9472c;
}

.brand-title {
  max-width: 160px;
  font-size: 1.08rem;
  line-height: 1.05;
  letter-spacing: 0.18px;
  font-weight: 700;
  color: #123b66;
}

.login-item {
  border: 1px solid #0b63ce;
  border-radius: 10px;
  margin-left: 0.5rem;
}

.current-user {
  color: #123b66;
  background: rgba(18, 59, 102, 0.06);
  border-radius: 10px;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
}

.cart-badge {
  min-width: 22px;
  height: 22px;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: #0b63ce;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  line-height: 1;
}

@media (max-width: 767px) {
  .custom-menu {
    padding: 0.4rem 0;
  }

  .logo-item {
    width: 100%;
    margin-bottom: 0.3rem;
    align-items: center;
    padding-right: 0.55rem;
  }

  .brand-kicker {
    font-size: 0.62rem;
  }

  .brand-title {
    max-width: none;
    font-size: 0.98rem;
  }

  .right.menu {
    margin-left: 0;
  }

  .login-item {
    width: 100%;
    justify-content: center;
  }
}
</style>
