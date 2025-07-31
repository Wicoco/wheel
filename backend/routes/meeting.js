import express from "express";
import Meeting from "../models/Meeting.js";
import Member from "../models/Member.js";
import Team from "../models/teams.js";

const router = express.Router();

// Helper function to check and award achievements
const checkAndAwardAchievements = async (member, participantData) => {
  const achievements = [];

  // Speed Demon - under 60 seconds
  if (participantData.speakingTime <= 60 && participantData.speakingTime > 0) {
    achievements.push({
      name: "Speed Demon",
      description: "Completed standup in under 60 seconds",
      icon: "⚡",
      category: "speed",
    });
  }

  // Perfect Score - 100 points
  if (participantData.score >= 100) {
    achievements.push({
      name: "Perfect Score",
      description: "Achieved perfect standup score",
      icon: "💯",
      category: "quality",
    });
  }

  // Consistency King - 7 consecutive standups
  if (member.streak >= 7) {
    achievements.push({
      name: "Consistency King",
      description: "7 days streak of standups",
      icon: "🔥",
      category: "consistency",
    });
  }

  // Add achievements to member
  achievements.forEach((achievement) => {
    member.addBadge(achievement);
  });

  return achievements;
};

// GET /api/meetings - Get all meetings with filters
router.get("/", async (req, res) => {
  try {
    const { teamId, status, limit = 10, skip = 0 } = req.query;

    const filter = {};
    if (teamId) filter.teamId = teamId;
    if (status) filter.status = status;

    const meetings = await Meeting.find(filter)
      .populate("teamId", "name slackChannelName")
      .populate("participants.memberId", "name avatar title")
      .populate("winner", "name avatar")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    res.json(meetings);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({ error: "Failed to fetch meetings" });
  }
});

// GET /api/meetings/:id - Get specific meeting
router.get("/:id", async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate("teamId", "name slackChannelName targetStandupDuration")
      .populate("participants.memberId", "name avatar title")
      .populate("winner", "name avatar title");

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    res.json(meeting);
  } catch (error) {
    console.error("Error fetching meeting:", error);
    res.status(500).json({ error: "Failed to fetch meeting" });
  }
});

// POST /api/meetings - Create new meeting
router.post("/", async (req, res) => {
  try {
    const { teamId, name, participants = [] } = req.body;

    // Validate team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // If no participants provided, get all active team members
    let meetingParticipants = participants;
    if (participants.length === 0) {
      const members = await Member.find({ teamId, isActive: true });
      meetingParticipants = members.map((member, index) => ({
        memberId: member._id,
        order: index + 1,
        speakingTime: 0,
        score: 0,
      }));
    }

    // Create meeting
    const meeting = new Meeting({
      teamId,
      name: name || "Daily Standup",
      startTime: new Date(),
      status: "planned",
      participants: meetingParticipants,
    });

    await meeting.save();

    // Populate the response
    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate("teamId", "name slackChannelName")
      .populate("participants.memberId", "name avatar title");

    res.status(201).json(populatedMeeting);
  } catch (error) {
    console.error("Error creating meeting:", error);
    res.status(500).json({ error: "Failed to create meeting" });
  }
});

// PUT /api/meetings/:id/start - Start a meeting
router.put("/:id/start", async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    if (meeting.status !== "planned") {
      return res.status(400).json({ error: "Meeting cannot be started" });
    }

    meeting.status = "in_progress";
    meeting.startTime = new Date();
    await meeting.save();

    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate("teamId", "name slackChannelName")
      .populate("participants.memberId", "name avatar title");

    res.json(populatedMeeting);
  } catch (error) {
    console.error("Error starting meeting:", error);
    res.status(500).json({ error: "Failed to start meeting" });
  }
});

// PUT /api/meetings/:id/update-participant - Update participant during meeting
router.put("/:id/update-participant", async (req, res) => {
  try {
    const { participantId, speakingTime, score } = req.body;

    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // Find and update participant
    const participantIndex = meeting.participants.findIndex(
      (p) => p.memberId.toString() === participantId
    );

    if (participantIndex === -1) {
      return res.status(404).json({ error: "Participant not found" });
    }

    meeting.participants[participantIndex].speakingTime = speakingTime;
    if (score !== undefined) {
      meeting.participants[participantIndex].score = score;
    }

    await meeting.save();

    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate("teamId", "name slackChannelName")
      .populate("participants.memberId", "name avatar title");

    res.json(populatedMeeting);
  } catch (error) {
    console.error("Error updating participant:", error);
    res.status(500).json({ error: "Failed to update participant" });
  }
});

