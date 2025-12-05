const HID = require('node-hid');
const crypto = require('crypto');

/**
 * Servicio para U.are.U 4500 usando SOLO HID (sin usb library)
 */
class FingerprintService {
  constructor() {
    this.device = null;
    this.vendorId = 0x05ba;
    this.productId = 0x000a;
    this.isConnected = false;
    this.isCapturing = false;
    this.captureCallback = null;
    this.capturedData = [];
    this.dataTimeout = null;
    this.captureStartTime = null;
    this.devicePath = null;
  }

  /**
   * Lista TODAS las interfaces del dispositivo
   */
  listDevices() {
    try {
      const allDevices = HID.devices();
      
      // Buscar TODAS las interfaces del U.are.U 4500
      const targetDevices = allDevices.filter(d => 
        d.vendorId === this.vendorId && 
        d.productId === this.productId
      );

      return targetDevices.map(device => ({
        vendorId: '0x' + device.vendorId.toString(16).padStart(4, '0'),
        productId: '0x' + device.productId.toString(16).padStart(4, '0'),
        manufacturer: device.manufacturer,
        product: device.product,
        path: device.path,
        usagePage: device.usagePage,
        usage: device.usage,
        interface: device.interface,
        isTarget: true
      }));
    } catch (error) {
      console.error('Error listando dispositivos:', error);
      return [];
    }
  }

  /**
   * Encuentra la interfaz correcta para el U.are.U 4500
   */
  async findWorkingInterface() {
    const devices = HID.devices();
    
    const targetDevices = devices.filter(d => 
      d.vendorId === this.vendorId && 
      d.productId === this.productId
    );

    if (targetDevices.length === 0) {
      throw new Error('Dispositivo U.are.U 4500 no encontrado en HID');
    }

    console.log(`📋 Se encontraron ${targetDevices.length} interfaz(ces) del dispositivo\n`);

    // Intentar cada interfaz
    for (let i = 0; i < targetDevices.length; i++) {
      const device = targetDevices[i];
      
      console.log(`Probando interfaz ${i + 1}/${targetDevices.length}:`);
      console.log(`  Path: ${device.path}`);
      console.log(`  Usage Page: 0x${device.usagePage?.toString(16) || '0'}`);
      console.log(`  Usage: 0x${device.usage?.toString(16) || '0'}`);
      console.log(`  Interface: ${device.interface}`);

      try {
        const testDevice = new HID.HID(device.path);
        console.log('  ✅ Se puede abrir\n');
        testDevice.close();
        
        // Esta interfaz funciona, la usamos
        this.devicePath = device.path;
        return device;
      } catch (error) {
        console.log(`  ❌ No se puede abrir: ${error.message}\n`);
      }
    }

    throw new Error('Ninguna interfaz del dispositivo es accesible');
  }

