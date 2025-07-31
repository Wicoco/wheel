import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    // Basic information
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },

    // Slack integration
    slackChannelId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    slackChannelName: {
      type: String,
      trim: true,
    },

    // Team performance statistics
    totalStandups: {
      type: Number,
      default: 0,
    },
    averageStandupDuration: {
      type: Number,
      default: 0,
    }, // in seconds
    bestStandupTime: {
      type: Number,
      default: 0,
    }, // shortest successful standup
    teamScore: {
      type: Number,
      default: 0,
    },
    averageTeamScore: {
      type: Number,
      default: 0,
    },

    // Configuration settings
    targetStandupDuration: {
      type: Number,
      default: 900,
    }, // 15 minutes in seconds
    maxSpeakingTime: {
      type: Number,
      default: 120,
    }, // 2 minutes per person
    standupTime: {
      hour: { type: Number, default: 9 }, // 9 AM
      minute: { type: Number, default: 30 }, // 30 minutes
      timezone: { type: String, default: "UTC" },
    },

    // Team settings
    enableGameMode: {
      type: Boolean,
      default: true,
    },
    enableSlackNotifications: {
      type: Boolean,
      default: true,
    },
    scoringMode: {
      type: String,
      enum: ["time-based", "quality-based", "hybrid"],
      default: "time-based",
    },

    // Achievement tracking
    teamBadges: [
      {
        name: String,
        description: String,
        icon: { type: String, default: "🏆" },
        earnedAt: Date,
        criteria: String,
      },
    ],

    // Streak tracking
    currentStreak: {
      type: Number,
      default: 0,
    }, // consecutive days with standups
    longestStreak: {
      type: Number,
      default: 0,
    },

    // Status and metadata
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSync: {
      type: Date,
      default: Date.now,
    }, // last Slack sync

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastStandup: {
      type: Date,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for queries
teamSchema.index({ isActive: 1, createdAt: -1 });
teamSchema.index({ teamScore: -1 });

// Virtual to populate members
teamSchema.virtual("members", {
  ref: "Member",
  localField: "_id",
  foreignField: "teamId",
  match: { isActive: true },
});

// Virtual for member count
teamSchema.virtual("memberCount", {
  ref: "Member",
  localField: "_id",
  foreignField: "teamId",
  count: true,
  match: { isActive: true },
});

// Virtual for performance rating
teamSchema.virtual("performanceRating").get(function () {
  if (this.averageTeamScore >= 85) return "Excellent";
  if (this.averageTeamScore >= 75) return "Good";
  if (this.averageTeamScore >= 65) return "Average";
  if (this.averageTeamScore >= 55) return "Needs Improvement";
  return "Getting Started";
});

// Virtual for standup frequency
teamSchema.virtual("standupFrequency").get(function () {
  if (!this.createdAt || this.totalStandups === 0) return 0;

  const daysActive = Math.floor(
    (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysActive > 0
    ? Math.round((this.totalStandups / daysActive) * 100) / 100
    : 0;
});

// Pre-save middleware
teamSchema.pre("save", function (next) {
  this.updatedAt = new Date();

  // Calculate average team score
  if (this.totalStandups > 0 && this.teamScore > 0) {
    this.averageTeamScore = Math.floor(this.teamScore / this.totalStandups);
  }

  // Update longest streak
  if (this.currentStreak > this.longestStreak) {
    this.longestStreak = this.currentStreak;
  }

  next();
});

// Method to update team stats after a standup
teamSchema.methods.updateStandupStats = function (duration, teamScore) {
  this.totalStandups += 1;
  this.teamScore += teamScore;
  this.lastStandup = new Date();

  // Update average duration
  this.averageStandupDuration = Math.floor(
    (this.averageStandupDuration * (this.totalStandups - 1) + duration) /
      this.totalStandups
  );

  // Update best time if this is better and meets minimum threshold
  if (
    duration < this.targetStandupDuration &&
    (this.bestStandupTime === 0 || duration < this.bestStandupTime)
  ) {
    this.bestStandupTime = duration;
  }

  return this;
};

// Method to add team badge
teamSchema.methods.addTeamBadge = function (badgeData) {
  const existingBadge = this.teamBadges.find(
    (badge) => badge.name === badgeData.name
  );
  if (!existingBadge) {
    this.teamBadges.push({
      ...badgeData,
      earnedAt: new Date(),
    });
  }
  return this;
};

export default mongoose.model("Team", teamSchema);
