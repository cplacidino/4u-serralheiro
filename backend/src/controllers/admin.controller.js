const Company = require('../models/Company');
const User = require('../models/User');
const Plan = require('../models/Plan');
const Session = require('../models/Session');
const { sendSuccess, sendError } = require('../utils/response');

// ─────────────────────────────────────────────
// GET /api/admin/stats
// ─────────────────────────────────────────────
const getStats = async (_req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [totalCompanies, activeCompanies, totalUsers, newThisMonth, expiringIn30Count] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ isActive: true, planExpiresAt: { $gt: now } }),
      User.countDocuments({ isActive: true }),
      Company.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Company.countDocuments({ isActive: true, planExpiresAt: { $gt: now, $lte: in30 } }),
    ]);

    const companiesByPlan = await Company.aggregate([
      { $match: { isActive: true, planExpiresAt: { $gt: now } } },
      { $group: { _id: '$plan', count: { $sum: 1 } } },
      { $lookup: { from: 'plans', localField: '_id', foreignField: '_id', as: 'planInfo' } },
      { $unwind: '$planInfo' },
      { $project: { name: '$planInfo.name', price: '$planInfo.price', count: 1 } },
    ]);

    const monthlyRevenue = companiesByPlan.reduce((total, p) => total + p.price * p.count, 0);

    const recentCompanies = await Company.find()
      .populate('plan', 'name price')
      .sort({ createdAt: -1 })
      .limit(5);

    const expiringSoon = await Company.find({ isActive: true, planExpiresAt: { $gt: now, $lte: in30 } })
      .populate('plan', 'name price')
      .sort({ planExpiresAt: 1 })
      .limit(10);

    return sendSuccess(res, {
      totalCompanies,
      activeCompanies,
      inactiveCompanies: totalCompanies - activeCompanies,
      monthlyRevenue,
      companiesByPlan,
      recentCompanies,
      totalUsers,
      newThisMonth,
      expiringIn30Count,
      expiringSoon,
    });
  } catch (error) {
    console.error('Erro ao buscar stats:', error);
    return sendError(res, 'Erro ao buscar estatísticas', 500);
  }
};

// ─────────────────────────────────────────────
// GET /api/admin/companies
// ─────────────────────────────────────────────
const getCompanies = async (req, res) => {
  try {
    const { search, plan, status, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (plan) filter.plan = plan;
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    const total = await Company.countDocuments(filter);
    const companies = await Company.find(filter)
      .populate('plan', 'name price maxUsers')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const companyIds = companies.map((c) => c._id);
    const userCounts = await User.aggregate([
      { $match: { company: { $in: companyIds }, isActive: true } },
      { $group: { _id: '$company', count: { $sum: 1 } } },
    ]);
    const userCountMap = Object.fromEntries(userCounts.map((u) => [u._id.toString(), u.count]));
    const companiesWithUsers = companies.map((c) => ({
      ...c.toObject(),
      userCount: userCountMap[c._id.toString()] ?? 0,
    }));

    return sendSuccess(res, {
      companies: companiesWithUsers,
      total,
      pages: Math.ceil(total / limit),
      currentPage: Number(page),
    });
  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    return sendError(res, 'Erro ao listar empresas', 500);
  }
};

// ─────────────────────────────────────────────
// POST /api/admin/companies
// ─────────────────────────────────────────────
const createCompany = async (req, res) => {
  try {
    const { name, email, phone, cnpj, planId, ownerName, ownerEmail, ownerPassword, durationMonths = 1 } = req.body;

    const plan = await Plan.findById(planId);
    if (!plan) return sendError(res, 'Plano não encontrado', 404);

    const existingCompany = await Company.findOne({ email });
    if (existingCompany) return sendError(res, 'Já existe uma empresa com este e-mail', 400);

    const existingUser = await User.findOne({ email: ownerEmail });
    if (existingUser) return sendError(res, 'Já existe um usuário com este e-mail', 400);

    const planExpiresAt = new Date();
    planExpiresAt.setMonth(planExpiresAt.getMonth() + Number(durationMonths));

    const company = await Company.create({ name, email, phone, cnpj, plan: planId, planExpiresAt });

    const owner = await User.create({
      name: ownerName,
      email: ownerEmail,
      password: ownerPassword,
      role: 'owner',
      company: company._id,
    });

    return sendSuccess(
      res,
      { company, owner: { _id: owner._id, name: owner.name, email: owner.email } },
      'Empresa criada com sucesso',
      201
    );
  } catch (error) {
    console.error('Erro ao criar empresa:', error);
    return sendError(res, 'Erro ao criar empresa', 500);
  }
};

// ─────────────────────────────────────────────
// PUT /api/admin/companies/:id
// ─────────────────────────────────────────────
const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, cnpj, planId, isActive, addMonths } = req.body;

    const company = await Company.findById(id);
    if (!company) return sendError(res, 'Empresa não encontrada', 404);

    if (name) company.name = name;
    if (email) company.email = email;
    if (phone !== undefined) company.phone = phone;
    if (cnpj !== undefined) company.cnpj = cnpj;
    if (planId) company.plan = planId;
    if (typeof isActive === 'boolean') company.isActive = isActive;

    if (addMonths) {
      const base = company.planExpiresAt > new Date() ? company.planExpiresAt : new Date();
      base.setMonth(base.getMonth() + Number(addMonths));
      company.planExpiresAt = base;
    }

    await company.save();
    await company.populate('plan', 'name price maxUsers');

    if (isActive === false) {
      await Session.updateMany({ company: id }, { isActive: false });
    }

    return sendSuccess(res, { company }, 'Empresa atualizada com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    return sendError(res, 'Erro ao atualizar empresa', 500);
  }
};

