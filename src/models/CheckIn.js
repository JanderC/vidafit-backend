const pool = require('../config/database');

class CheckIn {
  static async create(checkinData) {
    const { cliente_id, metodo, exitoso, nota } = checkinData;

    const query = `
      INSERT INTO checkins (cliente_id, metodo, exitoso, nota)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await pool.query(query, [
      cliente_id,
      metodo || 'huella',
      exitoso !== undefined ? exitoso : true,
      nota
    ]);

    return result.rows[0];
  }

  static async getByClient(clientId, limit = 50) {
    const query = `
      SELECT * FROM checkins
      WHERE cliente_id = $1
      ORDER BY fecha_hora DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [clientId, limit]);
    return result.rows;
  }

  static async getAll(filters = {}) {
    let query = `
      SELECT ch.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido,
             c.cedula as cliente_cedula, c.foto_base64 as cliente_foto
      FROM checkins ch
      JOIN clientes c ON ch.cliente_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.fecha_inicio && filters.fecha_fin) {
      query += ` AND ch.fecha_hora BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(filters.fecha_inicio, filters.fecha_fin);
      paramCount += 2;
    } else if (filters.fecha) {
      query += ` AND DATE(ch.fecha_hora) = $${paramCount}`;
      params.push(filters.fecha);
      paramCount++;
    }

    if (filters.metodo) {
      query += ` AND ch.metodo = $${paramCount}`;
      params.push(filters.metodo);
      paramCount++;
    }

    if (filters.cliente_id) {
      query += ` AND ch.cliente_id = $${paramCount}`;
      params.push(filters.cliente_id);
      paramCount++;
    }

    query += ' ORDER BY ch.fecha_hora DESC LIMIT 100';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async getTodayCount() {
    const query = `
      SELECT COUNT(*) as count
      FROM checkins
      WHERE DATE(fecha_hora) = CURRENT_DATE
    `;
    const result = await pool.query(query);
    return parseInt(result.rows[0].count);
  }

  static async getCountByDate(startDate, endDate) {
    const query = `
      SELECT DATE(fecha_hora) as fecha, COUNT(*) as count
      FROM checkins
      WHERE fecha_hora BETWEEN $1 AND $2
      GROUP BY DATE(fecha_hora)
      ORDER BY fecha DESC
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  static async getLastCheckin(clientId) {
    const query = `
      SELECT * FROM checkins
      WHERE cliente_id = $1
      ORDER BY fecha_hora DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [clientId]);
    return result.rows[0];
  }

  static async getClientCheckinsToday(clientId) {
    const query = `
      SELECT COUNT(*) as count
      FROM checkins
      WHERE cliente_id = $1 AND DATE(fecha_hora) = CURRENT_DATE
    `;
    const result = await pool.query(query, [clientId]);
    return parseInt(result.rows[0].count);
  }

  static async getTopClients(limit = 10, startDate, endDate) {
    const query = `
      SELECT c.nombre, c.apellido, c.cedula, COUNT(*) as total_visitas
      FROM checkins ch
      JOIN clientes c ON ch.cliente_id = c.id
      WHERE ch.fecha_hora BETWEEN $1 AND $2
      GROUP BY c.id, c.nombre, c.apellido, c.cedula
      ORDER BY total_visitas DESC
      LIMIT $3
    `;
    const result = await pool.query(query, [startDate, endDate, limit]);
    return result.rows;
  }
}

module.exports = CheckIn;