import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";

// Cargamos los estilos de Semantic UI para tu ecommerce
import "semantic-ui-css/semantic.min.css";

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount("#app");
