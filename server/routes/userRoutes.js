const express = require("express");

const {
  signup,
  login,
  logout,
  forgotPassword,
  resetPassword,
} = require("../controllers/authContoller");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/forgotPassword", forgotPassword);
router.patch("/resetPassword/:token", resetPassword);

router.get("/logout", logout);

module.exports = router;
