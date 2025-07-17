import { Router } from "express";
import {
  login,
  register,
  getUserHistory,
  addToHistory,
  socialLogin,
} from "../controllers/user.controller.js";

import { protect } from "../middlewares/auth.js"
import passport from "../config/passport.js";
import { generateToken } from "../utils/generateToken.js";

const router = Router();

router.route("/login").post(login);
router.route("/register").post(register);
router.route("/add_to_activity").post(protect, addToHistory);
router.route("/get_all_activity").get(protect, getUserHistory);
router.route("/social-login").post(socialLogin);
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    // Generate JWT for the authenticated user
    const token = generateToken(req.user);
    // Redirect to frontend with token as a query parameter
    res.redirect(`https://videocall-codealpha.vercel.app/auth/google?token=${token}`);
  }
);

export default router;