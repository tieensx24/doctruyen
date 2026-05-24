const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { sequelize } = require('./models');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const mangaRoutes = require('./routes/manga');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', mangaRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Doctruyen API is running!', version: '1.0.0' });
});

const PORT = process.env.PORT || 3000;
const DB_CONNECT_RETRIES = Number(process.env.DB_CONNECT_RETRIES || 30);
const DB_CONNECT_RETRY_DELAY_MS = Number(process.env.DB_CONNECT_RETRY_DELAY_MS || 2000);

const startServer = async () => {
  for (let attempt = 1; attempt <= DB_CONNECT_RETRIES; attempt += 1) {
    try {
      await sequelize.authenticate();
      console.log('✅ Kết nối database thành công');
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
      });
      return;
    } catch (err) {
      console.error(
        `❌ Kết nối database thất bại (${attempt}/${DB_CONNECT_RETRIES}):`,
        err.message
      );

      if (attempt === DB_CONNECT_RETRIES) {
        process.exit(1);
      }

      await new Promise(resolve => setTimeout(resolve, DB_CONNECT_RETRY_DELAY_MS));
    }
  }
};

startServer();
