const express = require('express');
const { body } = require('express-validator');
const { login, logout, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Validações do login
const loginValidation = [
  body('email').isEmail().withMessage('E-mail inválido').normalizeEmail(),
  body('password').notEmpty().withMessage('Senha é obrigatória'),
];

router.post('/login', loginValidation, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;
