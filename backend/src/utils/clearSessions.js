// Limpa todas as sessões ativas do banco
// Uso: node src/utils/clearSessions.js

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Session = require('../models/Session');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    const result = await Session.updateMany({}, { isActive: false });
    console.log(`✅ ${result.modifiedCount} sessão(ões) encerrada(s).`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
};

run();
