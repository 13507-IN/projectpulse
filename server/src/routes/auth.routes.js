import express from "express";
import * as authController from "../controllers/auth.controller.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/github", authController.githubLogin);
router.get("/github/callback", authController.githubCallback);
router.post("/exchange", authController.exchangeCode);
router.get("/verify", authenticateToken, authController.verifyToken);
router.post("/session", authController.createSession);
router.post("/logout", authController.logout);
router.get("/user", authController.getUser);
router.get("/debug", authController.authDebug);

export default router;
