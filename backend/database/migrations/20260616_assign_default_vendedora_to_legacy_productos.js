"use strict";

module.exports = {
  async up(knex) {
    // 1. Verificar si las tablas necesarias existen en la base de datos
    const hasUpUsers = await knex.schema.hasTable("up_users");
    const hasProductos = await knex.schema.hasTable("productos");
    const hasLinkTable = await knex.schema.hasTable("productos_vendedora_lnk");

    // Si la base de datos es nueva y no tiene estas tablas, omitimos la migración
    if (!hasUpUsers || !hasProductos || !hasLinkTable) {
      console.log(
        "[migration] Las tablas necesarias aún no existen (base de datos limpia). Omitiendo migración.",
      );
      return;
    }

    // 2. Ejecutar la lógica original de manera segura
    const defaultSeller = await knex("up_users")
      .select("id", "email", "username", "nombre")
      .where({ rol_tienda: "vendedora" })
      .orderBy("id", "asc")
      .first();

    if (!defaultSeller) {
      console.log(
        "[migration] No se encontro ninguna usuaria con rol_tienda=vendedora.",
      );
      return;
    }

    const productosSinVendedora = await knex("productos as p")
      .leftJoin("productos_vendedora_lnk as pv", "p.id", "pv.producto_id")
      .whereNull("pv.user_id")
      .select("p.id")
      .orderBy("p.id", "asc");

    if (productosSinVendedora.length === 0) {
      console.log(
        "[migration] No hay productos antiguos sin vendedora asignada.",
      );
      return;
    }

    const rowsToInsert = productosSinVendedora.map((producto, index) => ({
      producto_id: producto.id,
      user_id: defaultSeller.id,
      producto_ord: index + 1,
    }));

    await knex("productos_vendedora_lnk").insert(rowsToInsert);

    console.log(
      `[migration] Productos actualizados con vendedora por defecto (${defaultSeller.email || defaultSeller.username || defaultSeller.nombre || defaultSeller.id}): ${rowsToInsert.length}`,
    );
  },
};
