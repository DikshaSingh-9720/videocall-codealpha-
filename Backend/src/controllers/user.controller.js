import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/generateToken.js";
import axios from 'axios';

export const register = async (req, res) => {
  const { name, username, password } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const userExist = await User.findOne({ username });
  if (userExist) {
    return res.status(409).json({ message: "User already exists" });
  }
  const hashedPassword = await bcrypt.hash(password, 12);
  const newUser = await User.create({ name, username, password: hashedPassword });
  const token = generateToken(newUser);
  res.status(201).json({ message: "User registered", token });
};

export const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const user = await User.findOne({ username });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = generateToken(user);
  res.status(200).json({ message: "Login successful", token });
};

export const socialLogin = async (req, res) => {
  const { provider, token } = req.body;
  try {
    if (provider === 'google') {
      // Verify Google token
      const googleRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
      const { email, name, sub } = googleRes.data;
      if (!email) return res.status(400).json({ message: 'Invalid Google token' });
      // Find or create user
      let user = await User.findOne({ username: email });
      if (!user) {
        user = new User({ name, username: email, password: sub }); // sub is unique Google user ID
        await user.save();
      }
      const jwtToken = generateToken(user);
      return res.status(200).json({ message: 'Login successful', token: jwtToken });
    }
    // TODO: Add other providers if needed
    return res.status(400).json({ message: 'Unsupported provider' });
  } catch (err) {
    return res.status(500).json({ message: 'Social login failed', error: err.message });
  }
};

// Add this function for /add_to_activity
export const addToActivity = async (req, res) => {
  try {
    const { userId, activity } = req.body;
    if (!userId || !activity) {
      return res.status(400).json({ message: 'userId and activity are required' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Assume user has an 'activityHistory' array field
    user.activityHistory = user.activityHistory || [];
    user.activityHistory.push({ activity, date: new Date() });
    await user.save();
    return res.status(200).json({ message: 'Activity added to user history' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to add activity', error: err.message });
  }
};