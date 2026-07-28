<script setup lang="ts">
import Menu from "../components/Menu.vue";
import Carrito from "../components/carrito/Carrito.vue";
</script>

<template>
  <div class="layout-wrapper">
    <Menu />
    <Carrito />

    <main class="ui container main-content">
      <slot />
    </main>

    <footer class="footer-section">
      <div class="ui container footer-shell">
        <div class="footer-brand">
          <img
            src="../assets/logo_aldea.png"
            alt="Logo Fundacion ALDEA"
            class="footer-logo"
          />
          <div class="footer-copy">
            <span class="footer-kicker">Fundacion ALDEA</span>
            <h2 class="footer-title">Ecommerce Aldea</h2>
            <p class="footer-subtitle">
              Comercio solidario para el desarrollo alternativo.
            </p>
          </div>
        </div>

        <div class="footer-meta">
          <p class="footer-message">
            Cada compra aporta al fortalecimiento de iniciativas productivas con
            impacto social.
          </p>
          <p class="footer-legal">
            ALDEA | Red de apoyo y desarrollo comunitario
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.layout-wrapper {
  min-height: 100vh;
  background: linear-gradient(180deg, #f6f9fe 0%, #ffffff 45%);
}

.main-content {
  padding-top: 2.2rem;
  padding-bottom: 2rem;
}

.footer-section {
  margin-top: 2rem;
  border-radius: 0;
  background:
    radial-gradient(
      circle at top left,
      rgba(227, 78, 54, 0.12),
      transparent 34%
    ),
    linear-gradient(180deg, #f8fbff 0%, #ecf3fb 100%);
  border-top: 1px solid #d7e4f2;
  padding: 2rem 0 2.4rem;
}

.footer-shell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.footer-logo {
  width: 82px;
  height: 82px;
  object-fit: contain;
  background: #fff;
  border-radius: 16px;
  padding: 0.25rem;
  box-shadow: 0 12px 28px rgba(18, 59, 102, 0.08);
}

.footer-copy {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}

.footer-kicker {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #b9472c;
}

.footer-title {
  margin: 0;
  font-size: 1.35rem;
  line-height: 1.05;
  color: #123b66;
}

.footer-subtitle {
  margin: 0;
  max-width: 320px;
  color: #5c7087;
  font-weight: 600;
  line-height: 1.3;
}

.footer-meta {
  text-align: right;
  color: #355879;
}

.footer-message {
  margin: 0 0 0.5rem;
  max-width: 360px;
  line-height: 1.5;
}

.footer-legal {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: #123b66;
}

@media (max-width: 767px) {
  .footer-shell {
    flex-direction: column;
    align-items: flex-start;
  }

  .footer-meta {
    text-align: left;
  }
}
</style>
