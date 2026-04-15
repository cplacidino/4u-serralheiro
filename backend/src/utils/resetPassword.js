// Script para listar usuários e resetar senha
// Uso: node src/utils/resetPassword.js

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
require('../models/Company'); // precisa ser carregado antes do populate
const User = require('../models/User');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB\n');

    const users = await User.find().populate('company', 'name').select('-password');
    console.log('=== USUÁRIOS CADASTRADOS ===');
    users.forEach((u) => {
      console.log(`- ${u.email} | role: ${u.role} | ativo: ${u.isActive} | empresa: ${u.company?.name ?? 'nenhuma'}`);
    });

    // Reseta a senha do primeiro owner encontrado para "Senha1234"
    const owner = users.find((u) => u.role === 'owner');
    if (owner) {
      const userDoc = await User.findById(owner._id).select('+password');
      userDoc.password = 'Senha1234';
      await userDoc.save(); // o pre-save vai fazer o hash automaticamente
      console.log(`\n✅ Senha do usuário "${owner.email}" resetada para: Senha1234`);
    } else {
      console.log('\n⚠️  Nenhum owner encontrado.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
};

run();
