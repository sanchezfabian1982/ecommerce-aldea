import { createRouter, createWebHistory } from "vue-router";
import { tokenState } from "@/api/token";
import { getCurrentUserApi } from "@/api/user";
import HomeView from "../views/HomeView.vue";
import EcommerceView from "../views/EcommerceView.vue";
import LoginView from "../views/LoginView.vue";
import RegistroView from "../views/Registro.vue";
import OrdersView from "../views/OrdersView.vue";
import CategoriaView from "../views/CategoriaView.vue";
import VendedoraView from "../views/VendedoraView.vue";
import GestionDespachosView from "../views/GestionDespachosView.vue";
import PerfilView from "../views/PerfilView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/ecommerce",
      name: "ecommerce",
      component: EcommerceView,
    },
    {
      path: "/login",
      name: "login",
      component: LoginView,
    },
    {
      path: "/Login",
      redirect: { name: "login" },
    },
    {
      path: "/registro",
      name: "registro",
      component: RegistroView,
    },
    {
      path: "/orders",
      name: "orders",
      component: OrdersView,
    },
    {
      path: "/perfil",
      name: "perfil",
      component: PerfilView,
    },
    {
      path: "/gestion_productos",
      name: "gestion-productos",
      component: VendedoraView,
    },
    {
      path: "/gestion_despachos",
      name: "gestion-despachos",
      component: GestionDespachosView,
    },
    {
      path: "/vendedora",
      redirect: { name: "gestion-productos" },
    },
    {
      path: "/categoria/:slug",
      name: "categoria",
      component: CategoriaView,
    },
  ],
});

router.beforeEach(async (to) => {
  const token = tokenState.value;
  const currentUser = token ? await getCurrentUserApi() : null;
  const isVendedora = currentUser?.rol_tienda === "vendedora";

  if (to.name === "orders" && !token) {
    return { name: "login" };
  }

  if (to.name === "gestion-productos" && !token) {
    return { name: "login" };
  }

  if (to.name === "perfil" && !token) {
    return { name: "login" };
  }

  if (to.name === "gestion-despachos" && !token) {
    return { name: "login" };
  }

  if (to.name === "gestion-productos" && token) {
    if (!isVendedora) {
      return { name: "orders" };
    }
  }

  if (to.name === "gestion-despachos" && token) {
    if (!isVendedora) {
      return { name: "orders" };
    }
  }

  if (to.name === "login" && token) {
    return { name: isVendedora ? "gestion-productos" : "orders" };
  }

  if (to.name === "home" && token) {
    return { name: isVendedora ? "gestion-productos" : "orders" };
  }

  if ((to.name === "ecommerce" || to.name === "categoria") && isVendedora) {
    return { name: "gestion-productos" };
  }

  return true;
});

export default router;
