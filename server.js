const express = require("express");
const helmet = require("helmet");

const app = express();

// Helmet CSP minimalista (como lo pide FCC)
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"]
    }
  })
);

// Ruta raíz
app.get("/", (req, res) => {
  res.send("Stock Price Checker API (modo prueba)");
});

// Endpoint de prueba
app.get("/api/stock-prices", (req, res) => {
  res.json({
    stockData: { stock: "GOOG", price: 123.45, likes: 0 }
  });
});

// Arranque servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
