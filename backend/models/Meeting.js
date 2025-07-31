import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema({
  // Core identifiers
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    required: true,
  },
  name: {
    type: String,
    default: "Daily Standup",
  },

  // Timing information
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
  },
  totalDuration: {
    type: Number,
    default: 0,
  }, // in seconds

  // Participants and their performance
  participants: [
    {
      memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Member",
        required: true,
      },
      speakingTime: {
        type: Number,
        default: 0,
      }, // in seconds
      order: {
        type: Number,
        required: true,
      }, // speaking order (1, 2, 3...)
      score: {
        type: Number,
        default: 0,
      }, // calculated performance score
      feedback: {
        type: String,
        maxlength: 500,
      },
    },
  ],

  // Meeting results
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Member",
  },
  teamScore: {
    type: Number,
    default: 0,
  },
  averageSpeakingTime: {
    type: Number,
    default: 0,
  },

  // Meeting status
  status: {
    type: String,
    enum: ["planned", "in_progress", "completed", "cancelled"],
    default: "planned",
  },

  // Additional metadata
  notes: {
    type: String,
    maxlength: 1000,
  },
  slackMessageId: String, // for Slack integration

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
  },
});

// Indexes for better query performance
meetingSchema.index({ teamId: 1, createdAt: -1 });
meetingSchema.index({ status: 1 });

// Pre-save middleware to calculate derived fields
meetingSchema.pre("save", function (next) {
  if (this.participants && this.participants.length > 0) {
    // Calculate total duration if not set
    if (!this.totalDuration && this.startTime && this.endTime) {
      this.totalDuration = Math.floor((this.endTime - this.startTime) / 1000);
    }

    // Calculate average speaking time
    const totalSpeakingTime = this.participants.reduce(
      (sum, p) => sum + p.speakingTime,
      0
    );
    this.averageSpeakingTime = Math.floor(
      totalSpeakingTime / this.participants.length
    );

    // Determine winner (highest score)
    const topPerformer = this.participants.reduce((best, current) =>
      current.score > best.score ? current : best
    );
    this.winner = topPerformer.memberId;
  }

  next();
});

// Virtual for duration in minutes
meetingSchema.virtual("durationInMinutes").get(function () {
  return this.totalDuration ? Math.floor(this.totalDuration / 60) : 0;
});

// Virtual for human-readable status
meetingSchema.virtual("statusDisplay").get(function () {
  const statusMap = {
    planned: "Scheduled",
    in_progress: "Live",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return statusMap[this.status] || this.status;
});

export default mongoose.model("Meeting", meetingSchema);
