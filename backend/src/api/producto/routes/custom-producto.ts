export default {
  routes: [
    {
      method: "POST",
      path: "/productos/apply-order-inventory",
      handler: "producto.applyOrderInventory",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
