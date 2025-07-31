const API_BASE = "http://localhost:5000/api";

class ApiService {
  // Test connexion Slack
  async testSlackConnection() {
    const response = await fetch(`${API_BASE}/slack/test`);
    return response.json();
  }

  // Récupérer membres d'un channel Slack
  async getChannelMembers(channelId) {
    const response = await fetch(
      `${API_BASE}/slack/channel/${channelId}/members`
    );
    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${await response.text()}`);
    }
    return response.json();
  }

  // Récupérer profil utilisateur Slack
  async getSlackUser(userId) {
    const response = await fetch(`${API_BASE}/slack/user/${userId}`);
    return response.json();
  }

  // Créer équipe avec membres Slack
  async createTeamFromSlack(teamData) {
    const response = await fetch(`${API_BASE}/teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(teamData),
    });
    return response.json();
  }

  // Récupérer toutes les équipes
  async getTeams() {
    const response = await fetch(`${API_BASE}/teams`);
    return response.json();
  }

  // Récupérer une équipe par ID
  async getTeam(teamId) {
    const response = await fetch(`${API_BASE}/teams/${teamId}`);
    return response.json();
  }
}

export default new ApiService();
