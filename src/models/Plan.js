const pool = require('../config/database');

class Plan {
  static async findById(id) {
    const query = 'SELECT * FROM planes WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async create(planData) {
    const { nombre, descripcion, tipo, duracion_dias, precio, color } = planData;

    const query = `
      INSERT INTO planes (nombre, descripcion, tipo, duracion_dias, precio, color)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [
      nombre,
      descripcion,
      tipo,
      duracion_dias,
      precio,
      color || '#00FF00'
    ]);

    return result.rows[0];
  }

  static async update(id, planData) {
    const { nombre, descripcion, tipo, duracion_dias, precio, color, activo } = planData;

    const query = `
      UPDATE planes
      SET nombre = $1, descripcion = $2, tipo = $3, duracion_dias = $4,
          precio = $5, color = $6, activo = $7
      WHERE id = $8
      RETURNING *
    `;

    const result = await pool.query(query, [
      nombre,
      descripcion,
      tipo,
      duracion_dias,
      precio,
      color,
      activo,
      id
    ]);

    return result.rows[0];
  }

  static async getAll(filters = {}) {
    let query = 'SELECT * FROM planes WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.activo !== undefined) {
      query += ` AND activo = $${paramCount}`;
      params.push(filters.activo);
      paramCount++;
    }

    if (filters.tipo) {
      query += ` AND tipo = $${paramCount}`;
      params.push(filters.tipo);
      paramCount++;
    }

    query += ' ORDER BY duracion_dias ASC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async delete(id) {
    const query = 'DELETE FROM planes WHERE id = $1';
    await pool.query(query, [id]);
  }

  static async getWithStats(id) {
    const query = `
      SELECT p.*,
        (SELECT COUNT(*) FROM membresias m WHERE m.plan_id = p.id AND m.estado = 'activa') as membresias_activas,
        (SELECT COUNT(*) FROM membresias m WHERE m.plan_id = p.id) as total_membresias
      FROM planes p
      WHERE p.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Plan;