// ─────────────────────────────────────────────
// GET /api/admin/companies/:id/users
// ─────────────────────────────────────────────
const getCompanyUsers = async (req, res) => {
  try {
    const { id } = req.params;
    const company = await Company.findById(id);
    if (!company) return sendError(res, 'Empresa não encontrada', 404);

    const users = await User.find({ company: id })
      .select('name email role isActive createdAt')
      .sort({ role: 1, name: 1 });

    return sendSuccess(res, { users });
  } catch (error) {
    console.error('Erro ao listar usuários da empresa:', error);
    return sendError(res, 'Erro ao listar usuários', 500);
  }
};

// ─────────────────────────────────────────────
// POST /api/admin/companies/:id/users
// ─────────────────────────────────────────────
const createCompanyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role = 'employee' } = req.body;

    if (!name || !email || !password) return sendError(res, 'Nome, e-mail e senha são obrigatórios', 400);
    if (password.length < 8) return sendError(res, 'Senha mínima de 8 caracteres', 400);

    const company = await Company.findById(id).populate('plan');
    if (!company) return sendError(res, 'Empresa não encontrada', 404);

    if (company.plan.maxUsers !== -1) {
      const currentCount = await User.countDocuments({ company: id, isActive: true });
      if (currentCount >= company.plan.maxUsers) {
        return sendError(res, `Limite de usuários atingido (${company.plan.maxUsers})`, 400);
      }
    }

    const existing = await User.findOne({ email });
    if (existing) return sendError(res, 'Já existe um usuário com este e-mail', 400);

    const user = await User.create({ name, email, password, role, company: id });

    return sendSuccess(
      res,
      { user: { _id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive } },
      'Usuário criado com sucesso',
      201
    );
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return sendError(res, 'Erro ao criar usuário', 500);
  }
};

// ─────────────────────────────────────────────
// PUT /api/admin/companies/:id/users/:userId/reset-password
// ─────────────────────────────────────────────
const resetUserPassword = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return sendError(res, 'A nova senha deve ter no mínimo 8 caracteres', 400);
    }

    const user = await User.findOne({ _id: userId, company: id });
    if (!user) return sendError(res, 'Usuário não encontrado', 404);

    user.password = newPassword;
    await user.save();

    await Session.updateMany({ user: userId }, { isActive: false });

    return sendSuccess(res, {}, 'Senha redefinida com sucesso');
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    return sendError(res, 'Erro ao redefinir senha', 500);
  }
};

// ─────────────────────────────────────────────
// PUT /api/admin/companies/:id/users/:userId/status
// ─────────────────────────────────────────────
const toggleUserStatus = async (req, res) => {
  try {
    const { id, userId } = req.params;

    const user = await User.findOne({ _id: userId, company: id });
    if (!user) return sendError(res, 'Usuário não encontrado', 404);

    user.isActive = !user.isActive;
    await user.save();

    if (!user.isActive) {
      await Session.updateMany({ user: userId }, { isActive: false });
    }

    return sendSuccess(res, { isActive: user.isActive }, `Usuário ${user.isActive ? 'ativado' : 'desativado'} com sucesso`);
  } catch (error) {
    console.error('Erro ao alterar status do usuário:', error);
    return sendError(res, 'Erro ao alterar status do usuário', 500);
  }
};

