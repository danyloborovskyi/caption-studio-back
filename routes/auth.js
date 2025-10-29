/**
 * Authentication Routes
 * Uses AuthController for all operations
 */

const express = require("express");
const AuthController = require("../controllers/AuthController");
const router = express.Router();

// POST /api/auth/signup - Register a new user
router.post("/signup", AuthController.signup);

// POST /api/auth/login - Login with email and password
router.post("/login", AuthController.login);

// POST /api/auth/logout - Logout current user
router.post("/logout", AuthController.logout);

// POST /api/auth/refresh - Refresh access token
router.post("/refresh", AuthController.refresh);

// POST /api/auth/verify - Verify current token
router.post("/verify", AuthController.verify);

module.exports = router;
