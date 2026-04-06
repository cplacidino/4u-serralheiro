// Script para atualizar os planos no banco.
// Rode: node src/utils/updatePlans.js

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Plan = require('../models/Plan');

const features = [
  'Orçamentos ilimitados',
  'Cadastro de clientes',
  'Catálogo de produtos e serviços',
  'Ordens de serviço',
  'Controle financeiro',
  'Controle de estoque',
  'Geração de PDF',
  'Relatórios',
  'Acesso pelo celular',
  'Suporte por e-mail',
];

const update = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Conectado ao MongoDB');

  await Plan.findOneAndUpdate(
    { name: 'Básico' },
    { features, maxUsers: 2, maxSessions: 2, price: 89.90 }
  );
  console.log('✅ Plano Básico atualizado');

  await Plan.findOneAndUpdate(
    { name: 'Premium' },
    { features, maxUsers: -1, maxSessions: -1, price: 149.90 }
  );
  console.log('✅ Plano Premium atualizado');

  console.log('\n🎉 Planos atualizados com sucesso!');
  process.exit(0);
};

update().catch(e => { console.error('❌', e.message); process.exit(1); });
