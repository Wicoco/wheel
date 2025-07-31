import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    points: {
      type: Number,
      default: 0,
    },
    totalMeetings: {
      type: Number,
      default: 0,
    },
    averageTime: {
      type: Number,
      default: 0,
    },
    violations: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    members: [memberSchema],
    totalMeetings: {
      type: Number,
      default: 0,
    },
    averageDuration: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: String,
      default: "System",
    },
  },
  { timestamps: true }
);

// Méthodes du modèle
teamSchema.methods.addPoints = function (memberId, points) {
  const member = this.members.id(memberId);
  if (member) {
    member.points += points;
    return this.save();
  }
  throw new Error("Membre introuvable");
};

teamSchema.methods.updateMemberStats = function (
  memberId,
  timeSpent,
  hasViolation = false
) {
  const member = this.members.id(memberId);
  if (member) {
    member.totalMeetings += 1;
    member.averageTime =
      (member.averageTime * (member.totalMeetings - 1) + timeSpent) /
      member.totalMeetings;
    if (hasViolation) member.violations += 1;
    return this.save();
  }
  throw new Error("Membre introuvable");
};

export default mongoose.model("Team", teamSchema);
