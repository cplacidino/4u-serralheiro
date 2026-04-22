const mongoose = require('mongoose');

// Categorias padrão para serralherias
const CATEGORIES = [
  'Calha', 'Portão', 'Grade', 'Janela', 'Porta', 'Rufo',
  'Estrutura Metálica', 'Esquadria', 'Cobertura', 'Serviço', 'Outros',
];

const UNITS = ['un', 'm', 'm²', 'm³', 'kg', 'par', 'conjunto', 'hora'];

const productSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: [true, 'Nome é obrigatório'], trim: true },
    description: { type: String, trim: true },
    category: { type: String, enum: CATEGORIES, required: true },
    unit: { type: String, enum: UNITS, default: 'un' },
    // Preço de venda
    price: { type: Number, required: true, min: 0 },
    // Custo de produção/compra (para margem de lucro)
    cost: { type: Number, default: 0, min: 0 },
    // Estoque atual
    stock: { type: Number, default: 0 },
    // Estoque mínimo para alertas
    minStock: { type: Number, default: 0 },
    imageUrl:  { type: String, default: null },
    imagePublicId: { type: String, default: null }, // ID no Cloudinary para poder excluir
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ company: 1, category: 1 });
productSchema.index({ company: 1, name: 'text' });

// Exporta as constantes para usar nos controllers
productSchema.statics.CATEGORIES = CATEGORIES;
productSchema.statics.UNITS = UNITS;

module.exports = mongoose.model('Product', productSchema);
