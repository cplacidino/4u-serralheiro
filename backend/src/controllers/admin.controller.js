const Company = require('../models/Company');
const User = require('../models/User');
const Plan = require('../models/Plan');
const Session = require('../models/Session');
const { sendSuccess, sendError } = require('../utils/response');

// ─────────────────────────────────────────────
// GET /api/admin/stats — Estatísticas do painel
// ─────────────────────────────────────────────
const getStats = async (_req, res) => {
  try {
    const [totalCompanies, activeCompanies] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ isActive: true, planExpiresAt: { $gt: new Date() } }),
    ]);

    // Conta empresas por plano e calcula receita
    const companiesByPlan = await Company.aggregate([
      { $match: { isActive: true, planExpiresAt: { $gt: new Date() } } },
      { $group: { _id: '$plan', count: { $sum: 1 } } },
      { $lookup: { from: 'plans', localField: '_id', foreignField: '_id', as: 'planInfo' } },
      { $unwind: '$planInfo' },
      { $project: { name: '$planInfo.name', price: '$planInfo.price', count: 1 } },
    ]);

    const monthlyRevenue = companiesByPlan.reduce(
      (total, p) => total + p.price * p.count, 0
    );

    const recentCompanies = await Company.find()
      .populate('plan', 'name price')
      .sort({ createdAt: -1 })
      .limit(5);

    return sendSuccess(res, {
      totalCompanies,
      activeCompanies,
      inactiveCompanies: totalCompanies - activeCompanies,
      monthlyRevenue,
      companiesByPlan,
      recentCompanies,
    });
  } catch (error) {
    console.error('Erro ao buscar stats:', error);
    return sendError(res, 'Erro ao buscar estatísticas', 500);
  }
};

// ─────────────────────────────────────────────
// GET /api/admin/companies — Listar empresas
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

    // Conta usuários de cada empresa com uma única query
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
// POST /api/admin/companies — Criar empresa
// ─────────────────────────────────────────────
const createCompany = async (req, res) => {
  try {
    const { name, email, phone, cnpj, planId, ownerName, ownerEmail, ownerPassword, durationMonths = 1 } = req.body;

    // Verifica se o plano existe
    const plan = await Plan.findById(planId);
    if (!plan) return sendError(res, 'Plano não encontrado', 404);

    // Verifica se já existe empresa com esse e-mail
    const existingCompany = await Company.findOne({ email });
    if (existingCompany) return sendError(res, 'Já existe uma empresa com este e-mail', 400);

    // Verifica se já existe usuário com o e-mail do responsável
    const existingUser = await User.findOne({ email: ownerEmail });
    if (existingUser) return sendError(res, 'Já existe um usuário com este e-mail', 400);

    // Calcula expiração do plano
    const planExpiresAt = new Date();
    planExpiresAt.setMonth(planExpiresAt.getMonth() + Number(durationMonths));

    // Cria a empresa
    const company = await Company.create({ name, email, phone, cnpj, plan: planId, planExpiresAt });

    // Cria o usuário responsável (owner)
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
// PUT /api/admin/companies/:id — Editar empresa
// ─────────────────────────────────────────────
const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, cnpj, planId, isActive, addMonths } = req.body;

    const company = await Company.findById(id);
    if (!company) return sendError(res, 'Empresa não encontrada', 404);

    if (name) company.name = name;
    if (email) company.email = email;
    if (phone) company.phone = phone;
    if (cnpj) company.cnpj = cnpj;
    if (planId) company.plan = planId;
    if (typeof isActive === 'boolean') company.isActive = isActive;

    // Adiciona meses ao plano
    if (addMonths) {
      const base = company.planExpiresAt > new Date() ? company.planExpiresAt : new Date();
      base.setMonth(base.getMonth() + Number(addMonths));
      company.planExpiresAt = base;
    }

    await company.save();
    await company.populate('plan', 'name price maxUsers');

    // Se desativou a empresa, encerra todas as sessões
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
// GET /api/admin/plans — Listar planos
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
// PUT /api/admin/plans/:id — Editar plano
// ─────────────────────────────────────────────
const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { price, features } = req.body;

    const plan = await Plan.findById(id);
    if (!plan) return sendError(res, 'Plano não encontrado', 404);

    if (price) plan.price = price;
    if (features) plan.features = features;
    await plan.save();

    return sendSuccess(res, { plan }, 'Plano atualizado com sucesso');
  } catch (error) {
    return sendError(res, 'Erro ao atualizar plano', 500);
  }
};

// ─────────────────────────────────────────────
// GET /api/admin/companies/:id/users — Listar usuários da empresa
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
    await user.save(); // o pre('save') do modelo faz o hash automaticamente

    // Encerra todas as sessões ativas do usuário para forçar novo login
    await Session.updateMany({ user: userId }, { isActive: false });

    return sendSuccess(res, {}, 'Senha redefinida com sucesso');
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    return sendError(res, 'Erro ao redefinir senha', 500);
  }
};

module.exports = { getStats, getCompanies, createCompany, updateCompany, getPlans, updatePlan, getCompanyUsers, resetUserPassword };
