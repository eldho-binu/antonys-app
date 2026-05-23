const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");

const server = express();

// Middleware
server.use(cors());
server.use(express.json());
server.use(morgan("dev"));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
  })
  .catch((err) => {
    console.log("❌ MongoDB Error:", err);
  });

// Example API Route
server.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API running successfully"
  });
});

// Example API route
server.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "API test successful"
  });
});

// Your routes
// server.use("/api/auth", authenticationRoute);
// server.use("/api/products", productRoutes);

// 404 handler
server.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

// Error handler
server.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

// IMPORTANT FOR VERCEL
module.exports = server;