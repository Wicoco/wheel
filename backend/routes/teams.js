import express from "express";
import Team from "../models/teams.js";
import Member from "../models/Member.js";
import Meeting from "../models/Meeting.js";

const router = express.Router();
// ... reste du code identique

// GET /api/teams - Get all teams
router.get("/", async (req, res) => {
  try {
    const { isActive = true, includeStats = false } = req.query;

    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    let query = Team.find(filter).sort({ createdAt: -1 });

    if (includeStats === "true") {
      query = query.populate(
        "members",
        "name avatar isActive totalScore streak"
      );
    }

    const teams = await query;

    // Add member count to each team
    const teamsWithCounts = await Promise.all(
      teams.map(async (team) => {
        const memberCount = await Member.countDocuments({
          teamId: team._id,
          isActive: true,
        });

        const teamObj = team.toObject();
        teamObj.memberCount = memberCount;

        return teamObj;
      })
    );

    res.json(teamsWithCounts);
  } catch (error) {
    console.error("Error fetching teams:", error);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});

// GET /api/teams/:id - Get specific team
router.get("/:id", async (req, res) => {
  try {
    const team = await Team.findById(req.params.id).populate(
      "members",
      "name avatar title isActive totalScore averageScore streak badges"
    );

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Get recent meetings
    const recentMeetings = await Meeting.find({ teamId: team._id })
      .populate("participants.memberId", "name avatar")
      .sort({ createdAt: -1 })
      .limit(5);

    const teamData = team.toObject();
    teamData.recentMeetings = recentMeetings;
    teamData.memberCount = team.members.filter((m) => m.isActive).length;

    res.json(teamData);
  } catch (error) {
    console.error("Error fetching team:", error);
    res.status(500).json({ error: "Failed to fetch team" });
  }
});

// POST /api/teams - Create new team
router.post("/", async (req, res) => {
  try {
    const {
      name,
      description,
      slackChannelId,
      slackChannelName,
      targetStandupDuration,
      maxSpeakingTime,
    } = req.body;

    if (!name || !slackChannelId) {
      return res.status(400).json({
        error: "Name and Slack channel ID are required",
      });
    }

    // Check if team with this Slack channel already exists
    const existingTeam = await Team.findOne({ slackChannelId });
    if (existingTeam) {
      return res.status(409).json({
        error: "Team already exists for this Slack channel",
      });
    }

    const team = new Team({
      name,
      description,
      slackChannelId,
      slackChannelName,
      targetStandupDuration: targetStandupDuration || 900, // 15 minutes
      maxSpeakingTime: maxSpeakingTime || 120, // 2 minutes
      lastSync: new Date(),
    });

    await team.save();

    const populatedTeam = await Team.findById(team._id).populate(
      "members",
      "name avatar title isActive"
    );

    res.status(201).json(populatedTeam);
  } catch (error) {
    console.error("Error creating team:", error);
    res.status(500).json({ error: "Failed to create team" });
  }
});

// PUT /api/teams/:id - Update team
router.put("/:id", async (req, res) => {
  try {
    const {
      name,
      description,
      targetStandupDuration,
      maxSpeakingTime,
      isActive,
    } = req.body;

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Update fields if provided
    if (name !== undefined) team.name = name;
    if (description !== undefined) team.description = description;
    if (targetStandupDuration !== undefined)
      team.targetStandupDuration = targetStandupDuration;
    if (maxSpeakingTime !== undefined) team.maxSpeakingTime = maxSpeakingTime;
    if (isActive !== undefined) team.isActive = isActive;

    team.updatedAt = new Date();
    await team.save();

    const populatedTeam = await Team.findById(team._id).populate(
      "members",
      "name avatar title isActive totalScore"
    );

    res.json(populatedTeam);
  } catch (error) {
    console.error("Error updating team:", error);
    res.status(500).json({ error: "Failed to update team" });
  }
});

// DELETE /api/teams/:id - Delete team (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Soft delete - mark as inactive
    team.isActive = false;
    team.updatedAt = new Date();
    await team.save();

    // Also deactivate all team members
    await Member.updateMany(
      { teamId: team._id },
      { isActive: false, updatedAt: new Date() }
    );

    res.json({ message: "Team deleted successfully" });
  } catch (error) {
    console.error("Error deleting team:", error);
    res.status(500).json({ error: "Failed to delete team" });
  }
});

