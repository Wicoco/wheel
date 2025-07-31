import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

// Routes
import teamRoutes from "./routes/teams.js";
import meetingRoutes from "./routes/meetings.js";

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/standup-gamifier"
  )
  .then(() => console.log("✅ MongoDB connecté"))
  .catch((err) => console.error("❌ Erreur MongoDB:", err));

// Routes
app.use("/api/teams", teamRoutes);
app.use("/api/meetings", meetingRoutes);

// Socket.IO pour temps réel
io.on("connection", (socket) => {
  console.log("👤 Utilisateur connecté:", socket.id);

  socket.on("joinMeeting", (meetingId) => {
    socket.join(meetingId);
    console.log(`📅 Rejoint meeting: ${meetingId}`);
  });

  socket.on("memberTimer", (data) => {
    socket.to(data.meetingId).emit("timerUpdate", data);
  });

  socket.on("disconnect", () => {
    console.log("👤 Utilisateur déconnecté:", socket.id);
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Standup Gamifier API" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
