const express = require("express");
const cors = require("cors");

const server = express();

server.use(cors());
server.use(express.json());

server.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend working successfully"
  });
});

server.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "API route working"
  });
});

module.exports = server;