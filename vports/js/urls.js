/**
 * Configuração de URLs e endpoints da aplicação
 * Compatível com Node.js e Browser
 */

const accessToken = 'accessTokenVports'

const SERVER_CONFIG = {
  IP: 'localhost',
  PORT: 2002
};

// const BASE_URL = `http://${SERVER_CONFIG.IP}:${SERVER_CONFIG.PORT}`;
const BASE_URL = 'https://oceanstream-8b3329b99e40.herokuapp.com/vports'; // heroku
// const API_PREFIX = '/api';
const API_PREFIX = '';
const AUTH_PREFIX = `${API_PREFIX}`;
const EMBARCACOES_PREFIX = `${API_PREFIX}/embarcacoes`;
const DESEMBARQUES_PREFIX = `${API_PREFIX}/desembarques`;
const PESCADORES_PREFIX = `${API_PREFIX}/desembarques`;
const USUARIOS_PREFIX = `${API_PREFIX}/usuarios`;
const SYSTEM_PREFIX = `${API_PREFIX}/system`;

// Endpoints de autenticação
const AUTH_ENDPOINTS = {
  LOGIN: `${AUTH_PREFIX}/login`,
  VERIFY: `${AUTH_PREFIX}/verify`
};

// Endpoints de embarcações
const EMBARCACOES_ENDPOINTS = {
  BASE: EMBARCACOES_PREFIX,
  BY_ID: `${EMBARCACOES_PREFIX}/:id`,
  STATUS: `${EMBARCACOES_PREFIX}/:id/status`,
  ATIVAS: `${API_PREFIX}/embarcacoes-ativas`
};

// Endpoints de desembarques
const DESEMBARQUES_ENDPOINTS = {
  BASE: DESEMBARQUES_PREFIX,
  BY_ID: `${DESEMBARQUES_PREFIX}/:id`,
  STATUS: `${DESEMBARQUES_PREFIX}/:id/status`
};

// Endpoints de pescadores
const PESCADORES_ENDPOINTS = {
  BASE: EMBARCACOES_PREFIX,
  BY_ID: `${PESCADORES_PREFIX}/:id`
};

// Endpoints de usuários
const USUARIOS_ENDPOINTS = {
  BASE: USUARIOS_PREFIX
};

// Endpoints do sistema
const SYSTEM_ENDPOINTS = {
  HEALTH: `${SYSTEM_PREFIX}/health`,
  DATABASE_INFO: `${SYSTEM_PREFIX}/database-info`
};

// URLs completas
const FULL_URLS = {
  AUTH: {
    LOGIN: `${BASE_URL}${AUTH_ENDPOINTS.LOGIN}`,
    VERIFY: `${BASE_URL}${AUTH_ENDPOINTS.VERIFY}`
  },
  EMBARCACOES: {
    BASE: `${BASE_URL}${EMBARCACOES_ENDPOINTS.BASE}`,
    ATIVAS: `${BASE_URL}${EMBARCACOES_ENDPOINTS.ATIVAS}`
  },
  DESEMBARQUES: {
    BASE: `${BASE_URL}${DESEMBARQUES_ENDPOINTS.BASE}`
  },
  SYSTEM: {
    HEALTH: `${BASE_URL}${SYSTEM_ENDPOINTS.HEALTH}`,
    DATABASE_INFO: `${BASE_URL}${SYSTEM_ENDPOINTS.DATABASE_INFO}`
  }
};

// Configuração para exportação
const URLS_CONFIG = {
  BASE_URL,
  FULL_URLS,
  AUTH_ENDPOINTS: FULL_URLS.AUTH,
  EMBARCACOES_ENDPOINTS: FULL_URLS.EMBARCACOES,
  DESEMBARQUES_ENDPOINTS: FULL_URLS.DESEMBARQUES
};

// Detectar ambiente e exportar apropriadamente
if (typeof window !== 'undefined') {
  // Ambiente Browser
  window.URLS_CONFIG = URLS_CONFIG;
} else {
  // Ambiente Node.js
  module.exports = {
    SERVER_CONFIG,
    BASE_URL,
    ENDPOINTS: {
      AUTH: AUTH_ENDPOINTS,
      EMBARCACOES: EMBARCACOES_ENDPOINTS,
      DESEMBARQUES: DESEMBARQUES_ENDPOINTS,
      PESCADORES: PESCADORES_ENDPOINTS,
      USUARIOS: USUARIOS_ENDPOINTS,
      SYSTEM: SYSTEM_ENDPOINTS
    },
    FULL_URLS
  };
}