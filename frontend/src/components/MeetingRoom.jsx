import React, { useState, useEffect } from "react";
import { Play, Pause, SkipForward, Trophy, Clock } from "lucide-react";
import Timer from "./Timer";
import apiService from "../services/api";

const MeetingRoom = ({ team, onComplete }) => {
  const [currentMemberIndex, setCurrentMemberIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    // Initialiser les participants
    setParticipants(
      team.members.map((member) => ({
        ...member,
        speakingTime: 0,
        score: 0,
        order: team.members.indexOf(member) + 1,
      }))
    );
  }, [team]);

  const currentMember = participants[currentMemberIndex];

  const handleNext = async () => {
    if (currentMemberIndex < participants.length - 1) {
      setCurrentMemberIndex((prev) => prev + 1);
    } else {
      // Fin du standup
      await completeStandup();
    }
  };

  const completeStandup = async () => {
    setIsRunning(false);

    // Calculer les scores
    const scoredParticipants = participants.map((p) => ({
      ...p,
      score: calculateScore(p.speakingTime),
    }));

    // Sauvegarder en DB
    const meetingData = {
      teamId: team._id,
      participants: scoredParticipants,
      totalDuration: totalTime,
      status: "completed",
    };

    await apiService.completeStandup(meetingData);
    onComplete(scoredParticipants);
  };

  const calculateScore = (timeInSeconds) => {
    // Logique de scoring basée sur le temps
    if (timeInSeconds <= 60) return 100;
    if (timeInSeconds <= 90) return 80;
    if (timeInSeconds <= 120) return 60;
    return Math.max(20, 100 - timeInSeconds);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      {/* Header avec équipe */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">{team.name}</h1>
        <p className="text-gray-600">Daily Standup en cours</p>
      </div>

      {/* Membre actuel */}
      <div className="text-center mb-8">
        <img
          src={currentMember?.avatar}
          alt={currentMember?.name}
          className="w-24 h-24 rounded-full mx-auto mb-4"
        />
        <h2 className="text-2xl font-semibold">{currentMember?.name}</h2>
        <p className="text-gray-600">{currentMember?.title}</p>
      </div>

      {/* Timer principal */}
      <div className="flex justify-center mb-8">
        <Timer
          isRunning={isRunning}
          onTimeUpdate={(time) => {
            setTotalTime((prev) => prev + 1);
            setParticipants((prev) =>
              prev.map((p, idx) =>
                idx === currentMemberIndex ? { ...p, speakingTime: time } : p
              )
            );
          }}
        />
      </div>

      {/* Contrôles */}
      <div className="flex justify-center space-x-4 mb-8">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          {isRunning ? <Pause size={20} /> : <Play size={20} />}
          <span className="ml-2">{isRunning ? "Pause" : "Start"}</span>
        </button>

        <button
          onClick={handleNext}
          className="flex items-center px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          <SkipForward size={20} />
          <span className="ml-2">
            {currentMemberIndex < participants.length - 1 ? "Next" : "Finish"}
          </span>
        </button>
      </div>

      {/* Progress des membres */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {participants.map((member, index) => (
          <div
            key={member._id}
            className={`p-4 rounded-lg border-2 ${
              index === currentMemberIndex
                ? "border-blue-500 bg-blue-50"
                : index < currentMemberIndex
                ? "border-green-500 bg-green-50"
                : "border-gray-300 bg-gray-50"
            }`}
          >
            <div className="flex items-center space-x-3">
              <img
                src={member.avatar}
                alt={member.name}
                className="w-12 h-12 rounded-full"
              />
              <div>
                <h3 className="font-semibold">{member.name}</h3>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock size={16} className="mr-1" />
                  {Math.floor(member.speakingTime / 60)}:
                  {(member.speakingTime % 60).toString().padStart(2, "0")}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MeetingRoom;
