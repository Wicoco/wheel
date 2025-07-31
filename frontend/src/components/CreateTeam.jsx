import { useState } from "react";

function CreateTeam({ onSubmit, onCancel }) {
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState([""]);
  const [loading, setLoading] = useState(false);

  const addMember = () => {
    setMembers([...members, ""]);
  };

  const removeMember = (index) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const updateMember = (index, value) => {
    const newMembers = [...members];
    newMembers[index] = value;
    setMembers(newMembers);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validMembers = members.filter((name) => name.trim() !== "");

    if (!teamName.trim()) {
      alert("Nom de l'équipe requis");
      return;
    }

    if (validMembers.length === 0) {
      alert("Au moins un membre requis");
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        name: teamName.trim(),
        members: validMembers.map((name) => ({
          name: name.trim(),
          points: 0,
        })),
      });
    } catch (error) {
      alert("Erreur lors de la création de l'équipe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            🆕 Nouvelle Équipe
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nom de l'équipe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom de l'équipe
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="input"
              placeholder="Ex: Équipe Frontend"
              required
            />
          </div>

          {/* Membres */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Membres de l'équipe
            </label>
            <div className="space-y-3">
              {members.map((member, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={member}
                    onChange={(e) => updateMember(index, e.target.value)}
                    className="input flex-1"
                    placeholder={`Membre ${index + 1}`}
                  />
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMember(index)}
                      className="text-red-500 hover:text-red-700 w-8 h-8 flex items-center justify-center"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addMember}
              className="mt-3 text-primary hover:text-blue-700 text-sm font-medium"
            >
              ➕ Ajouter un membre
            </button>
          </div>

          {/* Actions */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="btn flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading}
            >
              {loading ? "🔄 Création..." : "✅ Créer l'équipe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateTeam;
