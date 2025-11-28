const jwt = require('jsonwebtoken');
const { User } = require('../models');

class AuthController {
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await User.findByEmail(email);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      if (!user.activo) {
        return res.status(403).json({
          success: false,
          message: 'Usuario inactivo. Contacte al administrador'
        });
      }

      const isPasswordValid = await User.verifyPassword(password, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          rol: user.rol 
        },
        process.env.JWT_SECRET || 'vidafit-secret-key-2024',
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          token,
          user: {
            id: user.id,
            nombre: user.nombre,
            email: user.email,
            rol: user.rol
          }
        }
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        message: 'Error al iniciar sesión',
        error: error.message
      });
    }
  }

  static async register(req, res) {
    try {
      const { nombre, email, password, rol, telefono } = req.body;

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'El email ya está registrado'
        });
      }

      const user = await User.create({ nombre, email, password, rol, telefono });

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: user
      });
    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar usuario',
        error: error.message
      });
    }
  }

  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      delete user.password_hash;

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener perfil',
        error: error.message
      });
    }
  }

  static async updatePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user.id);

      const isPasswordValid = await User.verifyPassword(currentPassword, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Contraseña actual incorrecta'
        });
      }

      await User.updatePassword(req.user.id, newPassword);

      res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });
    } catch (error) {
      console.error('Error al actualizar contraseña:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar contraseña',
        error: error.message
      });
    }
  }
}

module.exports = AuthController;