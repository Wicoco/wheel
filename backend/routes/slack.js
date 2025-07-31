import express from "express";
import { WebClient } from "@slack/web-api";
import Member from "../models/Member.js";
import Team from "../models/teams.js";

const router = express.Router();
// ... reste du code identique

// Initialize Slack client
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// Helper function to validate Slack bot token
const validateSlackToken = async () => {
  try {
    await slack.auth.test();
    return true;
  } catch (error) {
    console.error("Slack token validation failed:", error);
    return false;
  }
};

// GET /api/slack/test - Test Slack connection
router.get("/test", async (req, res) => {
  try {
    const isValid = await validateSlackToken();
    if (!isValid) {
      return res.status(400).json({ error: "Invalid Slack bot token" });
    }

    const auth = await slack.auth.test();
    res.json({
      success: true,
      team: auth.team,
      user: auth.user,
      message: "Slack connection successful",
    });
  } catch (error) {
    console.error("Slack test error:", error);
    res.status(500).json({
      error: "Failed to connect to Slack",
      details: error.message,
    });
  }
});

// GET /api/slack/channels - Get available Slack channels
router.get("/channels", async (req, res) => {
  try {
    const isValid = await validateSlackToken();
    if (!isValid) {
      return res.status(400).json({ error: "Invalid Slack bot token" });
    }

    // Get public channels
    const response = await slack.conversations.list({
      types: "public_channel,private_channel",
      exclude_archived: true,
      limit: 100,
    });

    const channels = response.channels
      .filter((channel) => !channel.is_archived)
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
        purpose: channel.purpose?.value || "",
        memberCount: channel.num_members || 0,
        isPrivate: channel.is_private || false,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json(channels);
  } catch (error) {
    console.error("Error fetching Slack channels:", error);
    res.status(500).json({
      error: "Failed to fetch Slack channels",
      details: error.message,
    });
  }
});

// GET /api/slack/channel/:channelId/members - Get channel members
router.get("/channel/:channelId/members", async (req, res) => {
  try {
    const { channelId } = req.params;

    const isValid = await validateSlackToken();
    if (!isValid) {
      return res.status(400).json({ error: "Invalid Slack bot token" });
    }

    // Get channel members
    const membersResponse = await slack.conversations.members({
      channel: channelId,
    });

    if (!membersResponse.members || membersResponse.members.length === 0) {
      return res.json([]);
    }

    // Get user profiles for each member
    const memberProfiles = await Promise.all(
      membersResponse.members.map(async (userId) => {
        try {
          const userInfo = await slack.users.info({ user: userId });
          const user = userInfo.user;

          // Skip bots and deleted users
          if (user.is_bot || user.deleted) {
            return null;
          }

          return {
            slackUserId: user.id,
            name:
              user.profile.display_name || user.profile.real_name || user.name,
            realName: user.profile.real_name,
            email: user.profile.email,
            avatar:
              user.profile.image_512 ||
              user.profile.image_192 ||
              user.profile.image_72,
            title: user.profile.title || "Team Member",
            timezone: user.tz || "UTC",
          };
        } catch (error) {
          console.warn(`Failed to get user info for ${userId}:`, error.message);
          return null;
        }
      })
    );

    // Filter out null values and sort by name
    const validMembers = memberProfiles
      .filter((member) => member !== null)
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json(validMembers);
  } catch (error) {
    console.error("Error fetching channel members:", error);
    res.status(500).json({
      error: "Failed to fetch channel members",
      details: error.message,
    });
  }
});

// POST /api/slack/import-team - Import team from Slack channel
router.post("/import-team", async (req, res) => {
  try {
    const { channelId, teamName, description } = req.body;

    if (!channelId) {
      return res.status(400).json({ error: "Channel ID is required" });
    }

    const isValid = await validateSlackToken();
    if (!isValid) {
      return res.status(400).json({ error: "Invalid Slack bot token" });
    }

    // Check if team already exists with this channel
    const existingTeam = await Team.findOne({ slackChannelId: channelId });
    if (existingTeam) {
      return res.status(409).json({
        error: "Team already exists for this channel",
        teamId: existingTeam._id,
      });
    }

    // Get channel info
    const channelInfo = await slack.conversations.info({ channel: channelId });
    const channel = channelInfo.channel;

    // Create team
    const team = new Team({
      name: teamName || `#${channel.name}`,
      description: description || channel.purpose?.value || "",
      slackChannelId: channelId,
      slackChannelName: channel.name,
      lastSync: new Date(),
    });

    await team.save();

    // Get and import members
    const membersResponse = await slack.conversations.members({
      channel: channelId,
    });
    let importedMembers = [];

    if (membersResponse.members && membersResponse.members.length > 0) {
      const memberProfiles = await Promise.all(
        membersResponse.members.map(async (userId) => {
          try {
            const userInfo = await slack.users.info({ user: userId });
            const user = userInfo.user;

            // Skip bots and deleted users
            if (user.is_bot || user.deleted) {
              return null;
            }

            // Create member
            const member = new Member({
              slackUserId: user.id,
              name:
                user.profile.display_name ||
                user.profile.real_name ||
                user.name,
              realName: user.profile.real_name,
              email: user.profile.email,
              avatar:
                user.profile.image_512 ||
                user.profile.image_192 ||
                user.profile.image_72,
              title: user.profile.title || "Team Member",
              teamId: team._id,
              lastSync: new Date(),
            });

            await member.save();
            return member;
          } catch (error) {
            console.warn(`Failed to import user ${userId}:`, error.message);
            return null;
          }
        })
      );

      importedMembers = memberProfiles.filter((member) => member !== null);
    }

    // Populate team response
    const populatedTeam = await Team.findById(team._id).populate("members");

    res.status(201).json({
      team: populatedTeam,
      importedMembers: importedMembers.length,
      message: `Successfully imported team with ${importedMembers.length} members`,
    });
  } catch (error) {
    console.error("Error importing team from Slack:", error);
    res.status(500).json({
      error: "Failed to import team from Slack",
      details: error.message,
    });
  }
});