// GET /api/teams/:id/members - Get team members
router.get("/:id/members", async (req, res) => {
  try {
    const { isActive = true } = req.query;

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const filter = { teamId: req.params.id };
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const members = await Member.find(filter)
      .sort({ name: 1 })
      .select(
        "name avatar title email isActive totalScore averageScore streak badges lastStandupDate"
      );

    res.json(members);
  } catch (error) {
    console.error("Error fetching team members:", error);
    res.status(500).json({ error: "Failed to fetch team members" });
  }
});

// POST /api/teams/:id/members - Add member to team
router.post("/:id/members", async (req, res) => {
  try {
    const { name, email, title, avatar, slackUserId } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Check if member with same slackUserId already exists in team
    if (slackUserId) {
      const existingMember = await Member.findOne({
        teamId: req.params.id,
        slackUserId,
      });
      if (existingMember) {
        return res.status(409).json({ error: "Member already exists in team" });
      }
    }

    const member = new Member({
      name,
      email,
      title: title || "Team Member",
      avatar,
      slackUserId,
      teamId: req.params.id,
    });

    await member.save();

    res.status(201).json(member);
  } catch (error) {
    console.error("Error adding team member:", error);
    res.status(500).json({ error: "Failed to add team member" });
  }
});

// GET /api/teams/:id/stats - Get team performance statistics
router.get("/:id/stats", async (req, res) => {
  try {
    const { period = "30d" } = req.query;

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

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

    // Get meetings in period
    const meetings = await Meeting.find({
      teamId: req.params.id,
      status: "completed",
      completedAt: { $gte: startDate },
    }).populate("participants.memberId", "name avatar");

    // Get active members
    const members = await Member.find({
      teamId: req.params.id,
      isActive: true,
    }).select("name avatar totalScore averageScore streak badges");

    // Calculate basic stats
    const stats = {
      // Team overview
      totalMembers: members.length,
      totalMeetings: meetings.length,
      averageTeamScore: team.averageScore || 0,

      // Meeting stats
      averageDuration: 0,
      onTimePercentage: 0,
      participationRate: 0,

      // Performance metrics
      topPerformers: [],
      teamTrends: [],
      achievementStats: {},

      // Time analysis
      timeDistribution: [],
      consistencyScore: 0,
    };

    if (meetings.length > 0) {
      // Calculate averages
      const totalDuration = meetings.reduce(
        (sum, m) => sum + (m.totalDuration || 0),
        0
      );
      stats.averageDuration = Math.floor(totalDuration / meetings.length);

      // On-time meetings (within target duration)
      const onTimeMeetings = meetings.filter(
        (m) => m.totalDuration <= team.targetStandupDuration
      );
      stats.onTimePercentage = Math.floor(
        (onTimeMeetings.length / meetings.length) * 100
      );

      // Participation analysis
      const participantMap = new Map();
      meetings.forEach((meeting) => {
        meeting.participants.forEach((p) => {
          if (p.memberId) {
            const id = p.memberId._id.toString();
            if (!participantMap.has(id)) {
              participantMap.set(id, {
                member: p.memberId,
                appearances: 0,
                totalScore: 0,
                totalTime: 0,
                bestScore: 0,
              });
            }
            const participant = participantMap.get(id);
            participant.appearances += 1;
            participant.totalScore += p.score || 0;
            participant.totalTime += p.speakingTime || 0;
            if ((p.score || 0) > participant.bestScore) {
              participant.bestScore = p.score || 0;
            }
          }
        });
      });

      // Top performers
      stats.topPerformers = Array.from(participantMap.values())
        .map((p) => ({
          member: p.member,
          averageScore: Math.floor(p.totalScore / p.appearances),
          averageTime: Math.floor(p.totalTime / p.appearances),
          appearances: p.appearances,
          participationRate: Math.floor(
            (p.appearances / meetings.length) * 100
          ),
          bestScore: p.bestScore,
        }))
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, 5);

      // Overall participation rate
      const totalPossibleParticipations = meetings.length * members.length;
      const actualParticipations = Array.from(participantMap.values()).reduce(
        (sum, p) => sum + p.appearances,
        0
      );
      stats.participationRate =
        totalPossibleParticipations > 0
          ? Math.floor(
              (actualParticipations / totalPossibleParticipations) * 100
            )
          : 0;

      // Time trends (last 7 days)
      const last7Days = [...Array(7)]
        .map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toISOString().split("T")[0];
        })
        .reverse();

      stats.teamTrends = last7Days.map((day) => {
        const dayMeetings = meetings.filter(
          (m) =>
            m.completedAt && m.completedAt.toISOString().split("T")[0] === day
        );
        return {
          date: day,
          meetings: dayMeetings.length,
          avgScore:
            dayMeetings.length > 0
              ? Math.floor(
                  dayMeetings.reduce((sum, m) => sum + m.teamScore, 0) /
                    dayMeetings.length
                )
              : 0,
          avgDuration:
            dayMeetings.length > 0
              ? Math.floor(
                  dayMeetings.reduce(
                    (sum, m) => sum + (m.totalDuration || 0),
                    0
                  ) / dayMeetings.length
                )
              : 0,
        };
      });
    }

    // Badge/Achievement analysis
    const allBadges = members.reduce((badges, member) => {
      member.badges.forEach((badge) => {
        if (!badges[badge.category]) {
          badges[badge.category] = 0;
        }
        badges[badge.category]++;
      });
      return badges;
    }, {});

    stats.achievementStats = allBadges;

    // Consistency score (based on regular participation)
    const activeMembers = members.filter((m) => m.streak > 0);
    stats.consistencyScore =
      members.length > 0
        ? Math.floor((activeMembers.length / members.length) * 100)
        : 0;

    res.json(stats);
  } catch (error) {
    console.error("Error fetching team stats:", error);
    res.status(500).json({ error: "Failed to fetch team statistics" });
  }
});

