const Client = require('../models/Client');
const Product = require('../models/Product');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const { sendSuccess, sendError } = require('../utils/response');

const getDashboard = async (req, res) => {
  try {
    const companyId = req.user.company;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalClients,
      totalProducts,
      totalBudgets,
      budgetsThisMonth,
      approvedBudgets,
      pendingBudgets,
      recentBudgets,
      lowStockProducts,
    ] = await Promise.all([
      Client.countDocuments({ company: companyId, isActive: true }),
      Product.countDocuments({ company: companyId, isActive: true }),
      Budget.countDocuments({ company: companyId }),
      Budget.countDocuments({ company: companyId, createdAt: { $gte: startOfMonth } }),
      Budget.countDocuments({ company: companyId, status: 'aprovado' }),
      Budget.countDocuments({ company: companyId, status: { $in: ['rascunho', 'enviado'] } }),
      Budget.find({ company: companyId })
        .populate('client', 'name')
        .sort({ createdAt: -1 })
        .limit(5),
      Product.find({ company: companyId, isActive: true, $expr: { $lte: ['$stock', '$minStock'] }, minStock: { $gt: 0 } })
        .select('name stock minStock category')
        .limit(5),
    ]);

    // Receita do mês — soma receitas lançadas no módulo financeiro
    const [revenueResult, expenseResult] = await Promise.all([
      Transaction.aggregate([
        { $match: { company: companyId, type: 'receita', isPaid: true, date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { company: companyId, type: 'despesa', isPaid: true, date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);
    const monthRevenue = revenueResult[0]?.total ?? 0;
    const monthExpenses = expenseResult[0]?.total ?? 0;

    return sendSuccess(res, {
      totalClients,
      totalProducts,
      totalBudgets,
      budgetsThisMonth,
      approvedBudgets,
      pendingBudgets,
      monthRevenue,
      monthExpenses,
      monthBalance: monthRevenue - monthExpenses,
      recentBudgets,
      lowStockProducts,
    });
  } catch (error) {
    console.error('Erro dashboard:', error);
    return sendError(res, 'Erro ao carregar dashboard', 500);
  }
};

module.exports = { getDashboard };
