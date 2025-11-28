const { Client, Membership } = require('../models');

class ClientController {
  static async getAll(req, res) {
    try {
      const { activo, search } = req.query;
      const filters = {};

      if (activo !== undefined) {
        filters.activo = activo === 'true';
      }

      if (search) {
        filters.search = search;
      }

      const clients = await Client.getAll(filters);

      res.json({
        success: true,
        data: clients
      });
    } catch (error) {
      console.error('Error al obtener clientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener clientes',
        error: error.message
      });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const client = await Client.getWithActiveMembership(id);

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      res.json({
        success: true,
        data: client
      });
    } catch (error) {
      console.error('Error al obtener cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener cliente',
        error: error.message
      });
    }
  }

  static async create(req, res) {
    try {
      const clientData = req.body;

      const existingClient = await Client.findByCedula(clientData.cedula);
      if (existingClient) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un cliente con esta cédula'
        });
      }

      const client = await Client.create(clientData);

      res.status(201).json({
        success: true,
        message: 'Cliente creado exitosamente',
        data: client
      });
    } catch (error) {
      console.error('Error al crear cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear cliente',
        error: error.message
      });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const clientData = req.body;

      const existingClient = await Client.findById(id);
      if (!existingClient) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      if (clientData.cedula && clientData.cedula !== existingClient.cedula) {
        const cedulaExists = await Client.findByCedula(clientData.cedula);
        if (cedulaExists) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe un cliente con esta cédula'
          });
        }
      }

      const updatedClient = await Client.update(id, clientData);

      res.json({
        success: true,
        message: 'Cliente actualizado exitosamente',
        data: updatedClient
      });
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar cliente',
        error: error.message
      });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;

      const client = await Client.findById(id);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      await Client.delete(id);

      res.json({
        success: true,
        message: 'Cliente eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar cliente',
        error: error.message
      });
    }
  }

  static async updateFingerprint(req, res) {
    try {
      const { id } = req.params;
      const { huella_template } = req.body;

      const client = await Client.findById(id);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      const updatedClient = await Client.updateFingerprint(id, huella_template);

      res.json({
        success: true,
        message: 'Huella digital actualizada exitosamente',
        data: updatedClient
      });
    } catch (error) {
      console.error('Error al actualizar huella:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar huella digital',
        error: error.message
      });
    }
  }

  static async findByFingerprint(req, res) {
    try {
      const { huella_template } = req.body;

      const client = await Client.findByFingerprint(huella_template);

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró un cliente con esta huella'
        });
      }

      const clientWithMembership = await Client.getWithActiveMembership(client.id);

      res.json({
        success: true,
        data: clientWithMembership
      });
    } catch (error) {
      console.error('Error al buscar por huella:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar cliente por huella',
        error: error.message
      });
    }
  }

  static async findByCedula(req, res) {
    try {
      const { cedula } = req.params;

      const client = await Client.findByCedula(cedula);

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró un cliente con esta cédula'
        });
      }

      const clientWithMembership = await Client.getWithActiveMembership(client.id);

      res.json({
        success: true,
        data: clientWithMembership
      });
    } catch (error) {
      console.error('Error al buscar por cédula:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar cliente por cédula',
        error: error.message
      });
    }
  }
}

module.exports = ClientController;