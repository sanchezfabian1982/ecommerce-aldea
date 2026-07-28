<script setup lang="ts">
import EcommerceLayout from "./layout/EcommerceLayout.vue";
import { RouterView } from "vue-router";
</script>

<template>
  <EcommerceLayout>
    <RouterView />
  </EcommerceLayout>
</template>

<style>
:root {
  --aldea-blue-900: #123b66;
  --aldea-blue-700: #1f5f96;
  --aldea-blue-100: #dcecff;
  --aldea-sky-50: #f6f9fe;
  --aldea-red-700: #b9472c;
  --aldea-red-100: #fde6df;
  --aldea-gold-100: #fff1cf;
  --aldea-green-100: #dff5e8;
  --aldea-green-700: #16643a;
  --aldea-text-soft: #5d7086;
  --aldea-border: #d7e4f2;
  --aldea-shadow: 0 14px 30px rgba(18, 59, 102, 0.08);
}

body {
  background: var(--aldea-sky-50);
  color: var(--aldea-blue-900);
}

#app {
  min-height: 100vh;
}

.ui.header {
  color: var(--aldea-blue-900);
}

.ui.form .field > label {
  color: var(--aldea-blue-900) !important;
  font-weight: 700 !important;
}

.ui.form input:not([type="file"]),
.ui.form textarea,
.ui.form select {
  border: 1px solid var(--aldea-border) !important;
  border-radius: 12px !important;
  background: rgba(255, 255, 255, 0.96) !important;
  box-shadow: inset 0 1px 2px rgba(18, 59, 102, 0.04) !important;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.ui.form input:not([type="file"]):focus,
.ui.form textarea:focus,
.ui.form select:focus {
  border-color: rgba(185, 71, 44, 0.45) !important;
  box-shadow: 0 0 0 4px rgba(185, 71, 44, 0.12) !important;
  background: #fff !important;
}

.ui.message {
  border-radius: 14px !important;
  border: 1px solid var(--aldea-border) !important;
  box-shadow: 0 8px 18px rgba(18, 59, 102, 0.04);
}

.ui.negative.message {
  background: #fff6f5 !important;
}

.ui.positive.message {
  background: #f3fbf6 !important;
}

.ui.primary.button {
  background: linear-gradient(135deg, var(--aldea-red-700), #cf5c3f) !important;
  color: #fff !important;
  border-radius: 12px !important;
  box-shadow: 0 10px 22px rgba(185, 71, 44, 0.18) !important;
}

.ui.primary.button:hover,
.ui.primary.button:focus {
  background: linear-gradient(135deg, #a33f28, var(--aldea-red-700)) !important;
}

.ui.teal.button {
  background: linear-gradient(
    135deg,
    var(--aldea-blue-700),
    #2f79b8
  ) !important;
  color: #fff !important;
  border-radius: 12px !important;
}

.ui.button {
  border-radius: 12px !important;
}

.ui.raised.segment,
.ui.segment {
  border-color: var(--aldea-border) !important;
}
</style>
