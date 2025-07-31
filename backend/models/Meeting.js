import mongoose from "mongoose";

const participantSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Member",
    required: true,
  },
  timeSpent: {
    type: Number,
    default: 0, // en secondes
  },
  status: {
    type: String,
    enum: ["waiting", "speaking", "completed", "overtime"],
    default: "waiting",
  },
  notes: {
    yesterday: String,
    today: String,
    blockers: String,
  },
  startTime: Date,
  endTime: Date,
});

const meetingSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    title: {
      type: String,
      default: "Daily Standup",
    },
    status: {
      type: String,
      enum: ["waiting", "in_progress", "completed", "cancelled"],
      default: "waiting",
    },
    participants: [participantSchema],
    currentSpeaker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    totalDuration: {
      type: Number,
      default: 0, // en secondes
    },
    summary: {
      totalParticipants: Number,
      averageTime: Number,
      overtimeCount: Number,
      perfectStandups: Number,
    },
    slackMessageId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index pour les requêtes fréquentes
meetingSchema.index({ teamId: 1, createdAt: -1 });
meetingSchema.index({ status: 1 });

// Méthode pour calculer le résumé
meetingSchema.methods.calculateSummary = function () {
  const participants = this.participants;
  const totalParticipants = participants.length;
  const totalTime = participants.reduce((sum, p) => sum + p.timeSpent, 0);
  const averageTime = totalParticipants > 0 ? totalTime / totalParticipants : 0;
  const overtimeCount = participants.filter(
    (p) => p.status === "overtime"
  ).length;
  const perfectStandups = participants.filter(
    (p) => p.timeSpent <= 120 && p.timeSpent > 0
  ).length;

  this.summary = {
    totalParticipants,
    averageTime: Math.round(averageTime),
    overtimeCount,
    perfectStandups,
  };

  return this;
};

const Meeting = mongoose.model("Meeting", meetingSchema);

export default Meeting;
