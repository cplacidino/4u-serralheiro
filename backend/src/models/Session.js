const mongoose = require('mongoose');

// Este model é o coração do controle de acesso por plano.
// Cada login cria uma sessão. O sistema verifica quantas sessões
// ativas existem antes de permitir um novo login.

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },
    // Hash do token JWT para verificação e invalidação
    tokenHash: {
      type: String,
      required: true,
    },
    // Informações do dispositivo (ex: "Chrome - Windows")
    deviceInfo: {
      type: String,
      default: 'Dispositivo desconhecido',
    },
    // Endereço IP
    ip: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Índice para expirar sessões automaticamente no MongoDB
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Índice para buscar sessões ativas de uma empresa rapidamente
sessionSchema.index({ company: 1, isActive: 1 });

module.exports = mongoose.model('Session', sessionSchema);
