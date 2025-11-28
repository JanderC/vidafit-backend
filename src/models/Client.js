const pool = require('../config/database');

class Client {
  static async findById(id) {
    const query = 'SELECT * FROM clientes WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByCedula(cedula) {
    const query = 'SELECT * FROM clientes WHERE cedula = $1';
    const result = await pool.query(query, [cedula]);
    return result.rows[0];
  }

  static async findByFingerprint(fingerprintTemplate) {
    const query = 'SELECT * FROM clientes WHERE huella_template = $1';
    const result = await pool.query(query, [fingerprintTemplate]);
    return result.rows[0];
  }

  static async create(clientData) {
    const {
      nombre,
      apellido,
      cedula,
      telefono,
      email,
      fecha_nacimiento,
      direccion,
      huella_template,
      foto_base64
    } = clientData;

    const query = `
      INSERT INTO clientes (
        nombre, apellido, cedula, telefono, email,
        fecha_nacimiento, direccion, huella_template, foto_base64
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await pool.query(query, [
      nombre,
      apellido,
      cedula,
      telefono,
      email,
      fecha_nacimiento,
      direccion,
      huella_template,
      foto_base64
    ]);

    return result.rows[0];
  }

  static async update(id, clientData) {
    const {
      nombre,
      apellido,
      cedula,
      telefono,
      email,
      fecha_nacimiento,
      direccion,
      foto_base64,
      activo
    } = clientData;

    const query = `
      UPDATE clientes
      SET nombre = $1, apellido = $2, cedula = $3, telefono = $4,
          email = $5, fecha_nacimiento = $6, direccion = $7,
          foto_base64 = COALESCE($8, foto_base64), activo = $9
      WHERE id = $10
      RETURNING *
    `;

    const result = await pool.query(query, [
      nombre,
      apellido,
      cedula,
      telefono,
      email,
      fecha_nacimiento,
      direccion,
      foto_base64,
      activo,
      id
    ]);

    return result.rows[0];
  }

  static async updateFingerprint(id, fingerprintTemplate) {
    const query = 'UPDATE clientes SET huella_template = $1 WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [fingerprintTemplate, id]);
    return result.rows[0];
  }

  static async getAll(filters = {}) {
    let query = `
      SELECT c.*, 
        (SELECT COUNT(*) FROM membresias m WHERE m.cliente_id = c.id AND m.estado = 'activa') as membresias_activas
      FROM clientes c
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.activo !== undefined) {
      query += ` AND c.activo = $${paramCount}`;
      params.push(filters.activo);
      paramCount++;
    }

    if (filters.search) {
      query += ` AND (c.nombre ILIKE $${paramCount} OR c.apellido ILIKE $${paramCount} OR c.cedula ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    query += ' ORDER BY c.created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async delete(id) {
    const query = 'DELETE FROM clientes WHERE id = $1';
    await pool.query(query, [id]);
  }

  static async getWithActiveMembership(clientId) {
    const query = `
      SELECT c.*, m.*, p.nombre as plan_nombre, p.color as plan_color
      FROM clientes c
      LEFT JOIN membresias m ON c.id = m.cliente_id AND m.estado = 'activa'
      LEFT JOIN planes p ON m.plan_id = p.id
      WHERE c.id = $1
      ORDER BY m.fecha_vencimiento DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [clientId]);
    return result.rows[0];
  }
}

module.exports = Client;