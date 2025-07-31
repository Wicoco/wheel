import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    title: {
      type: String,
      default: "Membre équipe",
      trim: true,
    },
    slackUserId: {
      type: String,
      required: true,
      unique: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    // Stats de performance
    totalMeetings: {
      type: Number,
      default: 0,
    },
    averageTime: {
      type: Number,
      default: 0,
    },
    perfectStandups: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index pour performance
memberSchema.index({ slackUserId: 1, teamId: 1 });

const Member = mongoose.model("Member", memberSchema);

export default Member;
