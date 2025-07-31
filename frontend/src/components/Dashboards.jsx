import { useState } from "react";
import TeamCard from "./TeamCard";

function Dashboard({ teams, loading, onStartMeeting, onRefresh }) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600 mt-1">Gérez vos équipes et meetings</p>
        </div>
        <button onClick={onRefresh} className="btn-primary">
          🔄 Actualiser
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            Aucune équipe
          </h3>
          <p className="text-gray-600 mb-6">
            Créez votre première équipe pour commencer !
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <TeamCard
              key={team._id}
              team={team}
              onStartMeeting={onStartMeeting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
