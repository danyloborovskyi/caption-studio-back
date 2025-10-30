const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// CORS Configuration - Environment-aware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.FRONTEND_URL,
      "https://caption-cursor-studio.vercel.app",
      // Allow localhost for development/testing even in production
      "http://localhost:3000",
      "http://localhost:3001",
    ];

    const filtered = allowedOrigins.filter(Boolean);

    if (filtered.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

// Apply CORS
app.use(cors(corsOptions));

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per windowMs
  message:
    "Too many authentication attempts, please try again later. Please wait 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: "Too many requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Apply rate limiting to all API routes
app.use("/api/", apiLimiter);

// Import and use auth routes with stricter rate limiting
const authRoutes = require("./routes/auth");
app.use("/api/auth", authLimiter, authRoutes);

// Import and use user routes
const userRoutes = require("./routes/user");
app.use("/api/user", userRoutes);

// Import and use upload routes
const uploadRoutes = require("./routes/upload");
app.use("/api/upload", uploadRoutes);

// Import and use files routes
const filesRoutes = require("./routes/files");
app.use("/api/files", filesRoutes);

// Basic health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Caption Studio Backend",
    version: "1.0.0",
    status: "running",
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Centralized error handling middleware
const { errorHandler } = require("./utils/errorHandler");
app.use(errorHandler);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
