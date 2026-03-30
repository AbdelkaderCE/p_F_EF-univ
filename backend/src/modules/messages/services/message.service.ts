import prisma from "../../../config/database";

export type MessageMode = "unicast" | "broadcast";

interface StoredMessage {
  id: number;
  senderUserId: number;
  recipientUserId: number;
  mode: MessageMode;
  title: string | null;
  content: string;
  createdAt: Date;
}

interface UserSummary {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  roles: string[];
}

interface SendMessageInput {
  senderUserId: number;
  senderRoles: string[];
  mode: MessageMode;
  recipientUserId?: number;
  title?: string;
  content: string;
}

export class MessageServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "MessageServiceError";
    this.statusCode = statusCode;
  }
}

let nextMessageId = 1;
const store: StoredMessage[] = [];

const ADMIN_ROLES = ["admin", "vice_doyen"];
const TEACHER_ROLES = ["enseignant"];
const STUDENT_ROLES = ["etudiant", "delegue"];

const hasAnyRole = (roles: string[], candidates: string[]): boolean =>
  roles.some((role) => candidates.includes(role));

const getSenderScope = (roles: string[]): "admin" | "teacher" | "student" | null => {
  if (hasAnyRole(roles, ADMIN_ROLES)) return "admin";
  if (hasAnyRole(roles, TEACHER_ROLES)) return "teacher";
  if (hasAnyRole(roles, STUDENT_ROLES)) return "student";
  return null;
};

const mapUserSummary = (user: {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  userRoles: Array<{ role: { nom: string | null } }>;
}): UserSummary => ({
  id: user.id,
  nom: user.nom,
  prenom: user.prenom,
  email: user.email,
  roles: user.userRoles
    .map((entry) => entry.role.nom)
    .filter((value): value is string => Boolean(value)),
});

const listActiveUsers = async (): Promise<UserSummary[]> => {
  const users = await prisma.user.findMany({
    where: { status: "active" },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      userRoles: {
        include: {
          role: {
            select: { nom: true },
          },
        },
      },
    },
    orderBy: [{ prenom: "asc" }, { nom: "asc" }],
  });

  return users.map(mapUserSummary);
};

const getAllowedRecipients = (
  senderScope: "admin" | "teacher" | "student",
  senderUserId: number,
  users: UserSummary[]
): UserSummary[] => {
  const others = users.filter((user) => user.id !== senderUserId);

  if (senderScope === "admin") {
    return others;
  }

  if (senderScope === "teacher") {
    return others.filter((user) => hasAnyRole(user.roles, STUDENT_ROLES));
  }

  return others.filter((user) => hasAnyRole(user.roles, TEACHER_ROLES));
};

const buildUserMap = async (userIds: number[]): Promise<Map<number, UserSummary>> => {
  if (!userIds.length) return new Map<number, UserSummary>();

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      userRoles: {
        include: {
          role: {
            select: { nom: true },
          },
        },
      },
    },
  });

  return new Map(users.map((user) => [user.id, mapUserSummary(user)]));
};

export const getMessagingCapabilities = async (senderUserId: number, senderRoles: string[]) => {
  const senderScope = getSenderScope(senderRoles);
  if (!senderScope) {
    throw new MessageServiceError("Your account is not allowed to use messaging", 403);
  }

  const users = await listActiveUsers();
  const recipients = getAllowedRecipients(senderScope, senderUserId, users);

  let canBroadcast = true;
  if (senderScope === "student") {
    canBroadcast = false;
  }

  const broadcastLabel =
    senderScope === "admin"
      ? "All users"
      : senderScope === "teacher"
      ? "All students"
      : null;

  return {
    senderScope,
    canBroadcast,
    broadcastLabel,
    recipients,
  };
};

export const sendMessage = async (input: SendMessageInput) => {
  const senderScope = getSenderScope(input.senderRoles);
  if (!senderScope) {
    throw new MessageServiceError("Your account is not allowed to send messages", 403);
  }

  const content = String(input.content || "").trim();
  if (!content) {
    throw new MessageServiceError("Message content is required", 400);
  }

  const users = await listActiveUsers();
  const allowedRecipients = getAllowedRecipients(senderScope, input.senderUserId, users);
  const allowedById = new Map(allowedRecipients.map((user) => [user.id, user]));

  if (input.mode === "broadcast") {
    if (senderScope === "student") {
      throw new MessageServiceError("Students can only send unicast messages", 403);
    }

    const now = new Date();
    const title = input.title?.trim() || null;

    const created = allowedRecipients.map((recipient) => {
      const record: StoredMessage = {
        id: nextMessageId++,
        senderUserId: input.senderUserId,
        recipientUserId: recipient.id,
        mode: "broadcast",
        title,
        content,
        createdAt: now,
      };
      store.push(record);
      return record;
    });

    return {
      count: created.length,
      mode: "broadcast" as const,
    };
  }

  const recipientUserId = Number(input.recipientUserId);
  if (!Number.isInteger(recipientUserId) || recipientUserId <= 0) {
    throw new MessageServiceError("Valid recipientUserId is required for unicast", 400);
  }

  if (!allowedById.has(recipientUserId)) {
    throw new MessageServiceError("Recipient is not allowed for your role", 403);
  }

  const record: StoredMessage = {
    id: nextMessageId++,
    senderUserId: input.senderUserId,
    recipientUserId,
    mode: "unicast",
    title: input.title?.trim() || null,
    content,
    createdAt: new Date(),
  };

  store.push(record);

  return {
    count: 1,
    mode: "unicast" as const,
    message: record,
  };
};

export const getUserInbox = async (userId: number) => {
  const items = store
    .filter((entry) => entry.senderUserId === userId || entry.recipientUserId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const linkedUserIds = Array.from(
    new Set(items.flatMap((entry) => [entry.senderUserId, entry.recipientUserId]))
  );

  const userMap = await buildUserMap(linkedUserIds);

  return items.map((entry) => ({
    id: entry.id,
    mode: entry.mode,
    title: entry.title,
    content: entry.content,
    createdAt: entry.createdAt,
    sender: userMap.get(entry.senderUserId) || null,
    recipient: userMap.get(entry.recipientUserId) || null,
  }));
};
