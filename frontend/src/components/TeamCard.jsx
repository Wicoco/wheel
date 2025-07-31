import { useState } from "react";

function TeamCard({ team, onStartMeeting }) {
  const [starting, setStarting] = useState(false);

  const handleStartMeeting = async () => {
    try {
      setStarting(true);
      await onStartMeeting(team._id);
    } catch (error) {
      alert("Erreur lors du démarrage du meeting");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
          <p className="text-sm text-gray-600">{team.members.length} membres</p>
        </div>
        <div className="text-2xl">👥</div>
      </div>

      {/* Membres */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Membres:</p>
        <div className="space-y-1">
          {team.members.map((member, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-gray-600">{member.name}</span>
              <div className="flex items-center space-x-1">
                <span className="text-lg">⭐</span>
                <span className="font-medium text-gray-900">
                  {member.points || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-center">
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-lg font-bold text-gray-900">
            {team.totalMeetings || 0}
          </div>
          <div className="text-xs text-gray-600">Meetings</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-lg font-bold text-gray-900">
            {team.avgDuration || "0m"}
          </div>
          <div className="text-xs text-gray-600">Durée moy.</div>
        </div>
      </div>

      {/* Actions */}
      <button
        onClick={handleStartMeeting}
        disabled={starting || team.members.length === 0}
        className="btn-success w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {starting ? "🔄 Démarrage..." : "🚀 Démarrer Meeting"}
      </button>
    </div>
  );
}

export default TeamCard;
