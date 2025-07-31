import React, { useState, useEffect } from "react";
import { Plus, Users, AlertCircle } from "lucide-react";
import SlackChannelImporter from "../components/Team/SlackChannelImporter";
import TeamCard from "../components/Team/TeamCard";
import apiService from "../services/api";

const TeamsPage = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showImporter, setShowImporter] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);

  // Charger les équipes
  useEffect(() => {
    loadTeams();
    checkSlackConnection();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const data = await apiService.getTeams();
      setTeams(data.teams || []);
    } catch (error) {
      setError("Impossible de charger les équipes");
      console.error("Erreur chargement équipes:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkSlackConnection = async () => {
    try {
      const status = await apiService.testSlackConnection();
      setSlackConnected(status.connected);
    } catch (error) {
      setSlackConnected(false);
      console.error("Erreur test Slack:", error);
    }
  };

  const handleTeamCreated = (newTeam) => {
    setTeams((prev) => [...prev, newTeam]);
    setShowImporter(false);
  };

  const handleSelectTeam = (team) => {
    // Navigation vers la page de standup
    window.location.href = `/standup/${team._id}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes Équipes</h1>
          <p className="text-gray-600">
            Gérez vos équipes et démarrez vos standups gamifiés
          </p>
        </div>

        {/* Status Slack */}
        {!slackConnected && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-orange-800 font-medium">Slack non connecté</p>
              <p className="text-orange-700 text-sm">
                Vérifiez votre token Slack pour importer des équipes
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mb-8">
          <button
            onClick={() => setShowImporter(!showImporter)}
            disabled={!slackConnected}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            Importer depuis Slack
          </button>
        </div>

        {/* Importeur Slack */}
        {showImporter && slackConnected && (
          <div className="mb-8">
            <SlackChannelImporter onTeamCreated={handleTeamCreated} />
          </div>
        )}

        {/* Liste des équipes */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des équipes...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={loadTeams}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Réessayer
            </button>
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucune équipe trouvée
            </h3>
            <p className="text-gray-600 mb-6">
              Importez votre première équipe depuis Slack pour commencer
            </p>
            {slackConnected && (
              <button
                onClick={() => setShowImporter(true)}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-medium"
              >
                Créer ma première équipe
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <TeamCard
                key={team._id}
                team={team}
                onSelect={handleSelectTeam}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamsPage;
