require('dotenv').config();

// Valida variáveis obrigatórias antes de iniciar
const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`❌ Variáveis de ambiente ausentes: ${missing.join(', ')}`);
  process.exit(1);
}

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./src/config/database');
const routes = require('./src/routes/index');
const errorHandler = require('./src/middleware/error.middleware');

// ─── Conecta ao banco de dados ───────────────────────────────
connectDB();

const app = express();

// ─── Segurança: Cabeçalhos HTTP seguros ──────────────────────
app.use(helmet());

// ─── Segurança: Controle de origens (CORS) ───────────────────
const allowedOrigins =
  process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL]
    : [/^http:\/\/localhost:\d+$/]; // Em desenvolvimento, aceita qualquer porta localhost

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// ─── Segurança: Limite de requisições (anti força-bruta) ─────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requisições por IP
  message: { success: false, message: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Limite mais restrito para a rota de login (anti força-bruta)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});
app.use('/api/auth/login', loginLimiter);

// ─── Parse do corpo das requisições ──────────────────────────
app.use(express.json({ limit: '10kb' })); // Limita tamanho do body
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Logs de requisições (apenas em desenvolvimento) ─────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Rotas da API ─────────────────────────────────────────────
app.use('/api', routes);

// ─── Rota não encontrada ──────────────────────────────────────
app.use('*', (_req, res) => {
  res.status(404).json({ success: false, message: 'Rota não encontrada' });
});

// ─── Middleware de erros (deve ser o último) ──────────────────
app.use(errorHandler);

// ─── Inicia o servidor ────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT} em modo ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
