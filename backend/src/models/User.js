const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Nome é obrigatório'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'E-mail é obrigatório'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Senha é obrigatória'],
      minlength: [8, 'Senha deve ter no mínimo 8 caracteres'],
      // Nunca retorna a senha nas consultas por padrão
      select: false,
    },
    role: {
      type: String,
      enum: ['superadmin', 'owner', 'employee'],
      default: 'employee',
    },
    // Null para superadmin (ele não pertence a nenhuma empresa)
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    // Foto do perfil (URL)
    avatar: {
      type: String,
    },
  },
  { timestamps: true }
);

// Antes de salvar, criptografa a senha se ela foi modificada
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Método para comparar senha digitada com a salva
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
