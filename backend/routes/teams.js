import express from "express";
import Team from "../models/Team.js";
import Member from "../models/Member.js";

const router = express.Router();

// Créer équipe avec membres Slack
router.post("/", async (req, res) => {
  try {
    const { name, slackChannelId, members } = req.body;

    // 1. Créer l'équipe
    const team = new Team({
      name,
      slackChannelId,
      description: `Équipe importée depuis Slack`,
      isActive: true,
    });

    await team.save();

    // 2. Créer les membres
    const memberPromises = members.map((memberData) => {
      const member = new Member({
        ...memberData,
        teamId: team._id,
      });
      return member.save();
    });

    const savedMembers = await Promise.all(memberPromises);

    // 3. Retourner l'équipe complète
    const populatedTeam = await Team.findById(team._id).populate("members");

    res.status(201).json({
      success: true,
      team: populatedTeam,
    });
  } catch (error) {
    console.error("Erreur création équipe:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Récupérer toutes les équipes
router.get("/", async (req, res) => {
  try {
    const teams = await Team.find({ isActive: true }).populate("members");
    res.json({ teams });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
