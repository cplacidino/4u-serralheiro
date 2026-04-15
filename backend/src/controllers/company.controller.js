const Company = require('../models/Company');
const { sendSuccess, sendError } = require('../utils/response');

// ─────────────────────────────────────────────
// GET /api/s/company — Dados da empresa do usuário logado
// ─────────────────────────────────────────────
const getMyCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.user.company)
      .populate('plan', 'name price maxUsers features');
    if (!company) return sendError(res, 'Empresa não encontrada', 404);
    return sendSuccess(res, { company });
  } catch (error) {
    return sendError(res, 'Erro ao buscar empresa', 500);
  }
};

// ─────────────────────────────────────────────
// PUT /api/s/company — Atualizar dados da empresa (somente owner)
// ─────────────────────────────────────────────
const updateMyCompany = async (req, res) => {
  try {
    const { name, phone, cnpj, address } = req.body;
    const company = await Company.findById(req.user.company);
    if (!company) return sendError(res, 'Empresa não encontrada', 404);

    if (name) company.name = name.trim();
    if (phone !== undefined) company.phone = phone || null;
    if (cnpj !== undefined) company.cnpj = cnpj || null;
    if (address !== undefined) company.address = address;

    await company.save();
    await company.populate('plan', 'name price maxUsers features');

    return sendSuccess(res, { company }, 'Empresa atualizada com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    return sendError(res, 'Erro ao atualizar empresa', 500);
  }
};

module.exports = { getMyCompany, updateMyCompany };
