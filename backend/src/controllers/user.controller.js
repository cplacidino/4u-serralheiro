const User = require('../models/User');
const Session = require('../models/Session');
const Company = require('../models/Company');
const Plan = require('../models/Plan');
const { sendSuccess, sendError } = require('../utils/response');

// ─────────────────────────────────────────────
// GET /api/s/users — Listar usuários da empresa
// ─────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const company = req.user.company;

    const users = await User.find({ company }).sort({ createdAt: 1 });

    // Conta sessões ativas de cada usuário
    const usersWithSessions = await Promise.all(
      users.map(async (u) => {
        const activeSessions = await Session.countDocuments({
          user: u._id,
          isActive: true,
          expiresAt: { $gt: new Date() },
        });
        return { ...u.toObject(), activeSessions };
      })
    );

    // Informações do plano para mostrar o limite
    const companyDoc = await Company.findById(company).populate('plan');
    const maxUsers = companyDoc?.plan?.maxUsers ?? -1;

    return sendSuccess(res, { users: usersWithSessions, maxUsers });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return sendError(res, 'Erro ao listar usuários', 500);
  }
};

// ─────────────────────────────────────────────
// POST /api/s/users — Criar funcionário
// ─────────────────────────────────────────────
const createUser = async (req, res) => {
  try {
    const company = req.user.company;
    const { name, email, password } = req.body;

    // Verifica o limite de usuários do plano
    const companyDoc = await Company.findById(company).populate('plan');
    const maxUsers = companyDoc?.plan?.maxUsers ?? -1;

    if (maxUsers !== -1) {
      const currentCount = await User.countDocuments({ company, isActive: true });
      if (currentCount >= maxUsers) {
        return sendError(
          res,
          `Limite de ${maxUsers} usuário(s) do plano ${companyDoc.plan.name} atingido. Faça upgrade para adicionar mais.`,
          403
        );
      }
    }

    // Verifica se e-mail já existe
    const existing = await User.findOne({ email });
    if (existing) return sendError(res, 'Já existe um usuário com este e-mail', 400);

    const user = await User.create({
      name,
      email,
      password,
      role: 'employee',
      company,
    });

    return sendSuccess(
      res,
      { user: { _id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive } },
      'Funcionário criado com sucesso',
      201
    );
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return sendError(res, 'Erro ao criar usuário', 500);
  }
};

// ─────────────────────────────────────────────
// PUT /api/s/users/:id — Editar funcionário
// ─────────────────────────────────────────────
const updateUser = async (req, res) => {
  try {
    const company = req.user.company;
    const { name, email, password, isActive } = req.body;

    const user = await User.findOne({ _id: req.params.id, company }).select('+password');
    if (!user) return sendError(res, 'Usuário não encontrado', 404);

    // Não permite editar o próprio owner pelo painel de funcionários
    if (user.role === 'owner' && req.user.id !== user._id.toString()) {
      return sendError(res, 'Não é possível editar outro proprietário', 403);
    }

    if (name) user.name = name;
    if (email && email !== user.email) {
      const exists = await User.findOne({ email });
      if (exists) return sendError(res, 'E-mail já em uso', 400);
      user.email = email;
    }
    if (password) user.password = password; // o pre-save vai hashear
    if (typeof isActive === 'boolean') {
      user.isActive = isActive;
      // Se desativou, encerra as sessões
      if (!isActive) {
        await Session.updateMany({ user: user._id }, { isActive: false });
      }
    }

    await user.save();

    return sendSuccess(res, {
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive },
    }, 'Usuário atualizado com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return sendError(res, 'Erro ao atualizar usuário', 500);
  }
};

// ─────────────────────────────────────────────
// DELETE /api/s/users/:id — Encerrar sessões do usuário
// ─────────────────────────────────────────────
const kickUser = async (req, res) => {
  try {
    const company = req.user.company;
    const user = await User.findOne({ _id: req.params.id, company });
    if (!user) return sendError(res, 'Usuário não encontrado', 404);

    await Session.updateMany({ user: user._id }, { isActive: false });
    return sendSuccess(res, {}, 'Sessões encerradas com sucesso');
  } catch (error) {
    return sendError(res, 'Erro ao encerrar sessões', 500);
  }
};

// ─────────────────────────────────────────────
// GET /api/s/profile — Perfil do usuário logado
// ─────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return sendError(res, 'Usuário não encontrado', 404);
    return sendSuccess(res, { user });
  } catch (error) {
    return sendError(res, 'Erro ao buscar perfil', 500);
  }
};

// ─────────────────────────────────────────────
// PUT /api/s/profile — Atualizar nome/e-mail
// ─────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return sendError(res, 'Usuário não encontrado', 404);

    if (name) user.name = name.trim();
    if (email && email !== user.email) {
      const exists = await User.findOne({ email, _id: { $ne: user._id } });
      if (exists) return sendError(res, 'E-mail já em uso', 400);
      user.email = email.toLowerCase().trim();
    }

    await user.save();
    return sendSuccess(res, {
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    }, 'Perfil atualizado com sucesso');
  } catch (error) {
    return sendError(res, 'Erro ao atualizar perfil', 500);
  }
};

// ─────────────────────────────────────────────
// PUT /api/s/profile/password — Trocar senha
// ─────────────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return sendError(res, 'Senha atual e nova senha são obrigatórias', 400);
    }
    if (newPassword.length < 8) {
      return sendError(res, 'A nova senha deve ter ao menos 8 caracteres', 400);
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) return sendError(res, 'Usuário não encontrado', 404);

    const ok = await user.comparePassword(currentPassword);
    if (!ok) return sendError(res, 'Senha atual incorreta', 401);

    user.password = newPassword; // pre-save hasheia
    await user.save();

    // Encerra todas as sessões exceto a atual (identificada pelo token)
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(req.token).digest('hex');
    const currentSession = await Session.findOne({ tokenHash });
    await Session.updateMany(
      { user: user._id, ...(currentSession ? { _id: { $ne: currentSession._id } } : {}) },
      { isActive: false }
    );

    return sendSuccess(res, {}, 'Senha alterada com sucesso');
  } catch (error) {
    return sendError(res, 'Erro ao trocar senha', 500);
  }
};

module.exports = { getUsers, createUser, updateUser, kickUser, getProfile, updateProfile, changePassword };