// PUT /api/slack/sync-team/:teamId - Sync team members from Slack
router.put("/sync-team/:teamId", async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const isValid = await validateSlackToken();
    if (!isValid) {
      return res.status(400).json({ error: "Invalid Slack bot token" });
    }

    // Get current channel members from Slack
    const membersResponse = await slack.conversations.members({
      channel: team.slackChannelId,
    });

    if (!membersResponse.members) {
      return res.status(400).json({ error: "Failed to get channel members" });
    }

    const currentSlackUserIds = new Set(membersResponse.members);
    const existingMembers = await Member.find({ teamId: team._id });
    const existingSlackUserIds = new Set(
      existingMembers.map((m) => m.slackUserId)
    );

    let syncStats = {
      added: 0,
      updated: 0,
      removed: 0,
    };

    // Add new members
    const newUserIds = [...currentSlackUserIds].filter(
      (id) => !existingSlackUserIds.has(id)
    );
    for (const userId of newUserIds) {
      try {
        const userInfo = await slack.users.info({ user: userId });
        const user = userInfo.user;

        // Skip bots and deleted users
        if (user.is_bot || user.deleted) {
          continue;
        }

        const newMember = new Member({
          slackUserId: user.id,
          name:
            user.profile.display_name || user.profile.real_name || user.name,
          realName: user.profile.real_name,
          email: user.profile.email,
          avatar:
            user.profile.image_512 ||
            user.profile.image_192 ||
            user.profile.image_72,
          title: user.profile.title || "Team Member",
          teamId: team._id,
          lastSync: new Date(),
        });

        await newMember.save();
        syncStats.added++;
      } catch (error) {
        console.warn(`Failed to add user ${userId}:`, error.message);
      }
    }

    // Update existing members
    for (const member of existingMembers) {
      if (currentSlackUserIds.has(member.slackUserId)) {
        try {
          const userInfo = await slack.users.info({ user: member.slackUserId });
          const user = userInfo.user;

          // Update profile information
          member.name =
            user.profile.display_name || user.profile.real_name || user.name;
          member.realName = user.profile.real_name;
          member.email = user.profile.email;
          member.avatar =
            user.profile.image_512 ||
            user.profile.image_192 ||
            user.profile.image_72;
          member.title = user.profile.title || "Team Member";
          member.isActive = true;
          member.lastSync = new Date();

          await member.save();
          syncStats.updated++;
        } catch (error) {
          console.warn(
            `Failed to update user ${member.slackUserId}:`,
            error.message
          );
        }
      } else {
        // Member no longer in channel - mark as inactive
        member.isActive = false;
        await member.save();
        syncStats.removed++;
      }
    }

    // Update team sync timestamp
    team.lastSync = new Date();
    await team.save();

    res.json({
      message: "Team sync completed successfully",
      stats: syncStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error syncing team:", error);
    res.status(500).json({
      error: "Failed to sync team",
      details: error.message,
    });
  }
});

// POST /api/slack/notify - Send notification to Slack channel
router.post("/notify", async (req, res) => {
  try {
    const { channelId, message, blocks } = req.body;

    if (!channelId || !message) {
      return res
        .status(400)
        .json({ error: "Channel ID and message are required" });
    }

    const isValid = await validateSlackToken();
    if (!isValid) {
      return res.status(400).json({ error: "Invalid Slack bot token" });
    }

    const result = await slack.chat.postMessage({
      channel: channelId,
      text: message,
      blocks: blocks || undefined,
    });

    res.json({
      success: true,
      messageId: result.ts,
      channel: result.channel,
    });
  } catch (error) {
    console.error("Error sending Slack notification:", error);
    res.status(500).json({
      error: "Failed to send Slack notification",
      details: error.message,
    });
  }
});

export default router;
