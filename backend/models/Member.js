import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  // Slack Integration (source of truth)
  slackUserId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  }, // display_name from Slack
  avatar: {
    type: String,
    required: true,
  }, // profile.image_512 or image_192
  title: {
    type: String,
    default: "Developer",
    trim: true,
  }, // profile.title from Slack
  realName: {
    type: String,
    trim: true,
  }, // real_name from Slack
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },

  // Team association
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    required: true,
    index: true,
  },

  // Performance statistics
  totalStandups: {
    type: Number,
    default: 0,
  },
  totalSpeakingTime: {
    type: Number,
    default: 0,
  }, // in seconds
  averageTime: {
    type: Number,
    default: 0,
  }, // in seconds
  bestTime: {
    type: Number,
    default: 0,
  }, // shortest time in seconds
  totalScore: {
    type: Number,
    default: 0,
  },
  averageScore: {
    type: Number,
    default: 0,
  },

  // Engagement metrics
  streak: {
    type: Number,
    default: 0,
  }, // consecutive standup days
  longestStreak: {
    type: Number,
    default: 0,
  },
  attendanceRate: {
    type: Number,
    default: 100,
    min: 0,
    max: 100,
  }, // percentage

  // Achievement system
  badges: [
    {
      name: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
      icon: {
        type: String,
        default: "🏆",
      },
      earnedAt: {
        type: Date,
        default: Date.now,
      },
      category: {
        type: String,
        enum: [
          "speed",
          "consistency",
          "participation",
          "leadership",
          "special",
        ],
        default: "participation",
      },
    },
  ],

  // Preferences
  targetSpeakingTime: {
    type: Number,
    default: 90,
    min: 30,
    max: 300,
  }, // in seconds
  notificationsEnabled: {
    type: Boolean,
    default: true,
  },

  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  lastSync: {
    type: Date,
    default: Date.now,
  }, // last Slack profile sync

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
});

// Indexes for performance
memberSchema.index({ teamId: 1, isActive: 1 });
memberSchema.index({ totalScore: -1 });
memberSchema.index({ streak: -1 });

// Pre-save middleware to update calculated fields
memberSchema.pre("save", function (next) {
  this.updatedAt = new Date();

  // Calculate averages
  if (this.totalStandups > 0) {
    this.averageTime = Math.floor(this.totalSpeakingTime / this.totalStandups);
    this.averageScore = Math.floor(this.totalScore / this.totalStandups);
  }

  // Update longest streak
  if (this.streak > this.longestStreak) {
    this.longestStreak = this.streak;
  }

  next();
});

// Virtual for performance level
memberSchema.virtual("performanceLevel").get(function () {
  if (this.averageScore >= 90) return "Excellent";
  if (this.averageScore >= 80) return "Good";
  if (this.averageScore >= 70) return "Average";
  if (this.averageScore >= 60) return "Needs Improvement";
  return "Beginner";
});

// Virtual for speaking time in readable format
memberSchema.virtual("averageTimeFormatted").get(function () {
  const minutes = Math.floor(this.averageTime / 60);
  const seconds = this.averageTime % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
});

// Method to add a badge
memberSchema.methods.addBadge = function (badgeData) {
  // Check if badge already exists
  const existingBadge = this.badges.find(
    (badge) => badge.name === badgeData.name
  );
  if (!existingBadge) {
    this.badges.push(badgeData);
  }
  return this;
};

// Method to update stats after a standup
memberSchema.methods.updateStandupStats = function (speakingTime, score) {
  this.totalStandups += 1;
  this.totalSpeakingTime += speakingTime;
  this.totalScore += score;
  this.lastStandup = new Date();

  // Update best time if applicable (shortest meaningful time)
  if (
    speakingTime > 0 &&
    (this.bestTime === 0 || speakingTime < this.bestTime)
  ) {
    this.bestTime = speakingTime;
  }

  return this;
};

export default mongoose.model("Member", memberSchema);
