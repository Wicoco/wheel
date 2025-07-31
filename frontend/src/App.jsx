import { useState, useEffect } from "react";
import axios from "axios";
import Dashboard from "./components/Dashboard";
import CreateTeam from "./components/CreateTeam";
import MeetingRoom from "./components/MeetingRoom";

const API_BASE = "/api";

function App() {
  const [currentView, setCurrentView] = useState("dashboard");
  const [teams, setTeams] = useState([]);
  const [currentMeeting, setCurrentMeeting] = useState(null);
  const [loading, setLoading] = useState(false);

  // Charger les équipes
  const loadTeams = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/teams`);
      setTeams(response.data);
    } catch (error) {
      console.error("Erreur chargement équipes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Créer une équipe
  const createTeam = async (teamData) => {
    try {
      const response = await axios.post(`${API_BASE}/teams`, teamData);
      setTeams([...teams, response.data]);
      setCurrentView("dashboard");
      return response.data;
    } catch (error) {
      console.error("Erreur création équipe:", error);
      throw error;
    }
  };

  // Démarrer meeting
  const startMeeting = async (teamId) => {
    try {
      const response = await axios.post(`${API_BASE}/meetings`, { teamId });
      setCurrentMeeting(response.data);
      setCurrentView("meeting");
      return response.data;
    } catch (error) {
      console.error("Erreur démarrage meeting:", error);
      throw error;
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1
              className="text-2xl font-bold text-gray-900 cursor-pointer"
              onClick={() => setCurrentView("dashboard")}
            >
              🎮 Standup Gamifier
            </h1>
            <nav className="space-x-4">
              <button
                onClick={() => setCurrentView("dashboard")}
                className={`px-3 py-2 rounded ${
                  currentView === "dashboard"
                    ? "bg-primary text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView("create-team")}
                className={`px-3 py-2 rounded ${
                  currentView === "create-team"
                    ? "bg-primary text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Nouvelle Équipe
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {currentView === "dashboard" && (
          <Dashboard
            teams={teams}
            loading={loading}
            onStartMeeting={startMeeting}
            onRefresh={loadTeams}
          />
        )}

        {currentView === "create-team" && (
          <CreateTeam
            onSubmit={createTeam}
            onCancel={() => setCurrentView("dashboard")}
          />
        )}

        {currentView === "meeting" && currentMeeting && (
          <MeetingRoom
            meeting={currentMeeting}
            onEnd={() => {
              setCurrentView("dashboard");
              setCurrentMeeting(null);
              loadTeams();
            }}
          />
        )}
      </main>
    </div>
  );
}

export default App;
