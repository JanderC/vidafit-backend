const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async findByEmail(email) {
    const query = 'SELECT * FROM usuarios WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM usuarios WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async create(userData) {
    const { nombre, email, password, rol, telefono } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const query = `
      INSERT INTO usuarios (nombre, email, password_hash, rol, telefono)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, nombre, email, rol, telefono, activo, created_at
    `;
    
    const result = await pool.query(query, [nombre, email, hashedPassword, rol || 'staff', telefono]);
    return result.rows[0];
  }

  static async update(id, userData) {
    const { nombre, email, telefono, rol, activo } = userData;
    
    const query = `
      UPDATE usuarios
      SET nombre = $1, email = $2, telefono = $3, rol = $4, activo = $5
      WHERE id = $6
      RETURNING id, nombre, email, rol, telefono, activo, updated_at
    `;
    
    const result = await pool.query(query, [nombre, email, telefono, rol, activo, id]);
    return result.rows[0];
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const query = 'UPDATE usuarios SET password_hash = $1 WHERE id = $2';
    await pool.query(query, [hashedPassword, id]);
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async getAll() {
    const query = 'SELECT id, nombre, email, rol, telefono, activo, created_at FROM usuarios ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  }

  static async delete(id) {
    const query = 'DELETE FROM usuarios WHERE id = $1';
    await pool.query(query, [id]);
  }
}

module.exports = User;