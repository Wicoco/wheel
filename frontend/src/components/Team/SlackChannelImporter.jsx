import React, { useState } from "react";
import { Users, Slack, Plus, AlertCircle, CheckCircle } from "lucide-react";
import apiService from "../../services/api";

const SlackChannelImporter = ({ onTeamCreated }) => {
  const [channelId, setChannelId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("input"); // 'input', 'preview', 'success'

  // Récupérer les membres du channel
  const loadMembers = async () => {
    if (!channelId.trim()) {
      setError("Veuillez entrer un Channel ID");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { members: channelMembers } = await apiService.getChannelMembers(
        channelId
      );

      if (channelMembers.length === 0) {
        throw new Error("Aucun membre trouvé dans ce channel");
      }

      setMembers(channelMembers);
      setStep("preview");
    } catch (error) {
      setError(error.message);
      console.error("Erreur chargement membres:", error);
    } finally {
      setLoading(false);
    }
  };

  // Créer l'équipe avec les membres
  const createTeam = async () => {
    if (!teamName.trim()) {
      setError("Veuillez entrer un nom d'équipe");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const teamData = {
        name: teamName.trim(),
        slackChannelId: channelId,
        members: members.map((member) => ({
          name: member.name,
          avatar: member.avatar,
          title: member.title,
          slackUserId: member.slackUserId,
        })),
      };

      const newTeam = await apiService.createTeamFromSlack(teamData);
      setStep("success");

      // Callback pour le parent
      if (onTeamCreated) {
        onTeamCreated(newTeam);
      }
    } catch (error) {
      setError(error.message);
      console.error("Erreur création équipe:", error);
    } finally {
      setLoading(false);
    }
  };

  // Reset du formulaire
  const reset = () => {
    setChannelId("");
    setTeamName("");
    setMembers([]);
    setError("");
    setStep("input");
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Slack className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Importer équipe depuis Slack
          </h2>
          <p className="text-gray-600">
            Créez une équipe à partir d'un channel Slack existant
          </p>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Étape 1: Saisie Channel ID */}
      {step === "input" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Channel ID Slack
            </label>
            <input
              type="text"
              placeholder="Ex: C1234567890"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              💡 Trouvez le Channel ID dans les paramètres du channel {'>'} "À
              propos" {'>'} ID
            </p>
          </div>

          <button
            onClick={loadMembers}
            disabled={loading || !channelId.trim()}
            className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Chargement...
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                Charger les membres
              </>
            )}
          </button>
        </div>
      )}

      {/* Étape 2: Aperçu des membres */}
      {step === "preview" && (
        <div className="space-y-6">
          {/* Nom d'équipe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom de l'équipe
            </label>
            <input
              type="text"
              placeholder="Ex: Équipe Frontend"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={loading}
            />
          </div>

          {/* Liste des membres */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Membres trouvés ({members.length})
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.slackUserId}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-purple-100 text-purple-600 font-semibold">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {member.name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {member.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
              disabled={loading}
            >
              Retour
            </button>
            <button
              onClick={createTeam}
              disabled={loading || !teamName.trim()}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Création...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Créer l'équipe
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Étape 3: Succès */}
      {step === "success" && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Équipe créée avec succès !
          </h3>

          <p className="text-gray-600 mb-6">
            L'équipe "{teamName}" a été créée avec {members.length} membres
          </p>

          <button
            onClick={reset}
            className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700"
          >
            Créer une autre équipe
          </button>
        </div>
      )}
    </div>
  );
};

export default SlackChannelImporter;
