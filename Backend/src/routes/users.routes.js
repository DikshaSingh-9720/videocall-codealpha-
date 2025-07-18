import { Router } from "express";
import { register, login, socialLogin, addToActivity } from "../controllers/user.controller.js";

const router = Router();
router.post("/register", register);
router.post("/login", login);
router.post("/social-login", socialLogin);
router.post('/add_to_activity', addToActivity)

export default router;