import logger from "../../utils/logger";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

export interface ConversationContext {
  userId: number;
  messages: ConversationMessage[];
  systemPrompt?: string;
}

export interface AIResponse {
  message: string;
  confidence?: number;
  suggestedActions?: string[];
  metadata?: Record<string, unknown>;
}

// Mock AI service - replace with actual AI implementation
export const generateAIResponse = async (
  context: ConversationContext
): Promise<AIResponse> => {
  try {
    const lastMessage = context.messages[context.messages.length - 1];

    if (!lastMessage || lastMessage.role !== "user") {
      throw new Error("Invalid conversation context");
    }

    const userQuery = lastMessage.content;

    // Simple keyword-based responses for demo
    let response = "";
    const lowerQuery = userQuery.toLowerCase();

    if (lowerQuery.includes("pfe") || lowerQuery.includes("projet")) {
      response =
        "Le PFE (Projet de Fin d'Études) est un projet académique important. Vous pouvez consulter les sujets disponibles, soumettre votre groupe et suivre la progression. Avez-vous des questions spécifiques sur une étape du PFE?";
    } else if (
      lowerQuery.includes("document") ||
      lowerQuery.includes("fichier")
    ) {
      response =
        "Les documents sont disponibles dans la section Documents. Vous pouvez télécharger des guides, des modèles, et d'autres ressources utiles pour vos études.";
    } else if (lowerQuery.includes("demande") || lowerQuery.includes("request")) {
      response =
        "Vous pouvez créer une demande dans la section Requêtes. Remplissez le formulaire avec les détails nécessaires et soumettez votre demande pour approbation.";
    } else if (lowerQuery.includes("note") || lowerQuery.includes("grade")) {
      response =
        "Vos notes et résultats académiques sont consultables dans votre tableau de bord. Veuillez contacter votre enseignant si vous avez des questions concernant une note.";
    } else {
      response =
        "Je suis un assistant IA pour vous aider avec les informations académiques. Vous pouvez me poser des questions sur le PFE, les documents, les demandes, les notes, ou d'autres sujets académiques.";
    }

    logger.info(`AI response generated for user ${context.userId}`);

    return {
      message: response,
      confidence: 0.85,
      suggestedActions: ["Voir plus d'informations", "Poser une autre question"],
    };
  } catch (error) {
    logger.error("Error generating AI response:", error);
    throw new Error("Failed to generate AI response");
  }
};

export const analyzeUserQuery = async (query: string): Promise<{
  intent: string;
  entities: string[];
  suggestedActions: string[];
}> => {
  try {
    // Simple intent detection based on keywords
    const intents: Record<string, string> = {
      pfe: "query_pfe",
      document: "query_documents",
      demande: "manage_requests",
      note: "query_grades",
      discipline: "query_discipline",
      aide: "request_help",
    };

    let detectedIntent = "general_query";
    const entities: string[] = [];

    for (const [keyword, intent] of Object.entries(intents)) {
      if (query.toLowerCase().includes(keyword)) {
        detectedIntent = intent;
        entities.push(keyword);
      }
    }

    const suggestedActions = getSuggestedActionsForIntent(detectedIntent);

    return {
      intent: detectedIntent,
      entities,
      suggestedActions,
    };
  } catch (error) {
    logger.error("Error analyzing user query:", error);
    throw error;
  }
};

const getSuggestedActionsForIntent = (intent: string): string[] => {
  const actions: Record<string, string[]> = {
    query_pfe: [
      "Voir les sujets PFE",
      "Consulter mon groupe",
      "Planifier la défense",
    ],
    query_documents: [
      "Parcourir les documents",
      "Télécharger un guide",
      "Créer une demande de document",
    ],
    manage_requests: [
      "Créer une nouvelle demande",
      "Voir mes demandes",
      "Suivre l'approbation",
    ],
    query_grades: ["Voir mes notes", "Consulter les détails", "Contacter le professeur"],
    query_discipline: [
      "Consulter les cas",
      "Voir l'historique",
      "Contacter le doyen",
    ],
    request_help: ["Consulter la FAQ", "Contacter le support", "Voir la documentation"],
  };

  return actions[intent] || [
    "Poser une autre question",
    "Retourner à l'accueil",
  ];
};

export const storeConversation = async (
  userId: number,
  _messages: ConversationMessage[]
): Promise<void> => {
  try {
    // Store conversation to database or file
    logger.info(`Conversation stored for user ${userId}`);
  } catch (error) {
    logger.error("Error storing conversation:", error);
    throw error;
  }
};

export const buildSystemPrompt = (userRole: string): string => {
  const prompts: Record<string, string> = {
    etudiant: `You are a helpful academic assistant for a student. You provide information about PFE projects, documents, academic requests, grades, and discipline cases. 
    Always be supportive and guide students to the appropriate resources or personnel for specific issues.
    Respond in French unless the student uses English.`,
    enseignant: `You are a helpful academic assistant for a teacher. You provide information about teaching responsibilities, PFE supervision, student management, and administrative tasks.
    Always be professional and guide teachers to the appropriate resources or administrative departments.
    Respond in French unless the teacher uses English.`,
    admin: `You are a helpful administrative assistant. You provide information about system management, user administration, reports, and institutional policies.
    Always be professional and detailed in your responses.
    Respond in French unless the administrator uses English.`,
  };

  return (
    prompts[userRole] ||
    "You are a helpful academic assistant. Respond helpfully and professionally."
  );
};

export const validateUserQuery = (query: string): boolean => {
  if (!query || query.trim().length === 0) return false;
  if (query.trim().length > 5000) return false;
  return true;
};
