// Script para criar o superadmin e os planos iniciais no banco de dados.
// Rode apenas UMA VEZ: node src/utils/seedAdmin.js

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Plan = require('../models/Plan');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    // Cria os planos
    await Plan.deleteMany({});
    const plans = await Plan.insertMany([
      {
        name: 'Básico',
        price: 89.90,
        maxUsers: 2,
        maxSessions: 2,
        features: [
          'Até 2 usuários',
          'Orçamentos ilimitados',
          'Controle de clientes',
          'Catálogo de produtos',
          'Suporte por e-mail',
        ],
      },
      {
        name: 'Premium',
        price: 149.90,
        maxUsers: -1,
        maxSessions: -1,
        features: [
          'Usuários ilimitados',
          'Orçamentos ilimitados',
          'Controle financeiro completo',
          'Controle de estoque',
          'Relatórios avançados',
          'Suporte prioritário',
        ],
      },
    ]);
    console.log('✅ Planos criados:', plans.map((p) => p.name).join(', '));

    // Cria o superadmin (você!)
    const existingAdmin = await User.findOne({ role: 'superadmin' });
    if (existingAdmin) {
      console.log('ℹ️  Superadmin já existe, pulando criação.');
    } else {
      await User.create({
        name: process.env.ADMIN_NAME || 'Administrador',
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        role: 'superadmin',
      });
      console.log('✅ Superadmin criado:', process.env.ADMIN_EMAIL);
    }

    console.log('\n🎉 Setup inicial concluído!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro no seed:', error.message);
    process.exit(1);
  }
};

seed();
