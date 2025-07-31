import { WebClient } from "@slack/web-api";

class SlackService {
  constructor() {
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
  }

  // Récupérer les infos essentielles d'un utilisateur
  async getUserProfile(userId) {
    try {
      const result = await this.client.users.info({
        user: userId,
      });

      const user = result.user;
      const profile = user.profile;

      return {
        name: profile.display_name || profile.real_name || user.name,
        avatar: profile.image_512 || profile.image_192 || profile.image_72,
        title: profile.title || "Membre équipe",
      };
    } catch (error) {
      console.error(`❌ Erreur profil Slack ${userId}:`, error);
      return {
        name: "Utilisateur inconnu",
        avatar: null,
        title: "Membre équipe",
      };
    }
  }

  // Récupérer tous les membres d'un channel avec leurs profils
  async getChannelMembers(channelId) {
    try {
      // 1. Liste des membres du channel
      const membersResult = await this.client.conversations.members({
        channel: channelId,
      });

      // 2. Récupérer les profils (en parallèle pour la performance)
      const memberProfiles = await Promise.all(
        membersResult.members
          .filter((userId) => !userId.startsWith("B")) // Exclure les bots
          .map(async (userId) => {
            const profile = await this.getUserProfile(userId);
            return {
              slackUserId: userId,
              ...profile,
            };
          })
      );

      return memberProfiles.filter(Boolean); // Enlever les null
    } catch (error) {
      console.error("❌ Erreur membres channel:", error);
      throw new Error(`Impossible de récupérer les membres: ${error.message}`);
    }
  }

  // Récupérer les infos du channel
  async getChannelInfo(channelId) {
    try {
      const result = await this.client.conversations.info({
        channel: channelId,
      });

      return {
        id: result.channel.id,
        name: result.channel.name,
        memberCount: result.channel.num_members,
      };
    } catch (error) {
      console.error("❌ Erreur infos channel:", error);
      throw new Error(`Channel non trouvé: ${error.message}`);
    }
  }

  // Test de connexion simple
  async testConnection() {
    try {
      const auth = await this.client.auth.test();
      return {
        connected: true,
        team: auth.team,
        user: auth.user,
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }
}

export default new SlackService();