// PUT /api/teams/:id/settings - Update team settings
router.put("/:id/settings", async (req, res) => {
  try {
    const {
      targetStandupDuration,
      maxSpeakingTime,
      enableNotifications,
      notificationTime,
      enableScoring,
      enableBadges,
    } = req.body;

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Update settings
    if (targetStandupDuration !== undefined) {
      team.targetStandupDuration = targetStandupDuration;
    }
    if (maxSpeakingTime !== undefined) {
      team.maxSpeakingTime = maxSpeakingTime;
    }
    if (enableNotifications !== undefined) {
      team.enableNotifications = enableNotifications;
    }
    if (notificationTime !== undefined) {
      team.notificationTime = notificationTime;
    }
    if (enableScoring !== undefined) {
      team.enableScoring = enableScoring;
    }
    if (enableBadges !== undefined) {
      team.enableBadges = enableBadges;
    }

    team.updatedAt = new Date();
    await team.save();

    res.json({
      message: "Team settings updated successfully",
      settings: {
        targetStandupDuration: team.targetStandupDuration,
        maxSpeakingTime: team.maxSpeakingTime,
        enableNotifications: team.enableNotifications,
        notificationTime: team.notificationTime,
        enableScoring: team.enableScoring,
        enableBadges: team.enableBadges,
      },
    });
  } catch (error) {
    console.error("Error updating team settings:", error);
    res.status(500).json({ error: "Failed to update team settings" });
  }
});

// GET /api/teams/:id/leaderboard - Get team leaderboard
router.get("/:id/leaderboard", async (req, res) => {
  try {
    const { period = "30d" } = req.query;

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Calculate date range
    let startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "all":
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get meetings in period
    const meetings = await Meeting.find({
      teamId: req.params.id,
      status: "completed",
      completedAt: { $gte: startDate },
    }).populate("participants.memberId", "name avatar title");

    // Calculate leaderboard
    const memberStats = new Map();

    meetings.forEach((meeting) => {
      meeting.participants.forEach((p) => {
        if (p.memberId) {
          const id = p.memberId._id.toString();
          if (!memberStats.has(id)) {
            memberStats.set(id, {
              member: p.memberId,
              totalScore: 0,
              appearances: 0,
              totalTime: 0,
              bestScore: 0,
              avgScore: 0,
              avgTime: 0,
              rank: 0,
            });
          }
          const stats = memberStats.get(id);
          stats.totalScore += p.score || 0;
          stats.appearances += 1;
          stats.totalTime += p.speakingTime || 0;
          if ((p.score || 0) > stats.bestScore) {
            stats.bestScore = p.score || 0;
          }
        }
      });
    });

    // Calculate averages and create leaderboard
    const leaderboard = Array.from(memberStats.values())
      .map((stats) => {
        stats.avgScore =
          stats.appearances > 0
            ? Math.floor(stats.totalScore / stats.appearances)
            : 0;
        stats.avgTime =
          stats.appearances > 0
            ? Math.floor(stats.totalTime / stats.appearances)
            : 0;
        return stats;
      })
      .sort((a, b) => b.avgScore - a.avgScore)
      .map((stats, index) => ({
        ...stats,
        rank: index + 1,
      }));

    res.json({
      period,
      totalMeetings: meetings.length,
      leaderboard,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching team leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch team leaderboard" });
  }
});

export default router;
