const express = require("express");
const { githubLogin, githubCallback, logout, getUser } = require("../controllers/auth.controller");
const router = express.Router();

router.get("/github", githubLogin);
router.get("/github/callback", githubCallback);
router.post("/logout", logout);
router.get("/user", getUser);

module.exports = router;
