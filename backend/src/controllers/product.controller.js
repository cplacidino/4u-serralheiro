const Product = require('../models/Product');
const { sendSuccess, sendError } = require('../utils/response');

const getProducts = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 15 } = req.query;
    const filter = { company: req.user.company, isActive: true };

    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
    if (category) filter.category = category;

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort({ category: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendSuccess(res, {
      products, total,
      pages: Math.ceil(total / limit),
      currentPage: Number(page),
      categories: Product.schema.statics.CATEGORIES,
      units: Product.schema.statics.UNITS,
    });
  } catch {
    return sendError(res, 'Erro ao listar produtos', 500);
  }
};

const getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, company: req.user.company });
    if (!product) return sendError(res, 'Produto não encontrado', 404);
    return sendSuccess(res, { product });
  } catch {
    return sendError(res, 'Erro ao buscar produto', 500);
  }
};

const createProduct = async (req, res) => {
  try {
    const product = await Product.create({ ...req.body, company: req.user.company });
    return sendSuccess(res, { product }, 'Produto cadastrado com sucesso', 201);
  } catch (error) {
    return sendError(res, error.message || 'Erro ao cadastrar produto', 400);
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) return sendError(res, 'Produto não encontrado', 404);
    return sendSuccess(res, { product }, 'Produto atualizado com sucesso');
  } catch (error) {
    return sendError(res, error.message || 'Erro ao atualizar produto', 400);
  }
};

const deleteProduct = async (req, res) => {
  try {
    await Product.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      { isActive: false }
    );
    return sendSuccess(res, {}, 'Produto desativado com sucesso');
  } catch {
    return sendError(res, 'Erro ao desativar produto', 500);
  }
};

const getCategories = async (req, res) => {
  return sendSuccess(res, {
    categories: Product.schema.statics.CATEGORIES,
    units: Product.schema.statics.UNITS,
  });
};

// ─────────────────────────────────────────────
// POST /api/s/products/:id/stock — Ajustar estoque
// body: { delta: number, reason?: string }
// delta positivo = entrada, negativo = saída
// ─────────────────────────────────────────────
const adjustStock = async (req, res) => {
  try {
    const { delta, reason } = req.body;
    if (delta === undefined || isNaN(Number(delta))) {
      return sendError(res, 'Quantidade inválida', 400);
    }

    const product = await Product.findOne({ _id: req.params.id, company: req.user.company });
    if (!product) return sendError(res, 'Produto não encontrado', 404);

    const newStock = product.stock + Number(delta);
    if (newStock < 0) return sendError(res, 'Estoque não pode ficar negativo', 400);

    product.stock = newStock;
    await product.save();

    return sendSuccess(res, { product }, `Estoque atualizado para ${newStock} ${product.unit}`);
  } catch (error) {
    return sendError(res, 'Erro ao ajustar estoque', 500);
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, getCategories, adjustStock };
