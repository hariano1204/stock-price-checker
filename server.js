require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const axios = require('axios');

const app = express();

// Confianza en proxy (Replit/Heroku/Render)
app.set('trust proxy', true);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helmet CSP requerido por FreeCodeCamp
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,   // 🚨 Desactiva defaults extra de Helmet
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
      },
    },
  })
);

// Ruta raíz (para que FCC vea la CSP aquí también)
app.get("/", (req, res) => {
  res.send("Stock Price Checker API activo 🚀");
});

// Conexión a MongoDB
const MONGODB_URI = process.env.DB;
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> console.log('✅ MongoDB conectado'))
  .catch(err => console.error('❌ Error de MongoDB:', err.message));

// Esquema de acciones
const stockSchema = new mongoose.Schema({
  symbol: { type: String, required: true, uppercase: true, unique: true },
  ips: { type: [String], default: [] }
});
const Stock = mongoose.model('Stock', stockSchema);

// Obtener precio de acciones
async function getStockPrice(symbol) {
  const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`;
  const res = await axios.get(url);
  return { symbol: res.data.symbol, price: Number(res.data.latestPrice) };
}

// Endpoint principal
app.get('/api/stock-prices', async (req, res) => {
  try {
    let { stock, like } = req.query;
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const likeFlag = (like === 'true' || like === '1');

    if (!stock) return res.status(400).json({ error: 'Stock requerido' });

    if (Array.isArray(stock)) {
      stock = stock.map(s => s.toUpperCase()).slice(0, 2);
      const prices = await Promise.all(stock.map(s => getStockPrice(s)));

      const docs = await Promise.all(prices.map(async p => {
        let d = await Stock.findOne({ symbol: p.symbol });
        if (!d) d = new Stock({ symbol: p.symbol });
        if (likeFlag && ip && !d.ips.includes(ip)) {
          d.ips.push(ip);
          await d.save();
        }
        return { symbol: p.symbol, price: p.price, likes: d.ips.length };
      }));

      const relLikes = [
        { stock: docs[0].symbol, price: docs[0].price, rel_likes: docs[0].likes - docs[1].likes },
        { stock: docs[1].symbol, price: docs[1].price, rel_likes: docs[1].likes - docs[0].likes }
      ];

      return res.json({ stockData: relLikes });
    } else {
      stock = stock.toUpperCase();
      const { symbol, price } = await getStockPrice(stock);

      let doc = await Stock.findOne({ symbol });
      if (!doc) doc = new Stock({ symbol });
      if (likeFlag && ip && !doc.ips.includes(ip)) {
        doc.ips.push(ip);
        await doc.save();
      }

      return res.json({ stockData: { stock: symbol, price, likes: doc.ips.length } });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Arranque servidor
const PORT = process.env.PO
