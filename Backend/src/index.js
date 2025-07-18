import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "node:http";

import { Server } from "socket.io";
import jwt from "jsonwebtoken"

import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager.js";

import cors from "cors";
import userRoutes from "./routes/users.routes.js";

const app = express();
const server = createServer(app);
const io = connectToSocket(server);


app.set("port", (process.env.PORT || 5000))
app.use(
  cors({
    origin:  [
      'https://videocall-codealpha.vercel.app',
      'http://localhost:5173'
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/v1/users", userRoutes);

const start = async () => {
   try {
    const connectionDb = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${connectionDb.connection.host}`);

    server.listen(app.get("port"), () => {
      console.log(`Server listening on port ${app.get("port")}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1);
  }
}

start();