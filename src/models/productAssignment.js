const pool = require('../config/database');

class ProductAssignment {
  /**
   * Obtener todas las ventas de productos con filtros
   */
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT 
          vp.*,
          c.nombre || ' ' || c.apellido as cliente_nombre,
          c.cedula as cliente_cedula,
          p.nombre as producto_nombre,
          p.imagen_base64 as producto_imagen
        FROM ventas_productos vp
        INNER JOIN clientes c ON vp.cliente_id = c.id
        INNER JOIN productos p ON vp.producto_id = p.id
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;

      // Filtrar por estado de pago
      if (filters.estado) {
        query += ` AND vp.estado_pago = $${paramCount}`;
        params.push(filters.estado);
        paramCount++;
      }

      // Filtrar por cliente
      if (filters.cliente_id) {
        query += ` AND vp.cliente_id = $${paramCount}`;
        params.push(filters.cliente_id);
        paramCount++;
      }

      query += ` ORDER BY vp.fecha_venta DESC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error en ProductAssignment.getAll:', error);
      throw error;
    }
  }

  /**
   * Obtener ventas por cliente
   */
  static async getByClient(clientId) {
    try {
      const query = `
        SELECT 
          vp.*,
          c.nombre || ' ' || c.apellido as cliente_nombre,
          c.cedula as cliente_cedula,
          p.nombre as producto_nombre,
          p.imagen_base64 as producto_imagen,
          p.precio as precio_actual
        FROM ventas_productos vp
        INNER JOIN clientes c ON vp.cliente_id = c.id
        INNER JOIN productos p ON vp.producto_id = p.id
        WHERE vp.cliente_id = $1
        ORDER BY vp.fecha_venta DESC
      `;
      
      const result = await pool.query(query, [clientId]);
      return result.rows;
    } catch (error) {
      console.error('Error en ProductAssignment.getByClient:', error);
      throw error;
    }
  }

  /**
   * Obtener una venta específica por ID
   */
  static async findById(id) {
    try {
      const query = `
        SELECT 
          vp.*,
          c.nombre || ' ' || c.apellido as cliente_nombre,
          c.cedula as cliente_cedula,
          p.nombre as producto_nombre
        FROM ventas_productos vp
        INNER JOIN clientes c ON vp.cliente_id = c.id
        INNER JOIN productos p ON vp.producto_id = p.id
        WHERE vp.id = $1
      `;
      
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error en ProductAssignment.findById:', error);
      throw error;
    }
  }

  /**
   * Crear nueva venta de producto (fiado o pagado)
   */
  static async create(assignmentData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        cliente_id,
        producto_id,
        cantidad,
        precio_unitario,
        estado_pago = 'pendiente',
        notas
      } = assignmentData;

      // Calcular total
      const total = parseFloat(precio_unitario) * parseInt(cantidad);

      // Insertar la venta
      const insertQuery = `
        INSERT INTO ventas_productos (
          cliente_id, 
          producto_id, 
          cantidad, 
          precio_unitario, 
          total, 
          estado_pago,
          notas,
          fecha_pago
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const fecha_pago = estado_pago === 'pagado' ? new Date() : null;

      const result = await client.query(insertQuery, [
        cliente_id,
        producto_id,
        cantidad,
        precio_unitario,
        total,
        estado_pago,
        notas || null,
        fecha_pago
      ]);

      // Actualizar stock del producto (disminuir)
      const updateStockQuery = `
        UPDATE productos
        SET stock = stock - $1
        WHERE id = $2
        RETURNING stock
      `;

      const stockResult = await client.query(updateStockQuery, [cantidad, producto_id]);

      // Verificar que hay suficiente stock
      if (stockResult.rows[0].stock < 0) {
        throw new Error('Stock insuficiente');
      }

      await client.query('COMMIT');

      // Obtener la venta completa con datos relacionados
      return await this.findById(result.rows[0].id);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en ProductAssignment.create:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Marcar venta como pagada
   */
  static async markAsPaid(id) {
    try {
      const query = `
        UPDATE ventas_productos
        SET estado_pago = 'pagado',
            fecha_pago = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('Venta no encontrada');
      }

      return await this.findById(id);
    } catch (error) {
      console.error('Error en ProductAssignment.markAsPaid:', error);
      throw error;
    }
  }

  /**
   * Cancelar venta (devolver stock)
   */
  static async cancel(id) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Obtener datos de la venta
      const getQuery = 'SELECT * FROM ventas_productos WHERE id = $1';
      const ventaResult = await client.query(getQuery, [id]);
      
      if (ventaResult.rows.length === 0) {
        throw new Error('Venta no encontrada');
      }

      const venta = ventaResult.rows[0];

      // Actualizar estado de la venta
      const updateQuery = `
        UPDATE ventas_productos
        SET estado_pago = 'cancelado',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      await client.query(updateQuery, [id]);

      // Devolver stock al producto
      const restoreStockQuery = `
        UPDATE productos
        SET stock = stock + $1
        WHERE id = $2
      `;
      await client.query(restoreStockQuery, [venta.cantidad, venta.producto_id]);

      await client.query('COMMIT');

      return await this.findById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en ProductAssignment.cancel:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtener total de deuda pendiente de un cliente
   */
  static async getTotalDebt(clientId) {
    try {
      const query = `
        SELECT COALESCE(SUM(total), 0) as total_deuda
        FROM ventas_productos
        WHERE cliente_id = $1 AND estado_pago = 'pendiente'
      `;
      
      const result = await pool.query(query, [clientId]);
      return parseFloat(result.rows[0].total_deuda);
    } catch (error) {
      console.error('Error en ProductAssignment.getTotalDebt:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de ventas
   */
  static async getStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_ventas,
          COUNT(CASE WHEN estado_pago = 'pendiente' THEN 1 END) as ventas_pendientes,
          COUNT(CASE WHEN estado_pago = 'pagado' THEN 1 END) as ventas_pagadas,
          COALESCE(SUM(CASE WHEN estado_pago = 'pendiente' THEN total ELSE 0 END), 0) as total_pendiente,
          COALESCE(SUM(CASE WHEN estado_pago = 'pagado' THEN total ELSE 0 END), 0) as total_cobrado
        FROM ventas_productos
      `;
      
      const result = await pool.query(query);
      return result.rows[0];
    } catch (error) {
      console.error('Error en ProductAssignment.getStats:', error);
      throw error;
    }
  }
}

module.exports = ProductAssignment;