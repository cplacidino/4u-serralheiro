const Client = require('../models/Client');
const Budget = require('../models/Budget');
const { sendSuccess, sendError } = require('../utils/response');

const getClients = async (req, res) => {
  try {
    const { search, page = 1, limit = 15, active } = req.query;
    const filter = { company: req.user.company };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { cpfCnpj: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (active === 'true') filter.isActive = true;
    if (active === 'false') filter.isActive = false;

    const total = await Client.countDocuments(filter);
    const clients = await Client.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendSuccess(res, { clients, total, pages: Math.ceil(total / limit), currentPage: Number(page) });
  } catch (error) {
    return sendError(res, 'Erro ao listar clientes', 500);
  }
};

const getClient = async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, company: req.user.company });
    if (!client) return sendError(res, 'Cliente não encontrado', 404);
    return sendSuccess(res, { client });
  } catch {
    return sendError(res, 'Erro ao buscar cliente', 500);
  }
};

const createClient = async (req, res) => {
  try {
    const client = await Client.create({ ...req.body, company: req.user.company });
    return sendSuccess(res, { client }, 'Cliente cadastrado com sucesso', 201);
  } catch (error) {
    return sendError(res, error.message || 'Erro ao cadastrar cliente', 400);
  }
};

const updateClient = async (req, res) => {
  try {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      req.body,
      { new: true, runValidators: true }
    );
    if (!client) return sendError(res, 'Cliente não encontrado', 404);
    return sendSuccess(res, { client }, 'Cliente atualizado com sucesso');
  } catch (error) {
    return sendError(res, error.message || 'Erro ao atualizar cliente', 400);
  }
};

const deleteClient = async (req, res) => {
  try {
    // Verifica se tem orçamentos vinculados
    const budgetCount = await Budget.countDocuments({ client: req.params.id, company: req.user.company });
    if (budgetCount > 0) {
      // Não exclui — só desativa
      await Client.findOneAndUpdate({ _id: req.params.id, company: req.user.company }, { isActive: false });
      return sendSuccess(res, {}, 'Cliente desativado (possui orçamentos vinculados)');
    }
    await Client.findOneAndDelete({ _id: req.params.id, company: req.user.company });
    return sendSuccess(res, {}, 'Cliente excluído com sucesso');
  } catch {
    return sendError(res, 'Erro ao excluir cliente', 500);
  }
};

module.exports = { getClients, getClient, createClient, updateClient, deleteClient };
