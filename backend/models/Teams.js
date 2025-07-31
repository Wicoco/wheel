import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    scrumMaster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Member",
      },
    ],
    slackChannel: {
      type: String,
      default: null,
    },
    settings: {
      maxSpeakingTime: {
        type: Number,
        default: 120, // 2 minutes
      },
      allowOvertime: {
        type: Boolean,
        default: true,
      },
      autoSlackNotification: {
        type: Boolean,
        default: true,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Team = mongoose.model("Team", teamSchema);

export default Team;
