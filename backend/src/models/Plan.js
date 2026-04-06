const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ['Básico', 'Premium'],
    },
    price: {
      type: Number,
      required: true,
    },
    // -1 significa ilimitado
    maxUsers: {
      type: Number,
      required: true,
    },
    // Máximo de sessões simultâneas (-1 = ilimitado)
    maxSessions: {
      type: Number,
      required: true,
    },
    features: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plan', planSchema);
