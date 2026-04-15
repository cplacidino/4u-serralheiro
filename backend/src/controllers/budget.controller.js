const Budget = require('../models/Budget');
const Client = require('../models/Client');
const Product = require('../models/Product');
const { sendSuccess, sendError } = require('../utils/response');

// ─────────────────────────────────────────────
// GET /api/s/budgets — Listar orçamentos
// ─────────────────────────────────────────────
const getBudgets = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10, dateFrom, dateTo } = req.query;
    const company = req.user.company;

    const filter = { company };
    if (status) filter.status = status;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Busca por número (ORC-001) ou nome do cliente
    let budgets;
    if (search) {
      // Primeiro busca clientes que correspondem ao nome
      const clients = await Client.find({
        company,
        name: { $regex: search, $options: 'i' },
      }).select('_id');
      const clientIds = clients.map((c) => c._id);

      // Verifica se o search pode ser um número de orçamento
      const num = parseInt(search.replace(/\D/g, ''), 10);
      filter.$or = [
        { client: { $in: clientIds } },
        ...(num ? [{ number: num }] : []),
      ];
    }

    const total = await Budget.countDocuments(filter);
    budgets = await Budget.find(filter)
      .populate('client', 'name phone')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendSuccess(res, {
      budgets,
      total,
      pages: Math.ceil(total / limit),
      currentPage: Number(page),
    });
  } catch (error) {
    console.error('Erro ao listar orçamentos:', error);
    return sendError(res, 'Erro ao listar orçamentos', 500);
  }
};

// ─────────────────────────────────────────────
// GET /api/s/budgets/:id — Buscar orçamento
// ─────────────────────────────────────────────
const getBudget = async (req, res) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, company: req.user.company })
      .populate('company', 'name cnpj email phone address')
      .populate('client', 'name cpfCnpj phone phone2 email address')
      .populate('items.product', 'name unit')
      .populate('createdBy', 'name');

    if (!budget) return sendError(res, 'Orçamento não encontrado', 404);
    return sendSuccess(res, { budget });
  } catch (error) {
    return sendError(res, 'Erro ao buscar orçamento', 500);
  }
};

// ─────────────────────────────────────────────
// POST /api/s/budgets — Criar orçamento
// ─────────────────────────────────────────────
const createBudget = async (req, res) => {
  try {
    const company = req.user.company;
    const { clientId, items, discount = 0, notes, validUntil } = req.body;

    // Verifica se o cliente pertence à empresa
    const client = await Client.findOne({ _id: clientId, company });
    if (!client) return sendError(res, 'Cliente não encontrado', 404);

    // Valida e calcula totais dos itens
    if (!items || items.length === 0) {
      return sendError(res, 'Orçamento deve ter pelo menos um item', 400);
    }

    // Valida que produtos referenciados pertencem à mesma empresa
    const productIds = items.filter(i => i.productId).map(i => i.productId);
    if (productIds.length > 0) {
      const validProducts = await require('../models/Product').countDocuments({
        _id: { $in: productIds }, company,
      });
      if (validProducts !== productIds.length) {
        return sendError(res, 'Um ou mais produtos não pertencem a esta empresa', 400);
      }
    }

    const processedItems = items.map((item) => ({
      product: item.productId || null,
      description: item.description,
      unit: item.unit || 'un',
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      total: Number(item.quantity) * Number(item.unitPrice),
    }));

    const subtotal = processedItems.reduce((sum, i) => sum + i.total, 0);
    const total = Math.max(0, subtotal - Number(discount));

    // Próximo número sequencial para esta empresa
    const last = await Budget.findOne({ company }).sort({ number: -1 }).select('number');
    const number = (last?.number ?? 0) + 1;

    const budget = await Budget.create({
      company,
      client: clientId,
      number,
      items: processedItems,
      subtotal,
      discount: Number(discount),
      total,
      notes,
      validUntil,
      createdBy: req.user.id,
    });

    await budget.populate('client', 'name phone email');

    return sendSuccess(res, { budget }, 'Orçamento criado com sucesso', 201);
  } catch (error) {
    console.error('Erro ao criar orçamento:', error);
    return sendError(res, 'Erro ao criar orçamento', 500);
  }
};

