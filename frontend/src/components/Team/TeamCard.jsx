import React from "react";
import { Users, Clock, Trophy, Settings } from "lucide-react";

const TeamCard = ({ team, onSelect, onSettings }) => {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {team.name}
          </h3>

          {onSettings && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSettings(team);
              }}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>

        {team.description && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {team.description}
          </p>
        )}
      </div>

      {/* Membres avec avatars */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            {team.members?.length || 0} membres
          </span>
        </div>

        {/* Avatars des membres */}
        {team.members && team.members.length > 0 && (
          <div className="flex -space-x-2 mb-4">
            {team.members.slice(0, 5).map((member, index) => (
              <div
                key={member._id || index}
                className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-gray-200"
                title={member.name}
              >
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-purple-100 text-purple-600 text-xs font-semibold">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))}

            {team.members.length > 5 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center">
                <span className="text-xs text-gray-600 font-medium">
                  +{team.members.length - 5}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-sm font-semibold text-blue-900">
              {team.totalMeetings || 0}
            </p>
            <p className="text-xs text-blue-700">Standups</p>
          </div>

          <div className="bg-yellow-50 rounded-lg p-3">
            <div className="flex items-center justify-center gap-1 text-yellow-600 mb-1">
              <Trophy className="w-4 h-4" />
            </div>
            <p className="text-sm font-semibold text-yellow-900">
              {team.averageScore || 0}
            </p>
            <p className="text-xs text-yellow-700">Score moyen</p>
          </div>
        </div>
      </div>

      {/* Footer - Bouton action */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <button
          onClick={() => onSelect(team)}
          className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors font-medium"
        >
          Démarrer Standup
        </button>
      </div>
    </div>
  );
};

export default TeamCard;