// ─────────────────────────────────────────────
// GET /api/admin/plans
// ─────────────────────────────────────────────
const getPlans = async (_req, res) => {
  try {
    const plans = await Plan.find().sort({ price: 1 });
    return sendSuccess(res, { plans });
  } catch (error) {
    return sendError(res, 'Erro ao listar planos', 500);
  }
};

// ─────────────────────────────────────────────
// POST /api/admin/plans
// ─────────────────────────────────────────────
const createPlan = async (req, res) => {
  try {
    const { name, price, maxUsers = 5, maxSessions = 3, features = [] } = req.body;

    if (!name || price === undefined) return sendError(res, 'Nome e preço são obrigatórios', 400);

    const existing = await Plan.findOne({ name });
    if (existing) return sendError(res, 'Já existe um plano com este nome', 400);

    const plan = await Plan.create({ name, price, maxUsers, maxSessions, features });

    return sendSuccess(res, { plan }, 'Plano criado com sucesso', 201);
  } catch (error) {
    console.error('Erro ao criar plano:', error);
    return sendError(res, 'Erro ao criar plano', 500);
  }
};

// ─────────────────────────────────────────────
// PUT /api/admin/plans/:id
// ─────────────────────────────────────────────
const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, maxUsers, maxSessions, features } = req.body;

    const plan = await Plan.findById(id);
    if (!plan) return sendError(res, 'Plano não encontrado', 404);

    if (name && name !== plan.name) {
      const existing = await Plan.findOne({ name, _id: { $ne: id } });
      if (existing) return sendError(res, 'Já existe um plano com este nome', 400);
      plan.name = name;
    }
    if (price !== undefined) plan.price = Number(price);
    if (maxUsers !== undefined) plan.maxUsers = Number(maxUsers);
    if (maxSessions !== undefined) plan.maxSessions = Number(maxSessions);
    if (features) plan.features = features;

    await plan.save();

    return sendSuccess(res, { plan }, 'Plano atualizado com sucesso');
  } catch (error) {
    return sendError(res, 'Erro ao atualizar plano', 500);
  }
};

// ─────────────────────────────────────────────
// DELETE /api/admin/plans/:id
// ─────────────────────────────────────────────
const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const usingCount = await Company.countDocuments({ plan: id });
    if (usingCount > 0) {
      return sendError(res, `Não é possível excluir: ${usingCount} empresa(s) usam este plano`, 400);
    }

    await Plan.findByIdAndDelete(id);

    return sendSuccess(res, {}, 'Plano excluído com sucesso');
  } catch (error) {
    return sendError(res, 'Erro ao excluir plano', 500);
  }
};

// ─────────────────────────────────────────────
// GET /api/admin/alerts
// ─────────────────────────────────────────────
const getAlerts = async (_req, res) => {
  try {
    const now = new Date();
    const in7  = new Date(now.getTime() +  7 * 24 * 60 * 60 * 1000);
    const in15 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [expired, expiring7, expiring15, expiring30] = await Promise.all([
      Company.find({ isActive: true, planExpiresAt: { $lt: now } })
        .populate('plan', 'name price').sort({ planExpiresAt: 1 }).limit(100),
      Company.find({ isActive: true, planExpiresAt: { $gte: now, $lte: in7 } })
        .populate('plan', 'name price').sort({ planExpiresAt: 1 }),
      Company.find({ isActive: true, planExpiresAt: { $gt: in7, $lte: in15 } })
        .populate('plan', 'name price').sort({ planExpiresAt: 1 }),
      Company.find({ isActive: true, planExpiresAt: { $gt: in15, $lte: in30 } })
        .populate('plan', 'name price').sort({ planExpiresAt: 1 }),
    ]);

    return sendSuccess(res, { expired, expiring7, expiring15, expiring30 });
  } catch (error) {
    console.error('Erro ao buscar alertas:', error);
    return sendError(res, 'Erro ao buscar alertas', 500);
  }
};

module.exports = {
  getStats,
  getCompanies, createCompany, updateCompany,
  getCompanyUsers, createCompanyUser, resetUserPassword, toggleUserStatus,
  getPlans, createPlan, updatePlan, deletePlan,
  getAlerts,
};
