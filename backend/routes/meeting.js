import express from "express";
import Meeting from "../models/Meeting.js";
import Team from "../models/Team.js";

const router = express.Router();

// GET /api/meetings - Récupérer tous les meetings
router.get("/", async (req, res) => {
  try {
    const { status, teamId } = req.query;

    let filter = {};
    if (status) filter.status = status;
    if (teamId) filter.team = teamId;

    const meetings = await Meeting.find(filter)
      .populate("team", "name members")
      .sort({ createdAt: -1 });

    res.json(meetings);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// GET /api/meetings/:id - Récupérer un meeting
router.get("/:id", async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id).populate("team");
    if (!meeting) {
      return res.status(404).json({ message: "Meeting introuvable" });
    }

    res.json(meeting);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// POST /api/meetings - Créer un meeting
router.post("/", async (req, res) => {
  try {
    const { teamId } = req.body;

    if (!teamId) {
      return res.status(400).json({ message: "ID équipe requis" });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Équipe introuvable" });
    }

    // Vérifier s'il y a déjà un meeting actif pour cette équipe
    const activeMeeting = await Meeting.findOne({
      team: teamId,
      status: "active",
    });

    if (activeMeeting) {
      return res.status(400).json({
        message: "Un meeting est déjà en cours pour cette équipe",
        meeting: activeMeeting,
      });
    }

    const meeting = new Meeting({
      team: teamId,
      status: "active",
    });

    await meeting.save();
    await meeting.populate("team");

    res.status(201).json({
      message: "Meeting créé avec succès",
      meeting,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// PUT /api/meetings/:id - Terminer un meeting
router.put("/:id", async (req, res) => {
  try {
    const { memberTimes, status = "completed" } = req.body;

    const meeting = await Meeting.findById(req.params.id).populate("team");
    if (!meeting) {
      return res.status(404).json({ message: "Meeting introuvable" });
    }

    if (meeting.status !== "active") {
      return res.status(400).json({ message: "Le meeting n'est pas actif" });
    }

    // Calculer les données des membres
    const processedMemberTimes = Object.entries(memberTimes).map(
      ([memberId, timeSpent]) => {
        const member = meeting.team.members.id(memberId);

        // Calculer les points
        let points = 0;
        if (timeSpent <= 60) points = 10;
        else if (timeSpent <= 90) points = 7;
        else if (timeSpent <= 120) points = 5;
        else points = 2;

        const hasViolation = timeSpent > 120;

        return {
          memberId,
          memberName: member ? member.name : "Inconnu",
          timeSpent: Number(timeSpent),
          pointsEarned: points,
          hasViolation,
        };
      }
    );

    // Bonus pour le plus rapide
    const minTime = Math.min(...processedMemberTimes.map((m) => m.timeSpent));
    processedMemberTimes.forEach((member) => {
      if (member.timeSpent === minTime) {
        member.pointsEarned += 5; // Bonus rapidité
      }
    });

    // Compléter le meeting
    await meeting.completeMeeting(processedMemberTimes);

    // Mettre à jour les stats de l'équipe et des membres
    const team = meeting.team;
    team.totalMeetings += 1;

    for (const memberTime of processedMemberTimes) {
      const member = team.members.id(memberTime.memberId);
      if (member) {
        member.points += memberTime.pointsEarned;
        member.totalMeetings += 1;
        member.averageTime =
          (member.averageTime * (member.totalMeetings - 1) +
            memberTime.timeSpent) /
          member.totalMeetings;
        if (memberTime.hasViolation) member.violations += 1;
      }
    }

    await team.save();

    res.json({
      message: "Meeting terminé avec succès",
      meeting,
      pointsAwarded: processedMemberTimes.reduce(
        (total, member) => total + member.pointsEarned,
        0
      ),
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// DELETE /api/meetings/:id - Annuler un meeting
router.delete("/:id", async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting introuvable" });
    }

    if (meeting.status === "active") {
      meeting.status = "cancelled";
      await meeting.save();
    } else {
      await Meeting.findByIdAndDelete(req.params.id);
    }

    res.json({ message: "Meeting supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// GET /api/meetings/team/:teamId/stats - Stats des meetings d'une équipe
router.get("/team/:teamId/stats", async (req, res) => {
  try {
    const stats = await Meeting.aggregate([
      {
        $match: {
          team: new mongoose.Types.ObjectId(req.params.teamId),
          status: "completed",
        },
      },
      {
        $group: {
          _id: "$team",
          totalMeetings: { $sum: 1 },
          averageDuration: { $avg: "$totalDuration" },
          totalViolations: { $sum: "$violations" },
          shortestMeeting: { $min: "$totalDuration" },
          longestMeeting: { $max: "$totalDuration" },
          lastMeeting: { $max: "$endTime" },
        },
      },
    ]);

    const result = stats[0] || {
      totalMeetings: 0,
      averageDuration: 0,
      totalViolations: 0,
      shortestMeeting: 0,
      longestMeeting: 0,
      lastMeeting: null,
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

export default router;
