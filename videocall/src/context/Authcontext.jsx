import axios from 'axios';
import httpStatus from 'http-status';
import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

export const Authcontext = createContext({});

const client = axios.create({
    baseURL: "http://localhost:5000/api/v1/users",
    timeout: 10000, // 10 second timeout
    headers: {
        'Content-Type': 'application/json'
    }
});

export const AuthProvider = ({ children }) => {
    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (name, username, password) => {
        try {
            setIsLoading(true);
            const req = await client.post("/register", {
                name, username, password
            });

            if (req.status === httpStatus.CREATED) {
                return req.data.message;
            }
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }

    const handleLogin = async (username, password) => {
        try {
            setIsLoading(true);
            const req = await client.post("/login", {
                username, password
            });

            if (req.status === httpStatus.OK) {
                localStorage.setItem("token", req.data.token);
                setUserData(req.data.user || { username });
                navigate("/dashboard");
            }
        } catch (err) {
            console.error('Login error:', err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }

    const handleSocialLogin = async (provider, token) => {
        try {
            setIsLoading(true);
            const res = await client.post('/social-login', { provider, token });
            if (res.status === httpStatus.OK) {
                localStorage.setItem('token', res.data.token);
                setUserData(res.data.user || {});
                navigate('/dashboard');
            } else {
                throw new Error(res.data.message || 'Social login failed');
            }
        } catch (err) {
            console.error('Social login error:', err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const getHistory = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                throw new Error("No authentication token found");
            }

            const request = await client.get("/get_all_activity", {
                params: { token }
            });
            return request.data;
        } catch (err) {
            console.error('Get history error:', err);
            throw err;
        }
    }

    const addToUserHistory = async (meetingCode) => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                throw new Error("No authentication token found");
            }

            const request = await client.post(
                "/add_to_activity",
                { meeting_code: meetingCode },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            
            console.log("Meeting added to history:", meetingCode);
            return request;
        } catch (e) {
            console.error('Add to history error:', e);
            // Don't throw error for history addition - it shouldn't block meeting join
            return { success: false, error: e.message };
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        setUserData(null);
        navigate("/");
    };

    const isAuthenticated = () => {
        return !!localStorage.getItem("token");
    };

    const data = {
        userData, 
        setUserData, 
        getHistory, 
        addToUserHistory, 
        handleRegister, 
        handleLogin,
        handleSocialLogin,
        logout,
        isAuthenticated,
        isLoading
    }

    return (
        <Authcontext.Provider value={data}>
            {children}
        </Authcontext.Provider>
    );
}