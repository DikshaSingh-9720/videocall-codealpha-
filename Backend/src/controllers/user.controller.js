import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { Meeting } from "../models/meet.model.js";
import { generateToken } from "../utils/generateToken.js";
import passport from 'passport';
import axios from 'axios';

const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "please enter credentials" });
    }

    try {
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
        }

        let isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = generateToken(user);
        res.status(200).json({ message: "Login successful", token });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: `Error: ${error.message}` });
    }
}

const register = async (req, res) => {
    const { name, username, password } = req.body;

    try {
        const userexist = await User.findOne({ username });
        if (userexist) {
            return res.status(409).json({ message: "User already exist" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            username,
            password: hashedPassword,
        });

        await newUser.save();

        const token = generateToken(newUser);
        res.status(201).json({ message: "User registered", token });
    } catch (e) {
        res.status(500).json({ message: `Error: ${e.message}` });
    }
};

const getUserHistory = async (req, res) => {
    try {
        const user = req.user;

        const meetings = await Meeting.find({ user_id: user.username });
        res.json(meetings);
    } catch (error) {
        res.status(500).json({ message: `Something went wrong: ${error.message}` });
    }
}

const addToHistory = async (req, res) => {
    const { meeting_code } = req.body;
    console.log("Meeting Code:", meeting_code);
    console.log("User:", req.user);


    if (!meeting_code || !req.user) {
        return res.status(400).json({ message: "Meeting code is required" });
    }
    try {
        const user = req.user; // comes from JWT middleware

        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: meeting_code,
        });

        await newMeeting.save();

        res.status(httpStatus.CREATED).json({ message: "Add meetings to history" });
    } catch (e) {
        res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

// Social login controller (stub)
const socialLogin = async (req, res) => {
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
        // TODO: Add Facebook and LinkedIn logic
        return res.status(400).json({ message: 'Unsupported provider' });
    } catch (err) {
        console.error('Social login error:', err);
        return res.status(500).json({ message: 'Social login failed', error: err.message });
    }
};


export { login, register, getUserHistory, addToHistory, socialLogin };