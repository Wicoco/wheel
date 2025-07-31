import mongoose from "mongoose";

const memberTimeSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  memberName: {
    type: String,
    required: true,
  },
  timeSpent: {
    type: Number,
    required: true,
    min: 0,
  },
  pointsEarned: {
    type: Number,
    default: 0,
  },
  hasViolation: {
    type: Boolean,
    default: false,
  },
});

const meetingSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    totalDuration: {
      type: Number, // en secondes
      default: 0,
    },
    memberTimes: [memberTimeSchema],
    violations: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Méthodes virtuelles
meetingSchema.virtual("duration").get(function () {
  if (this.endTime && this.startTime) {
    return Math.floor((this.endTime - this.startTime) / 1000);
  }
  return 0;
});

// Méthodes du modèle
meetingSchema.methods.completeMeeting = function (memberTimes) {
  this.status = "completed";
  this.endTime = new Date();
  this.memberTimes = memberTimes;
  this.totalDuration = this.memberTimes.reduce(
    (total, member) => total + member.timeSpent,
    0
  );
  this.violations = this.memberTimes.filter(
    (member) => member.hasViolation
  ).length;
  return this.save();
};

meetingSchema.statics.getTeamStats = function (teamId) {
  return this.aggregate([
    { $match: { team: teamId, status: "completed" } },
    {
      $group: {
        _id: "$team",
        totalMeetings: { $sum: 1 },
        averageDuration: { $avg: "$totalDuration" },
        totalViolations: { $sum: "$violations" },
        lastMeeting: { $max: "$endTime" },
      },
    },
  ]);
};

export default mongoose.model("Meeting", meetingSchema);
