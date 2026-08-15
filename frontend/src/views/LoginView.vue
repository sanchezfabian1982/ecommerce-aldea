<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { getCurrentUserApi, loginApi } from "@/api/user";
import { setTokenApi } from "@/api/token";

const router = useRouter();
const formData = ref({
  correo: "",
  contrasena: "",
});
const errorApi = ref("");

async function login() {
  errorApi.value = "";

  try {
    const response = await loginApi(formData.value);
    setTokenApi(response.jwt);
    const currentUser = await getCurrentUserApi();

    if (currentUser?.rol_tienda === "vendedora") {
      await router.push("/gestion_productos");
      return;
    }

    await router.push("/orders");
  } catch (err) {
    errorApi.value =
      err instanceof Error ? err.message : "Ocurrió un error al iniciar sesión";
  }
}
</script>

<template>
  <section class="ui raised segment login-section">
    <p class="login-kicker">Acceso seguro</p>
    <h2 class="ui header login-title">Iniciar sesión</h2>
    <p class="login-copy">
      Entra a tu cuenta para gestionar pedidos, productos o compras solidarias.
    </p>
    <form class="ui form" @submit.prevent="login">
      <div class="field">
        <label>Correo</label>
        <input
          v-model="formData.correo"
          type="email"
          placeholder="correo@ejemplo.com"
        />
      </div>
      <div class="field">
        <label>Contraseña</label>
        <input
          v-model="formData.contrasena"
          type="password"
          placeholder="********"
        />
      </div>
      <button class="ui primary button" type="submit">Entrar</button>

      <div v-if="errorApi" class="ui negative message">
        <p>{{ errorApi }}</p>
      </div>

      <div class="registro-link-wrap">
        <span>No tienes cuenta?</span>
        <router-link class="registro-link" to="/registro"
          >Registrate aqui</router-link
        >
      </div>
    </form>
  </section>
</template>

<style scoped>
.login-section {
  max-width: 520px;
  border-radius: 20px;
  border: 1px solid var(--aldea-border);
  box-shadow: var(--aldea-shadow);
  background:
    radial-gradient(
      circle at top left,
      rgba(185, 71, 44, 0.08),
      transparent 32%
    ),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.login-kicker {
  margin: 0 0 0.45rem;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--aldea-red-700);
}

.login-title {
  margin-bottom: 0.45rem;
}

.login-copy {
  margin: 0 0 1.2rem;
  color: var(--aldea-text-soft);
  line-height: 1.5;
}

.registro-link-wrap {
  margin-top: 1rem;
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.registro-link {
  font-weight: 700;
  color: var(--aldea-red-700);
}
</style>
