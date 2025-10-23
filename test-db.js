const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'vports',
    password: 'EvlDB*2019',
    port: 5432,
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco vports com sucesso!');
    
    const result = await client.query('SELECT current_database()');
    console.log('Banco atual:', result.rows[0].current_database);
    
    await client.end();
  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message);
  }
}

testConnection();