const Product = require('../models/Product');
const { cloudinary } = require('../config/cloudinary');
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
    const data = { ...req.body, company: req.user.company };
    if (req.file) {
      data.imageUrl = req.file.path;
      data.imagePublicId = req.file.filename;
    }
    const product = await Product.create(data);
    return sendSuccess(res, { product }, 'Produto cadastrado com sucesso', 201);
  } catch (error) {
    return sendError(res, error.message || 'Erro ao cadastrar produto', 400);
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, company: req.user.company });
    if (!product) return sendError(res, 'Produto não encontrado', 404);

    // Se enviou nova imagem, exclui a antiga do Cloudinary
    if (req.file) {
      if (product.imagePublicId) {
        await cloudinary.uploader.destroy(product.imagePublicId).catch(() => {});
      }
      req.body.imageUrl = req.file.path;
      req.body.imagePublicId = req.file.filename;
    }

    Object.assign(product, req.body);
    await product.save();

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

// DELETE /api/s/products/:id/image — Remove apenas a foto
const deleteProductImage = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, company: req.user.company });
    if (!product) return sendError(res, 'Produto não encontrado', 404);

    if (product.imagePublicId) {
      await cloudinary.uploader.destroy(product.imagePublicId).catch(() => {});
    }
    product.imageUrl = null;
    product.imagePublicId = null;
    await product.save();

    return sendSuccess(res, { product }, 'Foto removida com sucesso');
  } catch {
    return sendError(res, 'Erro ao remover foto', 500);
  }
};

const getCategories = async (req, res) => {
  return sendSuccess(res, {
    categories: Product.schema.statics.CATEGORIES,
    units: Product.schema.statics.UNITS,
  });
};

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
  } catch {
    return sendError(res, 'Erro ao ajustar estoque', 500);
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, deleteProductImage, getCategories, adjustStock };
