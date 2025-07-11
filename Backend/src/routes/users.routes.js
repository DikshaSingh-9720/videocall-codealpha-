import { Router } from "express";
import {
  login,
  register,
  getUserHistory,
  addToHistory,
  socialLogin,
} from "../controllers/user.controller.js";

import { protect } from "../middlewares/auth.js"

const router = Router();

router.route("/login").post(login);
router.route("/register").post(register);
router.route("/add_to_activity").post(protect, addToHistory);
router.route("/get_all_activity").get(protect, getUserHistory);
router.route("/social-login").post(socialLogin);

export default router;