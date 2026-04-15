const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const serralheiroRoutes = require('./serralheiro.routes');

// Rota de verificação de saúde da API
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API 4u Serralheiro funcionando ✅', timestamp: new Date() });
});

// Rotas de autenticação
router.use('/auth', authRoutes);

// Rotas do painel admin
router.use('/admin', adminRoutes);

// Rotas do painel do serralheiro
router.use('/s', serralheiroRoutes);

module.exports = router;
