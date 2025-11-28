const pool = require('../config/database');

class Product {
  static async findById(id) {
    const query = 'SELECT * FROM productos WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async create(productData) {
    const { nombre, descripcion, precio, stock, imagen_base64, categoria } = productData;

    const query = `
      INSERT INTO productos (nombre, descripcion, precio, stock, imagen_base64, categoria)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [
      nombre,
      descripcion,
      precio,
      stock || 0,
      imagen_base64,
      categoria
    ]);

    return result.rows[0];
  }

  static async update(id, productData) {
    const { nombre, descripcion, precio, stock, imagen_base64, categoria, activo } = productData;

    const query = `
      UPDATE productos
      SET nombre = $1, descripcion = $2, precio = $3, stock = $4,
          imagen_base64 = COALESCE($5, imagen_base64), categoria = $6, activo = $7
      WHERE id = $8
      RETURNING *
    `;

    const result = await pool.query(query, [
      nombre,
      descripcion,
      precio,
      stock,
      imagen_base64,
      categoria,
      activo,
      id
    ]);

    return result.rows[0];
  }

  static async updateStock(id, quantity) {
    const query = `
      UPDATE productos
      SET stock = stock + $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [quantity, id]);
    return result.rows[0];
  }

  static async getAll(filters = {}) {
    let query = 'SELECT * FROM productos WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.activo !== undefined) {
      query += ` AND activo = $${paramCount}`;
      params.push(filters.activo);
      paramCount++;
    }

    if (filters.categoria) {
      query += ` AND categoria = $${paramCount}`;
      params.push(filters.categoria);
      paramCount++;
    }

    if (filters.search) {
      query += ` AND nombre ILIKE $${paramCount}`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    query += ' ORDER BY nombre ASC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async delete(id) {
    const query = 'DELETE FROM productos WHERE id = $1';
    await pool.query(query, [id]);
  }

  static async getLowStock(threshold = 10) {
    const query = 'SELECT * FROM productos WHERE stock <= $1 AND activo = true ORDER BY stock ASC';
    const result = await pool.query(query, [threshold]);
    return result.rows;
  }

  static async getCategories() {
    const query = 'SELECT DISTINCT categoria FROM productos WHERE categoria IS NOT NULL ORDER BY categoria';
    const result = await pool.query(query);
    return result.rows.map(row => row.categoria);
  }
}

module.exports = Product;