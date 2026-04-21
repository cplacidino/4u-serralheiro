const mongoose = require('mongoose');
const Client = require('../models/Client');
const Product = require('../models/Product');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const OrdemServico = require('../models/OrdemServico');
const Agendamento = require('../models/Agendamento');
const SalePayment = require('../models/SalePayment');
const { sendSuccess, sendError } = require('../utils/response');

const getDashboard = async (req, res) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user.company);
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

    // ── Afazeres do dia ──────────────────────────────────────────────────
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999);
    const companyStr = req.user.company; // string — find() faz cast automaticamente

    const [
      osDueToday,
      agendamentosHoje,
      fiadosVencendoHoje,
      despesasVencendoHoje,
      chequesVencendoHoje,
    ] = await Promise.all([
      // OS com prazo hoje ou atrasadas (não concluídas)
      OrdemServico.find({
        company: companyStr,
        status: { $nin: ['concluido', 'cancelado'] },
        dueDate: { $lte: todayEnd },
      }).populate('client', 'name').select('number title dueDate status client').limit(20),

      // Agendamentos do dia
      Agendamento.find({
        company: companyStr,
        date: { $gte: todayStart, $lte: todayEnd },
        status: { $ne: 'concluido' },
      }).select('title date type status').limit(20),

      // Fiados vencendo hoje ou vencidos
      SalePayment.find({
        company: companyStr,
        status: 'fiado_pendente',
        dueDate: { $lte: todayEnd },
      }).populate('client', 'name').populate('budget', 'number').select('amount dueDate client budget').limit(20),

      // Despesas a pagar vencendo hoje ou vencidas
      Transaction.find({
        company: companyStr,
        type: 'despesa',
        isPaid: false,
        dueDate: { $lte: todayEnd },
      }).select('description amount dueDate category').limit(20),

      // Cheques vencendo hoje ou vencidos
      SalePayment.find({
        company: companyStr,
        status: 'cheque_pendente',
        dueDate: { $lte: todayEnd },
      }).populate('client', 'name').populate('budget', 'number').select('amount dueDate client budget chequeNumero chequeBanco').limit(20),
    ]);

    const afazeres = {
      osDueToday,
      agendamentosHoje,
      fiadosVencendoHoje,
      despesasVencendoHoje,
      chequesVencendoHoje,
      totalAfazeres: osDueToday.length + agendamentosHoje.length + fiadosVencendoHoje.length + despesasVencendoHoje.length + chequesVencendoHoje.length,
    };

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
      afazeres,
    });
  } catch (error) {
    console.error('Erro dashboard:', error);
    return sendError(res, 'Erro ao carregar dashboard', 500);
  }
};

module.exports = { getDashboard };
