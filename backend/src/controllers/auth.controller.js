const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const UAParser = require('ua-parser-js');
const User = require('../models/User');
const Session = require('../models/Session');
const Company = require('../models/Company');
const Plan = require('../models/Plan');
const { sendSuccess, sendError } = require('../utils/response');

// Gera um hash do token para salvar no banco (não salvamos o token direto por segurança)
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Extrai informações do dispositivo do cabeçalho User-Agent
const getDeviceInfo = (userAgent) => {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  const browser = result.browser.name || 'Navegador desconhecido';
  const os = result.os.name || 'Sistema desconhecido';
  return `${browser} - ${os}`;
};

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Busca o usuário (incluindo a senha, que por padrão fica oculta)
    const user = await User.findOne({ email, isActive: true }).select('+password');
    if (!user) {
      return sendError(res, 'E-mail ou senha incorretos', 401);
    }

    // 2. Verifica a senha
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return sendError(res, 'E-mail ou senha incorretos', 401);
    }

    // 3. Se for um usuário de empresa (não superadmin), verifica o plano
    if (user.role !== 'superadmin' && user.company) {
      const company = await Company.findById(user.company).populate('plan');

      if (!company || !company.isActive) {
        return sendError(res, 'Empresa inativa ou não encontrada', 403);
      }

      // Verifica se o plano não expirou
      if (new Date() > company.planExpiresAt) {
        return sendError(res, 'Plano da empresa expirado. Entre em contato com o suporte.', 403);
      }

      const plan = company.plan;

      // Verifica limite de sessões simultâneas (o coração do controle de acesso)
      if (plan.maxSessions !== -1) {
        const activeSessions = await Session.countDocuments({
          company: company._id,
          isActive: true,
          expiresAt: { $gt: new Date() },
        });

        if (activeSessions >= plan.maxSessions) {
          return sendError(
            res,
            `Limite de ${plan.maxSessions} acesso(s) simultâneo(s) do plano ${plan.name} atingido. Faça logout em outro dispositivo ou entre em contato com o administrador.`,
            403
          );
        }
      }
    }

    // 4. Gera o token JWT
    const token = jwt.sign(
      { id: user._id, role: user.role, company: user.company },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // 5. Registra a sessão no banco
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await Session.create({
      user: user._id,
      company: user.company || null,
      tokenHash: hashToken(token),
      deviceInfo: getDeviceInfo(req.headers['user-agent']),
      ip: req.ip || req.connection.remoteAddress,
      expiresAt,
    });

    // 6. Atualiza data do último login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    // 7. Retorna os dados sem a senha
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      avatar: user.avatar,
    };

    return sendSuccess(res, { token, user: userResponse }, 'Login realizado com sucesso');
  } catch (error) {
    console.error('Erro no login:', error);
    return sendError(res, 'Erro interno no servidor', 500);
  }
};

// ─────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await Session.findOneAndUpdate(
        { tokenHash: hashToken(token) },
        { isActive: false }
      );
    }
    return sendSuccess(res, {}, 'Logout realizado com sucesso');
  } catch (error) {
    return sendError(res, 'Erro ao fazer logout', 500);
  }
};

// ─────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('company');
    return sendSuccess(res, { user }, 'Dados do usuário');
  } catch (error) {
    return sendError(res, 'Erro ao buscar dados do usuário', 500);
  }
};

module.exports = { login, logout, getMe };
