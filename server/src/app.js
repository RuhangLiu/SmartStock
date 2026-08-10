const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const productRoutes = require('./routes/productRoutes');
const saleRoutes = require('./routes/saleRoutes');
const authRoutes = require('./routes/authRoutes');
const operationsRoutes = require('./routes/operationsRoutes');
const databaseRoutes = require('./routes/databaseRoutes');
const { requireAuth } = require('./middleware/auth');
const { uploadDir } = require('./middleware/productImageUpload');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads/products', express.static(uploadDir, {
  fallthrough: false,
  immutable: true,
  maxAge: '30d'
}));

app.use('/api/auth', authRoutes);
app.use('/api/products', requireAuth, productRoutes);
app.use('/api/sales', requireAuth, saleRoutes);
app.use('/api/database', requireAuth, databaseRoutes);
app.use('/api', requireAuth, operationsRoutes);

const clientDist = path.join(__dirname, '../../client/dist');
const dashboardFile = fs.existsSync(path.join(clientDist, 'index.html'))
  ? path.join(clientDist, 'index.html')
  : path.join(__dirname, '../../index.html');

app.get('/', (req, res) => {
  res.sendFile(dashboardFile);
});

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(dashboardFile));
}

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = Number(err.status || err.statusCode) || 500;
  res.status(status).json({ success: false, message: status < 500 ? err.message : 'Server error' });
});

module.exports = app;