// ─────────────────────────────────────────────
// PUT /api/s/budgets/:id — Editar orçamento
// ─────────────────────────────────────────────
const updateBudget = async (req, res) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, company: req.user.company });
    if (!budget) return sendError(res, 'Orçamento não encontrado', 404);

    const { clientId, items, discount, notes, validUntil, status } = req.body;

    // Só permite editar itens se ainda for rascunho
    if (items && budget.status !== 'rascunho') {
      return sendError(res, 'Só é possível editar itens de orçamentos em rascunho', 400);
    }

    if (clientId) {
      const client = await Client.findOne({ _id: clientId, company: req.user.company });
      if (!client) return sendError(res, 'Cliente não encontrado', 404);
      budget.client = clientId;
    }

    if (items) {
      budget.items = items.map((item) => ({
        product: item.productId || null,
        description: item.description,
        unit: item.unit || 'un',
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        total: Number(item.quantity) * Number(item.unitPrice),
      }));
      budget.subtotal = budget.items.reduce((sum, i) => sum + i.total, 0);
      budget.discount = discount !== undefined ? Number(discount) : budget.discount;
      budget.total = Math.max(0, budget.subtotal - budget.discount);
    } else if (discount !== undefined) {
      budget.discount = Number(discount);
      budget.total = Math.max(0, budget.subtotal - budget.discount);
    }

    if (notes !== undefined) budget.notes = notes;
    if (validUntil !== undefined) budget.validUntil = validUntil;

    // Ao aprovar: desconta estoque dos produtos referenciados (apenas uma vez)
    if (status) budget.status = status;
    if (status === 'aprovado' && !budget.stockDeducted) {
      const productItems = budget.items.filter(i => i.product);
      for (const item of productItems) {
        await Product.findOneAndUpdate(
          { _id: item.product, company: req.user.company, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } }
        );
      }
      budget.stockDeducted = true;
    }

    await budget.save();
    await budget.populate('client', 'name phone email');

    return sendSuccess(res, { budget }, 'Orçamento atualizado com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar orçamento:', error);
    return sendError(res, 'Erro ao atualizar orçamento', 500);
  }
};

// ─────────────────────────────────────────────
// DELETE /api/s/budgets/:id — Excluir orçamento
// ─────────────────────────────────────────────
const deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, company: req.user.company });
    if (!budget) return sendError(res, 'Orçamento não encontrado', 404);

    if (budget.status !== 'rascunho') {
      return sendError(res, 'Só é possível excluir orçamentos em rascunho', 400);
    }

    await budget.deleteOne();
    return sendSuccess(res, {}, 'Orçamento excluído com sucesso');
  } catch (error) {
    return sendError(res, 'Erro ao excluir orçamento', 500);
  }
};

// ─────────────────────────────────────────────
// POST /api/s/budgets/:id/duplicate — Duplicar
// ─────────────────────────────────────────────
const duplicateBudget = async (req, res) => {
  try {
    const original = await Budget.findOne({ _id: req.params.id, company: req.user.company });
    if (!original) return sendError(res, 'Orçamento não encontrado', 404);

    const last = await Budget.findOne({ company: req.user.company }).sort({ number: -1 }).select('number');
    const number = (last?.number ?? 0) + 1;

    const copy = await Budget.create({
      company:    original.company,
      client:     original.client,
      number,
      items:      original.items,
      subtotal:   original.subtotal,
      discount:   original.discount,
      total:      original.total,
      notes:      original.notes,
      validUntil: null,
      status:     'rascunho',
      createdBy:  req.user.id,
    });

    await copy.populate('client', 'name phone email');
    return sendSuccess(res, { budget: copy }, 'Orçamento duplicado com sucesso', 201);
  } catch (error) {
    console.error('Erro ao duplicar orçamento:', error);
    return sendError(res, 'Erro ao duplicar orçamento', 500);
  }
};

module.exports = { getBudgets, getBudget, createBudget, updateBudget, deleteBudget, duplicateBudget };
