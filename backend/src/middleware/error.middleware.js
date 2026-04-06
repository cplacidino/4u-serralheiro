// Middleware global para capturar erros não tratados
const errorHandler = (err, req, res, next) => {
  console.error('Erro não tratado:', err);

  // Erro de ID inválido do MongoDB
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'ID inválido' });
  }

  // Erro de campo único duplicado (ex: e-mail já cadastrado)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `Este ${field} já está cadastrado no sistema.`,
    });
  }

  // Erro de validação do Mongoose
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join('. ') });
  }

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Erro interno no servidor',
  });
};

module.exports = errorHandler;
