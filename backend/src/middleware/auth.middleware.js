const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Session = require('../models/Session');
const { sendError } = require('../utils/response');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Middleware que protege rotas — verifica se o usuário está autenticado
const protect = async (req, res, next) => {
  try {
    // Pega o token do cabeçalho Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Acesso negado. Faça login para continuar.', 401);
    }

    const token = authHeader.split(' ')[1];

    // Verifica se o token JWT é válido
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return sendError(res, 'Token inválido ou expirado. Faça login novamente.', 401);
    }

    // Verifica se a sessão ainda está ativa no banco (proteção extra contra logout)
    const session = await Session.findOne({
      tokenHash: hashToken(token),
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return sendError(res, 'Sessão encerrada. Faça login novamente.', 401);
    }

    // Adiciona os dados do usuário à requisição
    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    return sendError(res, 'Erro na autenticação', 500);
  }
};

// Middleware para restringir acesso por papel (role)
// Uso: restrict('superadmin') ou restrict('superadmin', 'owner')
const restrict = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendError(res, 'Você não tem permissão para acessar este recurso.', 403);
    }
    next();
  };
};

module.exports = { protect, restrict };
