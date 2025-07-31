import { useState, useEffect } from "react";
import axios from "axios";
import Timer from "./Timer";

function MeetingRoom({ meeting, onEnd }) {
  const [currentMemberIndex, setCurrentMemberIndex] = useState(0);
  const [memberTimes, setMemberTimes] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [violations, setViolations] = useState([]);

  const currentMember = meeting.team.members[currentMemberIndex];
  const isLastMember = currentMemberIndex === meeting.team.members.length - 1;

  // Démarrer le timer pour un membre
  const startMemberTimer = () => {
    setIsRunning(true);
    setCurrentTime(0);
  };

  // Passer au membre suivant
  const nextMember = () => {
    // Sauvegarder le temps du membre actuel
    const memberId = currentMember._id;
    setMemberTimes((prev) => ({
      ...prev,
      [memberId]: currentTime,
    }));

    // Vérifier les violations
    if (currentTime > 120) {
      // Plus de 2 minutes
      setViolations((prev) => [
        ...prev,
        {
          member: currentMember.name,
          time: currentTime,
          type: "overtime",
        },
      ]);
    }

    setIsRunning(false);

    if (isLastMember) {
      // Fin du meeting
      finishMeeting();
    } else {
      // Membre suivant
      setCurrentMemberIndex((prev) => prev + 1);
      setCurrentTime(0);
    }
  };

  // Terminer le meeting
  const finishMeeting = async () => {
    try {
      const totalTime = Object.values(memberTimes).reduce(
        (sum, time) => sum + time,
        currentTime
      );

      await axios.put(`/api/meetings/${meeting._id}`, {
        status: "completed",
        duration: totalTime,
        memberTimes,
        violations,
      });

      // Calculer et attribuer les points
      await calculatePoints();

      onEnd();
    } catch (error) {
      console.error("Erreur fin meeting:", error);
    }
  };

  // Calculer les points
  const calculatePoints = async () => {
    try {
      const pointsData = meeting.team.members.map((member) => {
        const memberTime = memberTimes[member._id] || 0;
        let points = 0;

        // Points basés sur le temps
        if (memberTime <= 60) points += 10; // ≤ 1 min = 10 pts
        else if (memberTime <= 90) points += 7; // ≤ 1.5 min = 7 pts
        else if (memberTime <= 120) points += 5; // ≤ 2 min = 5 pts
        else points += 2; // > 2 min = 2 pts

        // Bonus pour finir en premier
        const times = Object.values(memberTimes);
        if (times.length > 0 && memberTime === Math.min(...times)) {
          points += 5;
        }

        return {
          memberId: member._id,
          points,
        };
      });

      await axios.post(`/api/teams/${meeting.team._id}/points`, { pointsData });
    } catch (error) {
      console.error("Erreur calcul points:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Meeting */}
      <div className="card mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              🎯 Meeting en cours
            </h2>
            <p className="text-gray-600">
              Équipe: {meeting.team.name} • Membre {currentMemberIndex + 1}/
              {meeting.team.members.length}
            </p>
          </div>
          <button onClick={onEnd} className="text-red-500 hover:text-red-700">
            ❌ Terminer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timer Principal */}
        <div className="lg:col-span-2">
          <div className="card text-center">
            <h3 className="text-xl font-semibold mb-4">
              🎤 C'est au tour de:{" "}
              <span className="text-primary">{currentMember.name}</span>
            </h3>

            <Timer
              time={currentTime}
              isRunning={isRunning}
              onTimeUpdate={setCurrentTime}
            />

            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
              <h4 className="font-semibold text-blue-900 mb-2">
                📋 Questions Standup:
              </h4>
              <ul className="space-y-1 text-blue-800 text-sm">
                <li>• Qu'est-ce que j'ai fait hier ?</li>
                <li>• Qu'est-ce que je vais faire aujourd'hui ?</li>
                <li>• Ai-je des blocages ?</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {!isRunning ? (
                <button
                  onClick={startMemberTimer}
                  className="btn-success w-full text-lg"
                >
                  ▶️ Commencer
                </button>
              ) : (
                <button
                  onClick={nextMember}
                  className="btn-primary w-full text-lg"
                >
                  {isLastMember ? "🏁 Terminer Meeting" : "➡️ Membre Suivant"}
                </button>
              )}
            </div>

            {/* Alerte temps */}
            {currentTime > 90 && (
              <div className="mt-4 p-3 bg-orange-100 border border-orange-200 rounded-lg">
                <p className="text-orange-800 font-medium">
                  ⚠️ Attention: Temps recommandé dépassé (1m30s)
                </p>
              </div>
            )}

            {currentTime > 120 && (
              <div className="mt-2 p-3 bg-red-100 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium">
                  🚨 Violation: Plus de 2 minutes!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Progression */}
        <div className="space-y-4">
          {/* Progression */}
          <div className="card">
            <h4 className="font-semibold mb-4">📊 Progression</h4>
            <div className="space-y-3">
              {meeting.team.members.map((member, index) => (
                <div key={member._id} className="flex items-center space-x-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index < currentMemberIndex
                        ? "bg-green-100 text-green-800"
                        : index === currentMemberIndex
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {index < currentMemberIndex ? "✓" : index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{member.name}</div>
                    {memberTimes[member._id] && (
                      <div className="text-xs text-gray-500">
                        {Math.floor(memberTimes[member._id] / 60)}:
                        {String(memberTimes[member._id] % 60).padStart(2, "0")}
                      </div>
                    )}
                  </div>
                  {index === currentMemberIndex && (
                    <div className="text-blue-500">👤</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Violations */}
          {violations.length > 0 && (
            <div className="card">
              <h4 className="font-semibold mb-4 text-red-700">⚠️ Violations</h4>
              <div className="space-y-2">
                {violations.map((violation, index) => (
                  <div
                    key={index}
                    className="text-sm bg-red-50 border border-red-200 rounded p-2"
                  >
                    <div className="font-medium text-red-800">
                      {violation.member}
                    </div>
                    <div className="text-red-600">
                      Dépassement: {Math.floor(violation.time / 60)}:
                      {String(violation.time % 60).padStart(2, "0")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MeetingRoom;
