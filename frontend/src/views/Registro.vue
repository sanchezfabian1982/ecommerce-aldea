<script setup lang="ts">
import { onMounted, ref } from "vue";
import * as yup from "yup";
import { useRouter } from "vue-router";
import { loginApi, registroApi } from "../api/user";
import { setTokenApi, tokenState } from "@/api/token";

const router = useRouter();
const formData = ref({
  nombre: "",
  correo: "",
  contrasena: "",
  rol_tienda: "cliente" as "cliente" | "vendedora",
});

const errores = ref({
  nombre: "",
  correo: "",
  contrasena: "",
  rol_tienda: "",
});
const errorApi = ref("");
const exito = ref("");
const redirigiendo = ref(false);

const schemaForm = yup.object({
  nombre: yup.string().required("El nombre es requerido"),
  correo: yup
    .string()
    .email("Ingresa un correo válido")
    .required("El correo es requerido"),
  contrasena: yup
    .string()
    .min(6, "La contrasena debe tener al menos 6 caracteres")
    .required("La contrasena es requerida"),
  rol_tienda: yup
    .mixed<"cliente" | "vendedora">()
    .oneOf(["cliente", "vendedora"], "Selecciona un rol valido")
    .required("Debes seleccionar un tipo de cuenta"),
});

onMounted(async () => {
  const token = tokenState.value;

  if (token) {
    await router.push("/orders");
  }
});

async function registro() {
  errores.value = { nombre: "", correo: "", contrasena: "", rol_tienda: "" };
  errorApi.value = "";
  exito.value = "";
  redirigiendo.value = false;

  try {
    await schemaForm.validate(formData.value, { abortEarly: false });
    await registroApi(formData.value);
    const loginResponse = await loginApi({
      correo: formData.value.correo,
      contrasena: formData.value.contrasena,
    });
    setTokenApi(loginResponse.jwt);
    exito.value = "Usuario registrado correctamente";
    redirigiendo.value = true;

    if (formData.value.rol_tienda === "vendedora") {
      await router.push("/gestion_productos");
      return;
    }

    await router.push("/ecommerce");
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      err.inner.forEach((e) => {
        const campo = e.path as keyof typeof errores.value;
        errores.value[campo] = e.message;
      });
      return;
    }

    redirigiendo.value = false;
    errorApi.value =
      err instanceof Error ? err.message : "Ocurrio un error al registrar";
  }
}
</script>

<template>
  <section class="ui raised segment registro-section">
    <p class="registro-kicker">Nueva cuenta</p>
    <h2 class="ui header registro-title">Registro</h2>
    <p class="registro-copy">
      Crea tu cuenta para comprar o vender dentro del ecosistema solidario de
      ALDEA.
    </p>
    <form class="ui form" @submit.prevent="registro">
      <div class="field" :class="{ error: errores.nombre }">
        <label>Nombre completo</label>
        <input v-model="formData.nombre" type="text" placeholder="Tu nombre" />
        <span v-if="errores.nombre" class="error-msg">{{
          errores.nombre
        }}</span>
      </div>

      <div class="field" :class="{ error: errores.correo }">
        <label>Correo</label>
        <input
          v-model="formData.correo"
          type="email"
          placeholder="correo@ejemplo.com"
        />
        <span v-if="errores.correo" class="error-msg">{{
          errores.correo
        }}</span>
      </div>

      <div class="field" :class="{ error: errores.contrasena }">
        <label>Contrasena</label>
        <input
          v-model="formData.contrasena"
          type="password"
          placeholder="********"
        />
        <span v-if="errores.contrasena" class="error-msg">{{
          errores.contrasena
        }}</span>
      </div>

      <div class="field" :class="{ error: errores.rol_tienda }">
        <label>Tipo de cuenta</label>
        <select v-model="formData.rol_tienda" class="ui dropdown">
          <option value="cliente">Cliente</option>
          <option value="vendedora">Vendedora</option>
        </select>
        <span v-if="errores.rol_tienda" class="error-msg">{{
          errores.rol_tienda
        }}</span>
      </div>

      <button
        class="ui primary button"
        type="submit"
        :class="{ loading: redirigiendo }"
        :disabled="redirigiendo"
      >
        {{ redirigiendo ? "Redirigiendo..." : "Crear cuenta" }}
      </button>

      <div v-if="errorApi" class="ui negative message">
        <p>{{ errorApi }}</p>
      </div>

      <div v-if="exito" class="ui positive message">
        <p>{{ exito }}</p>
        <p>
          Esta cuenta pertenece a la aplicacion y no al panel administrador de
          Strapi.
        </p>
        <p v-if="formData.rol_tienda === 'vendedora'">
          Tu cuenta fue creada como vendedora.
        </p>
        <p v-else>Tu cuenta fue creada como cliente.</p>
        <p v-if="redirigiendo">Redirigiendo...</p>
      </div>
    </form>
  </section>
</template>

<style scoped>
.registro-section {
  max-width: 600px;
  border-radius: 20px;
  border: 1px solid var(--aldea-border);
  box-shadow: var(--aldea-shadow);
  background:
    radial-gradient(
      circle at top left,
      rgba(31, 95, 150, 0.08),
      transparent 34%
    ),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.registro-kicker {
  margin: 0 0 0.45rem;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--aldea-red-700);
}

.registro-title {
  margin-bottom: 0.45rem;
}

.registro-copy {
  margin: 0 0 1.2rem;
  color: var(--aldea-text-soft);
  line-height: 1.5;
}

.error-msg {
  color: #e0281d;
  font-size: 0.85rem;
  margin-top: 0.25rem;
  display: block;
}
</style>