  /**
   * Conecta con el dispositivo
   */
  async connect() {
    try {
      if (this.isConnected) {
        this.disconnect();
      }

      console.log('🔍 Buscando dispositivo U.are.U 4500...\n');

      // Buscar interfaz que funcione
      const workingDevice = await this.findWorkingInterface();

      console.log('✅ Interfaz funcional encontrada');
      console.log(`   Path: ${workingDevice.path}\n`);

      // Abrir dispositivo
      this.device = new HID.HID(this.devicePath);
      
      console.log('✅ Dispositivo abierto\n');

      // Configurar listeners
      this.device.on('data', (data) => {
        if (this.isCapturing) {
          this.handleDeviceData(data);
        }
      });

      this.device.on('error', (error) => {
        console.error('❌ Error en dispositivo:', error);
        this.isConnected = false;
      });

      // Intentar leer información del dispositivo
      try {
        const manufacturer = this.device.getManufacturerString();
        const product = this.device.getProductString();
        console.log('📝 Información del dispositivo:');
        console.log(`   Fabricante: ${manufacturer}`);
        console.log(`   Producto: ${product}\n`);
      } catch (e) {
        console.log('ℹ️  No se pudo leer información adicional\n');
      }

      this.isConnected = true;

      console.log('╔════════════════════════════════════════════════╗');
      console.log('║   DISPOSITIVO CONECTADO Y LISTO               ║');
      console.log('╚════════════════════════════════════════════════╝\n');

      return true;
    } catch (error) {
      console.error('❌ Error al conectar:', error.message);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Maneja los datos recibidos del dispositivo
   */
  handleDeviceData(data) {
    try {
      if (!data || data.length === 0) return;
      
      // Filtrar paquetes vacíos
      const nonZeroBytes = data.filter(b => b !== 0).length;
      if (nonZeroBytes < 3) return;
      
      // Primera recepción de datos
      if (this.capturedData.length === 0) {
        console.log('\n📊 ¡DATOS DETECTADOS! Capturando...');
        console.log('   Tamaño paquete:', data.length, 'bytes');
        console.log('   Primeros bytes:', 
          Array.from(data.slice(0, Math.min(16, data.length)))
            .map(b => '0x' + b.toString(16).padStart(2, '0'))
            .join(' ')
        );
        console.log('');
      }
      
      // Acumular datos
      this.capturedData.push(...data);
      
      const totalBytes = this.capturedData.length;
      
      // Mostrar progreso cada 10KB
      if (totalBytes % 10000 < data.length) {
        console.log(`   📊 ${totalBytes} bytes capturados...`);
      }

      // Cancelar timeout anterior
      if (this.dataTimeout) {
        clearTimeout(this.dataTimeout);
      }
      
      // Parámetros de captura
      const minSize = 3000;     // Mínimo aceptable
      const targetSize = 20000; // Objetivo
      const maxSize = 100000;   // Máximo
      
      if (totalBytes >= maxSize) {
        console.log('\n✅ Tamaño máximo alcanzado');
        clearTimeout(this.dataTimeout);
        this.finishCapture();
        return;
      }
      
      if (totalBytes >= targetSize) {
        // Ya tenemos suficientes datos, esperar poco tiempo
        this.dataTimeout = setTimeout(() => {
          if (this.isCapturing) {
            console.log('\n✅ Captura completa');
            this.finishCapture();
          }
        }, 500);
      } else if (totalBytes >= minSize) {
        // Datos intermedios, esperar más tiempo
        this.dataTimeout = setTimeout(() => {
          if (this.isCapturing) {
            console.log('\n⚠️  Finalizando con datos limitados');
            this.finishCapture();
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Error procesando datos:', error);
    }
  }

  /**
   * Finaliza la captura
   */
  finishCapture() {
    if (this.captureCallback && this.capturedData.length > 0) {
      const captureTime = Date.now() - this.captureStartTime;
      
      const buffer = Buffer.from(this.capturedData);
      const template = {
        raw: buffer.toString('base64'),
        hash: crypto.createHash('sha256').update(buffer).digest('hex'),
        size: buffer.length,
        features: this.extractBasicFeatures(buffer),
        timestamp: Date.now(),
        captureTimeMs: captureTime
      };
      
      console.log('\n╔════════════════════════════════════════════════╗');
      console.log('║           TEMPLATE GENERADO                   ║');
      console.log('╚════════════════════════════════════════════════╝');
      console.log(`  Tamaño: ${template.size} bytes`);
      console.log(`  Hash: ${template.hash.substring(0, 32)}...`);
      console.log(`  Features: ${template.features.length}`);
      console.log(`  Tiempo: ${captureTime}ms\n`);
      
      this.captureCallback(null, JSON.stringify(template));
      this.captureCallback = null;
    }

    this.isCapturing = false;
    this.capturedData = [];
  }

  /**
   * Extrae características básicas
   */
  extractBasicFeatures(buffer) {
    const features = [];
    const sampleInterval = Math.floor(buffer.length / 100);

    for (let i = 0; i < buffer.length; i += sampleInterval) {
      if (i + 8 <= buffer.length) {
        features.push({
          position: i,
          value: buffer.readUInt32LE(i),
          variance: this.calculateLocalVariance(buffer, i, 16)
        });
      }
    }
    return features;
  }

  calculateLocalVariance(buffer, position, windowSize) {
    const window = [];
    const start = Math.max(0, position - windowSize / 2);
    const end = Math.min(buffer.length, position + windowSize / 2);

    for (let i = start; i < end; i++) {
      window.push(buffer[i]);
    }

    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    return window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
  }

  /**
   * Captura una huella
   */
  async captureFingerprint(timeout = 30000) {
    if (!this.isConnected) {
      console.log('🔌 Dispositivo no conectado, conectando...\n');
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      this.capturedData = [];
      this.isCapturing = true;
      this.captureStartTime = Date.now();

      console.log('╔════════════════════════════════════════════════╗');
      console.log('║      COLOQUE SU DEDO EN EL SENSOR             ║');
      console.log('╚════════════════════════════════════════════════╝\n');
      console.log('💡 INSTRUCCIONES:');
      console.log('   1. Limpie su dedo y el sensor');
      console.log('   2. Coloque el dedo en el CENTRO del sensor');
      console.log('   3. Presione FIRMEMENTE');
      console.log('   4. Mantenga sin mover hasta que termine\n');
      console.log(`⏱️  Timeout: ${timeout / 1000} segundos\n`);
      console.log('⏳ Esperando datos...\n');

      const timeoutId = setTimeout(() => {
        this.isCapturing = false;
        const bytes = this.capturedData.length;
        this.capturedData = [];
        this.captureCallback = null;
        
        if (bytes === 0) {
          reject(new Error('Timeout: No se recibieron datos del sensor. Asegúrese de presionar el dedo firmemente.'));
        } else {
          reject(new Error(`Timeout: Solo se recibieron ${bytes} bytes. Intente presionar más fuerte y mantener el dedo quieto.`));
        }
      }, timeout);

      this.captureCallback = (error, template) => {
        clearTimeout(timeoutId);
        error ? reject(error) : resolve(template);
      };
      
      // Recordatorios
      const reminders = [
        { time: 5000, msg: '⏰ 5 segundos... Si no ve datos, presione más fuerte' },
        { time: 10000, msg: '⏰ 10 segundos... Mantenga el dedo presionado' },
        { time: 15000, msg: '⏰ 15 segundos... No mueva el dedo' }
      ];

      reminders.forEach(({ time, msg }) => {
        setTimeout(() => {
          if (this.isCapturing && this.capturedData.length < 5000) {
            console.log(msg);
          }
        }, time);
      });
    });
  }

  /**
   * Compara templates
   */
  compareTemplates(t1Str, t2Str) {
    if (!t1Str || !t2Str) {
      return { match: false, similarity: 0, method: 'none' };
    }

    try {
      const t1 = JSON.parse(t1Str);
      const t2 = JSON.parse(t2Str);

      if (t1.hash === t2.hash) {
        return { match: true, similarity: 100, method: 'hash' };
      }

      const featSim = this.compareFeatures(t1.features, t2.features);
      const rawSim = this.compareRawData(t1.raw, t2.raw);
      const combined = (featSim * 0.7) + (rawSim * 0.3);

      const threshold = 70;
      return {
        match: combined >= threshold,
        similarity: combined,
        method: 'combined',
        details: { features: featSim, raw: rawSim, threshold }
      };
    } catch (error) {
      return this.compareTemplatesBasic(t1Str, t2Str);
    }
  }

  compareFeatures(f1, f2) {
    if (!f1 || !f2 || f1.length === 0 || f2.length === 0) return 0;

    let matches = 0;
    const tolerance = 0.15;

    for (const a of f1) {
      for (const b of f2) {
        const posDiff = Math.abs(a.position - b.position);
        const posRatio = posDiff / Math.max(a.position, b.position);
        
        if (posRatio < 0.05) {
          const valDiff = Math.abs(a.value - b.value) / Math.max(a.value, b.value);
          const varDiff = Math.abs(a.variance - b.variance) / Math.max(a.variance, b.variance, 1);
          
          if (valDiff < tolerance && varDiff < tolerance) {
            matches++;
            break;
          }
        }
      }
    }

    return (matches / Math.max(f1.length, f2.length)) * 100;
  }

  compareRawData(r1, r2) {
    try {
      const b1 = Buffer.from(r1, 'base64');
      const b2 = Buffer.from(r2, 'base64');

      if (Math.abs(b1.length - b2.length) > 10000) return 0;

      const segments = 20;
      const segSize = Math.floor(Math.min(b1.length, b2.length) / segments);
      let matching = 0;

      for (let i = 0; i < segments; i++) {
        const start = i * segSize;
        const end = start + segSize;
        
        let matches = 0;
        for (let j = start; j < end && j < b1.length && j < b2.length; j++) {
          if (b1[j] === b2[j]) matches++;
        }
        
        if ((matches / segSize) > 0.65) matching++;
      }

      return (matching / segments) * 100;
    } catch (error) {
      return 0;
    }
  }

  compareTemplatesBasic(t1, t2) {
    try {
      const b1 = Buffer.from(t1, 'base64');
      const b2 = Buffer.from(t2, 'base64');

      if (Math.abs(b1.length - b2.length) > 5000) {
        return { match: false, similarity: 0, method: 'basic-size' };
      }

      const minLen = Math.min(b1.length, b2.length);
      let matches = 0;

      for (let i = 0; i < minLen; i++) {
        if (b1[i] === b2[i]) matches++;
      }

      const similarity = (matches / minLen) * 100;
      return { match: similarity >= 75, similarity, method: 'basic' };
    } catch (error) {
      return { match: false, similarity: 0, method: 'error' };
    }
  }

  findMatchingTemplate(captured, stored) {
    let best = null;
    let bestSim = 0;

    console.log(`\n🔍 Comparando con ${stored.length} huellas...\n`);

    for (const s of stored) {
      const result = this.compareTemplates(captured, s.template);
      console.log(`   ${s.nombre} ${s.apellido}: ${result.similarity.toFixed(2)}%`);
      
      if (result.match && result.similarity > bestSim) {
        best = s;
        bestSim = result.similarity;
      }
    }

    if (best) {
      console.log(`\n✅ COINCIDENCIA: ${best.nombre} ${best.apellido} (${bestSim.toFixed(2)}%)\n`);
    } else {
      console.log('\n❌ No se encontró coincidencia\n');
    }

    return best;
  }

  disconnect() {
    if (this.device && this.isConnected) {
      try {
        this.device.close();
        this.isConnected = false;
        this.device = null;
        console.log('🔴 Dispositivo desconectado');
      } catch (error) {
        console.error('Error al desconectar:', error);
      }
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      capturing: this.isCapturing,
      devicePath: this.devicePath,
      device: this.isConnected ? {
        vendorId: '0x' + this.vendorId.toString(16),
        productId: '0x' + this.productId.toString(16),
        name: 'U.are.U 4500',
        manufacturer: 'DigitalPersona'
      } : null
    };
  }

  async reconnect() {
    console.log('🔄 Reiniciando conexión...');
    this.disconnect();
    await new Promise(r => setTimeout(r, 1000));
    return await this.connect();
  }
}

let instance = null;

const getFingerprintService = () => {
  if (!instance) instance = new FingerprintService();
  return instance;
};

module.exports = { FingerprintService, getFingerprintService };