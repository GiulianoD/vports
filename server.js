const express = require('express');
const { Pool, Client } = require('pg');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Servir arquivos estáticos da pasta form
app.use(express.static(path.join(__dirname))); // Serve a raiz do projeto
app.use('/form', express.static(path.join(__dirname, 'form'))); // Serve a pasta form

// Configuração do PostgreSQL
const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  password: 'EvlDB*2019',
  port: 5432,
};

let pool;

// Inicialização do banco de dados
async function initializeDatabase() {
  let tempClient;
  try {
    console.log('Iniciando inicialização do banco de dados...');
    
    // Primeiro, conectar ao postgres para criar o banco vports se necessário
    tempClient = new Client({
      ...dbConfig,
      database: 'postgres'
    });
    
    await tempClient.connect();
    console.log('Conectado ao PostgreSQL para verificação do banco vports');

    // Verificar se o banco vports existe
    const dbExists = await tempClient.query(`
      SELECT 1 FROM pg_database WHERE datname = 'vports'
    `);

    if (dbExists.rows.length === 0) {
      console.log('Criando banco de dados vports...');
      await tempClient.query('CREATE DATABASE vports');
      console.log('✅ Banco vports criado com sucesso!');
    } else {
      console.log('✅ Banco vports já existe.');
    }

  } catch (error) {
    console.error('❌ Erro na verificação/criação do banco:', error.message);
    throw error;
  } finally {
    // Fechar conexão temporária
    if (tempClient) {
      await tempClient.end();
    }
  }

  // Agora criar o pool de conexões para o banco vports
  try {
    pool = new Pool({
      ...dbConfig,
      database: 'vports',
      max: 20, // máximo de clientes no pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Testar a conexão com o pool
    const testClient = await pool.connect();
    console.log('✅ Conectado ao banco vports via pool');
    testClient.release();

  } catch (error) {
    console.error('❌ Erro ao conectar ao banco vports:', error.message);
    throw error;
  }
}

// Criar tabela no PostgreSQL COM OS CAMPOS DE STATUS
async function createTable() {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS embarcacoes (
        id SERIAL PRIMARY KEY,
        nome_embarcacao VARCHAR(255) NOT NULL,
        rgp VARCHAR(20) NOT NULL,
        tipo_casco VARCHAR(100) NOT NULL,
        arqueacao_bruta DECIMAL(10,2) NOT NULL,
        tipo_propulsao VARCHAR(100) NOT NULL,
        porto_base VARCHAR(255) NOT NULL,
        uf VARCHAR(2) NOT NULL,
        municipio VARCHAR(255) NOT NULL,
        responsavel VARCHAR(255) NOT NULL,
        contato TEXT,
        observacoes TEXT,
        anexos JSONB,
        status VARCHAR(20) DEFAULT 'pending',
        review_note TEXT,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(query);
    console.log('✅ Tabela embarcacoes criada/verificada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
    throw error;
  }
}

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Rota para salvar os dados do formulário
app.post('/api/embarcacoes', upload.array('anexos', 10), async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    
    const {
      nomeEmbarcacao,
      rgp,
      tipoCasco,
      arqueacaoBruta,
      tipoPropulsao,
      portoBase,
      uf,
      municipio,
      responsavel,
      contato,
      observacoes
    } = req.body;

    // Processar anexos
    let anexosData = [];
    if (req.files && req.files.length > 0) {
      anexosData = req.files.map(file => ({
        nome: file.originalname,
        caminho: file.path,
        tamanho: file.size,
        tipo: file.mimetype
      }));
    }

    const query = `
      INSERT INTO embarcacoes (
        nome_embarcacao, rgp, tipo_casco, 
        arqueacao_bruta, tipo_propulsao, 
        porto_base, uf, municipio, responsavel, contato, 
        observacoes, anexos, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      nomeEmbarcacao,
      rgp,
      tipoCasco,
      parseFloat(arqueacaoBruta),
      tipoPropulsao,
      portoBase,
      uf,
      municipio,
      responsavel,
      contato || null,
      observacoes || null,
      anexosData.length > 0 ? JSON.stringify(anexosData) : null,
      'pending' // Status inicial
    ];

    const result = await client.query(query, values);
    
    res.json({
      success: true,
      message: 'Embarcação cadastrada com sucesso no banco vports!',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Erro ao salvar embarcação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Rota para listar todas as embarcações
app.get('/api/embarcacoes', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT * FROM embarcacoes ORDER BY created_at DESC');
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Erro ao buscar embarcações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Rota para buscar embarcação por ID
app.get('/api/embarcacoes/:id', async (req, res) => {
  let client;
  try {
    const { id } = req.params;
    client = await pool.connect();
    const result = await client.query('SELECT * FROM embarcacoes WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Embarcação não encontrada'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Erro ao buscar embarcação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Rota para atualizar status da embarcação
app.patch('/api/embarcacoes/:id/status', async (req, res) => {
  let client;
  try {
    const { id } = req.params;
    const { status, review_note } = req.body;
    
    client = await pool.connect();
    
    const query = `
      UPDATE embarcacoes 
      SET status = $1, review_note = $2, reviewed_at = CURRENT_TIMESTAMP 
      WHERE id = $3 
      RETURNING *
    `;
    
    const result = await client.query(query, [status, review_note, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Embarcação não encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Status atualizado com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Rota placeholder para desembarques
app.get('/api/desembarques', async (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Funcionalidade de desembarques em desenvolvimento'
  });
});

// Rota de health check para verificar conexão com o banco
app.get('/api/health', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    
    res.json({
      success: true,
      message: 'Conexão com o banco vports estabelecida com sucesso',
      database: 'vports',
      status: 'healthy'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro na conexão com o banco',
      error: error.message
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Rota para informações do banco
app.get('/api/database-info', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const dbInfo = await client.query('SELECT current_database(), version()');
    const tableCount = await client.query('SELECT COUNT(*) FROM embarcacoes');
    
    res.json({
      success: true,
      database: dbInfo.rows[0].current_database,
      version: dbInfo.rows[0].version,
      total_embarcacoes: tableCount.rows[0].count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter informações do banco',
      error: error.message
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Middleware de erro global
app.use((error, req, res, next) => {
  console.error('❌ Erro global:', error);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: error.message
  });
});

// Inicialização do servidor
async function startServer() {
  try {
    console.log('🚀 Iniciando servidor...');
    await initializeDatabase();
    await createTable();
    
    app.listen(port, () => {
      console.log(`✅ Servidor rodando na porta ${port}`);
      console.log(`📊 Banco de dados: vports`);
      console.log(`🔍 Health check: http://localhost:${port}/api/health`);
      console.log(`📋 Info do banco: http://localhost:${port}/api/database-info`);
      console.log(`⛵ Formulário: http://localhost:${port}/form/embarcacao`);
      console.log(`👨‍💼 Admin: http://localhost:${port}/admin.html`);
    });
  } catch (error) {
    console.error('❌ Erro fatal ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Desligando servidor...');
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Desligando servidor...');
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});

startServer();