// PUT /api/meetings/:id/complete - Complete a meeting
router.put("/:id/complete", async (req, res) => {
  try {
    const { participants, totalDuration } = req.body;

    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // Update meeting data
    meeting.status = "completed";
    meeting.endTime = new Date();
    meeting.completedAt = new Date();
    meeting.totalDuration =
      totalDuration ||
      Math.floor((Date.now() - meeting.startTime.getTime()) / 1000);

    if (participants && participants.length > 0) {
      meeting.participants = participants;

      // Calculate team score (average of all participant scores)
      const totalScore = participants.reduce(
        (sum, p) => sum + (p.score || 0),
        0
      );
      meeting.teamScore =
        participants.length > 0
          ? Math.floor(totalScore / participants.length)
          : 0;
    }

    await meeting.save();

    // Update team and member statistics
    const team = await Team.findById(meeting.teamId);
    if (team) {
      team.updateStandupStats(meeting.totalDuration, meeting.teamScore);
      await team.save();
    }

    // Update individual member stats and check achievements
    if (participants && participants.length > 0) {
      for (const participant of participants) {
        const member = await Member.findById(participant.memberId);
        if (member) {
          member.updateStandupStats(
            participant.speakingTime,
            participant.score || 0
          );

          // Check for achievements
          await checkAndAwardAchievements(member, participant);

          await member.save();
        }
      }
    }

    // Return populated meeting
    const completedMeeting = await Meeting.findById(meeting._id)
      .populate("teamId", "name slackChannelName")
      .populate("participants.memberId", "name avatar title")
      .populate("winner", "name avatar title");

    res.json(completedMeeting);
  } catch (error) {
    console.error("Error completing meeting:", error);
    res.status(500).json({ error: "Failed to complete meeting" });
  }
});

// PUT /api/meetings/:id/cancel - Cancel a meeting
router.put("/:id/cancel", async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    meeting.status = "cancelled";
    await meeting.save();

    res.json({ message: "Meeting cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling meeting:", error);
    res.status(500).json({ error: "Failed to cancel meeting" });
  }
});

// GET /api/meetings/team/:teamId/stats - Get team meeting statistics
router.get("/team/:teamId/stats", async (req, res) => {
  try {
    const { teamId } = req.params;
    const { period = "30d" } = req.query;

    // Calculate date range
    let startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const meetings = await Meeting.find({
      teamId,
      status: "completed",
      completedAt: { $gte: startDate },
    }).populate("participants.memberId", "name avatar");

    // Calculate statistics
    const stats = {
      totalMeetings: meetings.length,
      averageDuration: 0,
      averageTeamScore: 0,
      totalParticipants: 0,
      topPerformers: [],
      trends: [],
    };

    if (meetings.length > 0) {
      // Calculate averages
      const totalDuration = meetings.reduce(
        (sum, m) => sum + m.totalDuration,
        0
      );
      const totalScore = meetings.reduce((sum, m) => sum + m.teamScore, 0);

      stats.averageDuration = Math.floor(totalDuration / meetings.length);
      stats.averageTeamScore = Math.floor(totalScore / meetings.length);

      // Get unique participants
      const participantMap = new Map();
      meetings.forEach((meeting) => {
        meeting.participants.forEach((p) => {
          if (p.memberId) {
            const id = p.memberId._id.toString();
            if (!participantMap.has(id)) {
              participantMap.set(id, {
                member: p.memberId,
                totalScore: 0,
                totalTime: 0,
                appearances: 0,
              });
            }
            const participant = participantMap.get(id);
            participant.totalScore += p.score || 0;
            participant.totalTime += p.speakingTime || 0;
            participant.appearances += 1;
          }
        });
      });

      // Calculate top performers
      stats.topPerformers = Array.from(participantMap.values())
        .map((p) => ({
          member: p.member,
          averageScore: Math.floor(p.totalScore / p.appearances),
          averageTime: Math.floor(p.totalTime / p.appearances),
          appearances: p.appearances,
        }))
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, 5);

      stats.totalParticipants = participantMap.size;
    }

    res.json(stats);
  } catch (error) {
    console.error("Error fetching team stats:", error);
    res.status(500).json({ error: "Failed to fetch team statistics" });
  }
});

// DELETE /api/meetings/:id - Delete a meeting
router.delete("/:id", async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // Only allow deletion of planned or cancelled meetings
    if (meeting.status === "in_progress" || meeting.status === "completed") {
      return res
        .status(400)
        .json({ error: "Cannot delete active or completed meetings" });
    }

    await Meeting.findByIdAndDelete(req.params.id);
    res.json({ message: "Meeting deleted successfully" });
  } catch (error) {
    console.error("Error deleting meeting:", error);
    res.status(500).json({ error: "Failed to delete meeting" });
  }
});

export default router;
