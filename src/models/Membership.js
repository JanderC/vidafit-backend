const pool = require('../config/database');

class Membership {
  static async findById(id) {
    const query = `
      SELECT m.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido,
             p.nombre as plan_nombre, p.color as plan_color
      FROM membresias m
      JOIN clientes c ON m.cliente_id = c.id
      JOIN planes p ON m.plan_id = p.id
      WHERE m.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async create(membershipData) {
    const {
      cliente_id,
      plan_id,
      fecha_inicio,
      fecha_vencimiento,
      monto_pagado,
      metodo_pago,
      notas
    } = membershipData;

    const query = `
      INSERT INTO membresias (
        cliente_id, plan_id, fecha_inicio, fecha_vencimiento,
        monto_pagado, metodo_pago, notas
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(query, [
      cliente_id,
      plan_id,
      fecha_inicio,
      fecha_vencimiento,
      monto_pagado,
      metodo_pago,
      notas
    ]);

    return result.rows[0];
  }

  static async update(id, membershipData) {
    const { estado, notas } = membershipData;

    const query = `
      UPDATE membresias
      SET estado = $1, notas = $2
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [estado, notas, id]);
    return result.rows[0];
  }

  static async getByClient(clientId, filters = {}) {
    let query = `
      SELECT m.*, p.nombre as plan_nombre, p.color as plan_color, p.tipo as plan_tipo
      FROM membresias m
      JOIN planes p ON m.plan_id = p.id
      WHERE m.cliente_id = $1
    `;
    const params = [clientId];
    let paramCount = 2;

    if (filters.estado) {
      query += ` AND m.estado = $${paramCount}`;
      params.push(filters.estado);
      paramCount++;
    }

    query += ' ORDER BY m.fecha_inicio DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async getActive(clientId) {
    const query = `
      SELECT m.*, p.nombre as plan_nombre, p.color as plan_color, p.tipo as plan_tipo
      FROM membresias m
      JOIN planes p ON m.plan_id = p.id
      WHERE m.cliente_id = $1 AND m.estado = 'activa'
      ORDER BY m.fecha_vencimiento DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [clientId]);
    return result.rows[0];
  }

  static async getAll(filters = {}) {
    let query = `
      SELECT m.*, 
             c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.cedula as cliente_cedula,
             p.nombre as plan_nombre, p.color as plan_color, p.tipo as plan_tipo
      FROM membresias m
      JOIN clientes c ON m.cliente_id = c.id
      JOIN planes p ON m.plan_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.estado) {
      query += ` AND m.estado = $${paramCount}`;
      params.push(filters.estado);
      paramCount++;
    }

    if (filters.vencimiento_proximo) {
      query += ` AND m.fecha_vencimiento BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')`;
    }

    query += ' ORDER BY m.fecha_vencimiento ASC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async expire(id) {
    const query = `
      UPDATE membresias
      SET estado = 'vencida'
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async cancel(id) {
    const query = `
      UPDATE membresias
      SET estado = 'cancelada'
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async suspend(id) {
    const query = `
      UPDATE membresias
      SET estado = 'suspendida'
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async reactivate(id) {
    const query = `
      UPDATE membresias
      SET estado = 'activa'
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async checkExpired() {
    const query = `
      UPDATE membresias
      SET estado = 'vencida'
      WHERE fecha_vencimiento < CURRENT_DATE
      AND estado = 'activa'
      RETURNING *
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getExpiringCount(days = 7) {
    const query = `
      SELECT COUNT(*) as count
      FROM membresias
      WHERE estado = 'activa'
      AND fecha_vencimiento BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '${days} days')
    `;
    const result = await pool.query(query);
    return parseInt(result.rows[0].count);
  }
}

module.exports = Membership;