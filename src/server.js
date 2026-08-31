// src/server.js
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsing JSON
app.use(express.json());

// Rota de health check
app.get('/health', (req, res) => {

  res.status(200).json({
    status: 'OK',
    message: 'API do Gerador de Provas funcionando!',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
  
});

// Rota básica para usuários (professores)
app.get('/users', (req, res) => {
  // Mock data - simula dados que viriam do banco
  const usuarios = [
    {
      id: 1,
      nome: 'Prof. Maria Silva',
      email: 'maria@escola.com',
      papel: 'PROFESSOR',
      dataCreacao: '2024-01-15T10:00:00Z',
    },
    {
      id: 2,
      nome: 'Admin João',
      email: 'joao@escola.com',
      papel: 'ADMIN',
      dataCreacao: '2024-01-10T08:30:00Z',
    },
  ];

  res.status(200).json({
    success: true,
    data: usuarios,
    total: usuarios.length,
  });
});

// Middleware de tratamento de rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota ${req.method} ${req.originalUrl} não encontrada`,
  });
});

// Inicializar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`👥 Usuários: http://localhost:${PORT}/users`);
});