import express from "express";
import Team from "../models/Team.js";
import Meeting from "../models/Meeting.js";

const router = express.Router();

// GET /api/teams - Récupérer toutes les équipes
router.get("/", async (req, res) => {
  try {
    const teams = await Team.find().sort({ createdAt: -1 });

    // Enrichir avec les stats des meetings
    const teamsWithStats = await Promise.all(
      teams.map(async (team) => {
        const stats = await Meeting.getTeamStats(team._id);
        return {
          ...team.toObject(),
          stats: stats[0] || {
            totalMeetings: 0,
            averageDuration: 0,
            totalViolations: 0,
            lastMeeting: null,
          },
        };
      })
    );

    res.json(teamsWithStats);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// GET /api/teams/:id - Récupérer une équipe
router.get("/:id", async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: "Équipe introuvable" });
    }

    const stats = await Meeting.getTeamStats(team._id);
    const teamWithStats = {
      ...team.toObject(),
      stats: stats[0] || {
        totalMeetings: 0,
        averageDuration: 0,
        totalViolations: 0,
        lastMeeting: null,
      },
    };

    res.json(teamWithStats);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// POST /api/teams - Créer une équipe
router.post("/", async (req, res) => {
  try {
    const { name, members } = req.body;

    // Validation
    if (!name || !members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        message: "Nom et membres requis",
        required: { name: "string", members: "array" },
      });
    }

    // Créer l'équipe
    const team = new Team({
      name: name.trim(),
      members: members.map((member) => ({
        name: typeof member === "string" ? member.trim() : member.name.trim(),
        points: 0,
      })),
    });

    await team.save();

    res.status(201).json({
      message: "Équipe créée avec succès",
      team,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Une équipe avec ce nom existe déjà" });
    }
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// PUT /api/teams/:id - Modifier une équipe
router.put("/:id", async (req, res) => {
  try {
    const { name, members } = req.body;

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: "Équipe introuvable" });
    }

    if (name) team.name = name.trim();
    if (members && Array.isArray(members)) {
      team.members = members.map((member) => ({
        name: typeof member === "string" ? member.trim() : member.name.trim(),
        points: member.points || 0,
      }));
    }

    await team.save();

    res.json({
      message: "Équipe modifiée avec succès",
      team,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// DELETE /api/teams/:id - Supprimer une équipe
router.delete("/:id", async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: "Équipe introuvable" });
    }

    // Supprimer aussi les meetings associés
    await Meeting.deleteMany({ team: req.params.id });
    await Team.findByIdAndDelete(req.params.id);

    res.json({ message: "Équipe supprimée avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// POST /api/teams/:id/points - Attribuer des points
router.post("/:id/points", async (req, res) => {
  try {
    const { pointsData } = req.body; // [{ memberId, points }]

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: "Équipe introuvable" });
    }

    // Attribuer les points
    for (const data of pointsData) {
      const member = team.members.id(data.memberId);
      if (member) {
        member.points += data.points;
      }
    }

    await team.save();

    res.json({
      message: "Points attribués avec succès",
      team,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// GET /api/teams/:id/leaderboard - Classement de l'équipe
router.get("/:id/leaderboard", async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: "Équipe introuvable" });
    }

    const leaderboard = team.members
      .sort((a, b) => b.points - a.points)
      .map((member, index) => ({
        rank: index + 1,
        name: member.name,
        points: member.points,
        totalMeetings: member.totalMeetings,
        averageTime: member.averageTime,
        violations: member.violations,
      }));

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

export default router;
