import express from "express";
import slackService from "../services/slackService.js";

const router = express.Router();

// Récupérer les membres d'un channel avec profils
router.get("/channel/:channelId/members", async (req, res) => {
  try {
    const { channelId } = req.params;
    const members = await slackService.getChannelMembers(channelId);

    res.json({ members });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Récupérer le profil d'un utilisateur spécifique
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await slackService.getUserProfile(userId);

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test connexion
router.get("/test", async (req, res) => {
  try {
    const status = await slackService.testConnection();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
