const pool = require('../config/database');

class ClientProduct {
  static async findById(id) {
    const query = `
      SELECT vp.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido,
             p.nombre as producto_nombre
      FROM ventas_productos vp
      JOIN clientes c ON vp.cliente_id = c.id
      JOIN productos p ON vp.producto_id = p.id
      WHERE vp.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async create(saleData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { cliente_id, producto_id, cantidad, notas } = saleData;

      const productQuery = 'SELECT precio, stock FROM productos WHERE id = $1';
      const productResult = await client.query(productQuery, [producto_id]);
      const product = productResult.rows[0];

      if (!product) {
        throw new Error('Producto no encontrado');
      }

      if (product.stock < cantidad) {
        throw new Error('Stock insuficiente');
      }

      const precio_unitario = product.precio;
      const total = precio_unitario * cantidad;

      const insertQuery = `
        INSERT INTO ventas_productos (
          cliente_id, producto_id, cantidad, precio_unitario, total, notas
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const insertResult = await client.query(insertQuery, [
        cliente_id,
        producto_id,
        cantidad,
        precio_unitario,
        total,
        notas
      ]);

      const updateStockQuery = 'UPDATE productos SET stock = stock - $1 WHERE id = $2';
      await client.query(updateStockQuery, [cantidad, producto_id]);

      await client.query('COMMIT');

      return insertResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async markAsPaid(id, fecha_pago = new Date()) {
    const query = `
      UPDATE ventas_productos
      SET estado_pago = 'pagado', fecha_pago = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [fecha_pago, id]);
    return result.rows[0];
  }

  static async cancel(id) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const saleQuery = 'SELECT * FROM ventas_productos WHERE id = $1';
      const saleResult = await client.query(saleQuery, [id]);
      const sale = saleResult.rows[0];

      if (!sale) {
        throw new Error('Venta no encontrada');
      }

      const updateQuery = `
        UPDATE ventas_productos
        SET estado_pago = 'cancelado'
        WHERE id = $1
        RETURNING *
      `;
      const updateResult = await client.query(updateQuery, [id]);

      const restoreStockQuery = 'UPDATE productos SET stock = stock + $1 WHERE id = $2';
      await client.query(restoreStockQuery, [sale.cantidad, sale.producto_id]);

      await client.query('COMMIT');

      return updateResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getByClient(clientId, filters = {}) {
    let query = `
      SELECT vp.*, p.nombre as producto_nombre, p.imagen_base64 as producto_imagen
      FROM ventas_productos vp
      JOIN productos p ON vp.producto_id = p.id
      WHERE vp.cliente_id = $1
    `;
    const params = [clientId];
    let paramCount = 2;

    if (filters.estado_pago) {
      query += ` AND vp.estado_pago = $${paramCount}`;
      params.push(filters.estado_pago);
      paramCount++;
    }

    query += ' ORDER BY vp.fecha_venta DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async getAll(filters = {}) {
    let query = `
      SELECT vp.*, 
             c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.cedula as cliente_cedula,
             p.nombre as producto_nombre
      FROM ventas_productos vp
      JOIN clientes c ON vp.cliente_id = c.id
      JOIN productos p ON vp.producto_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.estado_pago) {
      query += ` AND vp.estado_pago = $${paramCount}`;
      params.push(filters.estado_pago);
      paramCount++;
    }

    if (filters.cliente_id) {
      query += ` AND vp.cliente_id = $${paramCount}`;
      params.push(filters.cliente_id);
      paramCount++;
    }

    query += ' ORDER BY vp.fecha_venta DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async getPendingDebt() {
    const query = `
      SELECT COALESCE(SUM(total), 0) as total_deuda
      FROM ventas_productos
      WHERE estado_pago = 'pendiente'
    `;
    const result = await pool.query(query);
    return parseFloat(result.rows[0].total_deuda);
  }

  static async getPendingByClient(clientId) {
    const query = `
      SELECT COALESCE(SUM(total), 0) as deuda_pendiente
      FROM ventas_productos
      WHERE cliente_id = $1 AND estado_pago = 'pendiente'
    `;
    const result = await pool.query(query, [clientId]);
    return parseFloat(result.rows[0].deuda_pendiente);
  }
}

module.exports = ClientProduct;