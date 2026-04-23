import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import type { Collection } from "mongodb";
import { hasMongoConfig, getDbOrNull } from "./mongo";
import { seedData, seedUsers } from "./seed";
import type { BootstrapPayload, Comment, Group, GroupJoinRequest, Message, Post, User } from "./types";

type PublicUser = Omit<User, "passwordHash">;

type StoreCollections = {
  users: Collection<User>;
  groups: Collection<Group>;
  posts: Collection<Post>;
  comments: Collection<Comment>;
  messages: Collection<Message>;
  joinRequests: Collection<GroupJoinRequest>;
};

const omitPassword = ({ passwordHash, ...rest }: User): PublicUser => rest;

type MemoryState = {
  users: User[];
  groups: Group[];
  posts: Post[];
  comments: Comment[];
  messages: Message[];
  joinRequests: GroupJoinRequest[];
};

declare global {
  // eslint-disable-next-line no-var
  var __siz_memory_store: MemoryState | undefined;
}

const createMemoryState = (): MemoryState => ({
  users: seedUsers.map((user) => ({ ...user, joinedGroupIds: [...user.joinedGroupIds] })),
  groups: seedData.groups.map((group) => ({ ...group, memberIds: [...group.memberIds], pendingMemberIds: [...group.pendingMemberIds] })),
  posts: seedData.posts.map((post) => ({ ...post })),
  comments: seedData.comments.map((comment) => ({ ...comment })),
  messages: seedData.messages.map((message) => ({ ...message })),
  joinRequests: seedData.joinRequests.map((request) => ({ ...request }))
});

const memory = globalThis.__siz_memory_store ?? createMemoryState();
globalThis.__siz_memory_store = memory;
const isProduction = process.env.NODE_ENV === "production";

let seededMongo = false;
const getMongoCollections = async () => {
  const db = await getDbOrNull();
  if (!db) {
    return null;
  }

  const users = db.collection<User>("users");
  const groups = db.collection<Group>("groups");
  const posts = db.collection<Post>("posts");
  const comments = db.collection<Comment>("comments");
  const messages = db.collection<Message>("messages");
  const joinRequests = db.collection<GroupJoinRequest>("joinRequests");

  if (!seededMongo) {
    const [usersCount, groupsCount, postsCount, commentsCount, messagesCount, joinRequestsCount] = await Promise.all([
      users.countDocuments(),
      groups.countDocuments(),
      posts.countDocuments(),
      comments.countDocuments(),
      messages.countDocuments(),
      joinRequests.countDocuments()
    ]);

    if (!usersCount && !groupsCount && !postsCount && !commentsCount && !messagesCount && !joinRequestsCount) {
      await Promise.all([
        users.insertMany(seedUsers.map((user) => ({ ...user }))),
        groups.insertMany(seedData.groups.map((group) => ({ ...group }))),
        posts.insertMany(seedData.posts.map((post) => ({ ...post }))),
        comments.insertMany(seedData.comments.map((comment) => ({ ...comment }))),
        messages.insertMany(seedData.messages.map((message) => ({ ...message }))),
        joinRequests.insertMany(seedData.joinRequests.map((request) => ({ ...request })))
      ]);
    }
    seededMongo = true;
  }

  return { users, groups, posts, comments, messages, joinRequests } satisfies StoreCollections;
};

const useMongo = async () => hasMongoConfig ? await getMongoCollections() : null;
const requireMongo = async () => {
  const collections = await useMongo();
  if (collections) return collections;
  if (isProduction) {
    throw new Error("MongoDB persistence is required in production. Check MONGODB_URI and network access.");
  }
  return null;
};

const getMemoryCurrentUser = async (currentUserId?: string | null) => {
  if (!currentUserId) return null;
  const user = memory.users.find((item) => item.id === currentUserId);
  return user ? { id: user.id, username: user.username, email: user.email } : null;
};

export const bootstrap = async (currentUserId?: string | null): Promise<BootstrapPayload> => {
  const collections = await requireMongo();

  if (collections) {
    const [users, groups, posts, comments, messages, joinRequests] = await Promise.all([
      collections.users.find().sort({ createdAt: -1 }).toArray(),
      collections.groups.find().sort({ createdAt: -1 }).toArray(),
      collections.posts.find().sort({ createdAt: -1 }).toArray(),
      collections.comments.find().sort({ createdAt: -1 }).toArray(),
      collections.messages.find().sort({ createdAt: -1 }).toArray(),
      collections.joinRequests.find().sort({ createdAt: -1 }).toArray()
    ]);

    return {
      currentUser: currentUserId ? await getPublicUserById(currentUserId) : null,
      users: users.map(omitPassword),
      groups,
      posts,
      comments,
      messages,
      joinRequests
    };
  }

  return {
    currentUser: await getMemoryCurrentUser(currentUserId),
    users: memory.users.map(omitPassword),
    groups: memory.groups,
    posts: memory.posts,
    comments: memory.comments,
    messages: memory.messages,
    joinRequests: memory.joinRequests
  };
};

export const getUsers = async () => {
  const collections = await requireMongo();
  return collections ? collections.users.find().sort({ createdAt: -1 }).toArray() : memory.users;
};

export const getGroups = async () => {
  const collections = await requireMongo();
  return collections ? collections.groups.find().sort({ createdAt: -1 }).toArray() : memory.groups;
};

export const getPosts = async () => {
  const collections = await requireMongo();
  return collections ? collections.posts.find().sort({ createdAt: -1 }).toArray() : memory.posts;
};

export const getComments = async () => {
  const collections = await requireMongo();
  return collections ? collections.comments.find().sort({ createdAt: -1 }).toArray() : memory.comments;
};

export const getMessages = async () => {
  const collections = await requireMongo();
  return collections ? collections.messages.find().sort({ createdAt: -1 }).toArray() : memory.messages;
};

export const getJoinRequests = async () => {
  const collections = await requireMongo();
  return collections ? collections.joinRequests.find().sort({ createdAt: -1 }).toArray() : memory.joinRequests;
};

export const getUserById = async (id: string) => {
  const collections = await requireMongo();
  return collections ? collections.users.findOne({ id }) : memory.users.find((user) => user.id === id) ?? null;
};

export const getWritableUserById = async (id: string) => {
  const user = await getUserById(id);
  return user && !user.isLocked && !user.isDisabled ? user : null;
};

export const getUserByEmail = async (email: string) => {
  const normalized = email.toLowerCase();
  const collections = await requireMongo();
  return collections ? collections.users.findOne({ email: normalized }) : memory.users.find((user) => user.email.toLowerCase() === normalized) ?? null;
};

export const getGroupById = async (id: string) => {
  const collections = await requireMongo();
  return collections ? collections.groups.findOne({ id }) : memory.groups.find((group) => group.id === id) ?? null;
};

export const getPostById = async (id: string) => {
  const collections = await requireMongo();
  return collections ? collections.posts.findOne({ id }) : memory.posts.find((post) => post.id === id) ?? null;
};

export const getPublicUserById = async (id: string): Promise<PublicUser | null> => {
  const user = await getUserById(id);
  return user ? omitPassword(user) : null;
};

export const createUser = async (input: {
  username: string;
  email: string;
  password: string;
  bio?: string;
}) => {
  const existing = await getUserByEmail(input.email);
  if (existing) throw new Error("EMAIL_TAKEN");

  const user: User = {
    id: randomUUID(),
    username: input.username.trim(),
    email: input.email.trim().toLowerCase(),
    passwordHash: await bcrypt.hash(input.password, 10),
    joinedGroupIds: [],
    isLocked: false,
    isDisabled: false,
    bio: input.bio?.trim() || "חבר קהילה חדש ב-SIZ",
    createdAt: new Date().toISOString()
  };

  const collections = await requireMongo();
  if (collections) {
    await collections.users.insertOne(user);
  } else {
    memory.users.unshift(user);
  }
  return user;
};

export const verifyUser = async (email: string, password: string) => {
  const user = await getUserByEmail(email);
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
};

export const createGroup = async (input: {
  name: string;
  category: string;
  description: string;
  adminId: string;
  isLocked?: boolean;
  requiresApproval?: boolean;
  isDisabled?: boolean;
}) => {
  const group: Group = {
    id: randomUUID(),
    name: input.name.trim(),
    category: input.category.trim(),
    description: input.description.trim(),
    adminId: input.adminId,
    memberIds: [input.adminId],
    isLocked: Boolean(input.isLocked),
    requiresApproval: Boolean(input.requiresApproval),
    isDisabled: Boolean(input.isDisabled),
    pendingMemberIds: [],
    createdAt: new Date().toISOString()
  };

  const collections = await requireMongo();
  if (collections) {
    await Promise.all([
      collections.groups.insertOne(group),
      collections.users.updateOne({ id: input.adminId }, { $addToSet: { joinedGroupIds: group.id } })
    ]);
  } else {
    memory.groups.unshift(group);
    const admin = memory.users.find((user) => user.id === input.adminId);
    if (admin && !admin.joinedGroupIds.includes(group.id)) {
      admin.joinedGroupIds.unshift(group.id);
    }
  }
  return group;
};

export const updateGroup = async (groupId: string, updates: Partial<Pick<Group, "name" | "category" | "description" | "isLocked" | "requiresApproval" | "isDisabled">>) => {
  const collections = await requireMongo();
  if (collections) {
    await collections.groups.updateOne(
      { id: groupId },
      {
        $set: {
          ...(updates.name ? { name: updates.name.trim() } : {}),
          ...(updates.category ? { category: updates.category.trim() } : {}),
          ...(updates.description ? { description: updates.description.trim() } : {}),
          ...(typeof updates.isLocked === "boolean" ? { isLocked: updates.isLocked } : {}),
          ...(typeof updates.requiresApproval === "boolean" ? { requiresApproval: updates.requiresApproval } : {}),
          ...(typeof updates.isDisabled === "boolean" ? { isDisabled: updates.isDisabled } : {})
        }
      }
    );
    return getGroupById(groupId);
  }

  const group = memory.groups.find((item) => item.id === groupId) ?? null;
  if (!group) return null;
  Object.assign(group, {
    ...(updates.name ? { name: updates.name.trim() } : {}),
    ...(updates.category ? { category: updates.category.trim() } : {}),
    ...(updates.description ? { description: updates.description.trim() } : {}),
    ...(typeof updates.isLocked === "boolean" ? { isLocked: updates.isLocked } : {}),
    ...(typeof updates.requiresApproval === "boolean" ? { requiresApproval: updates.requiresApproval } : {}),
    ...(typeof updates.isDisabled === "boolean" ? { isDisabled: updates.isDisabled } : {})
  });
  return group;
};

export const joinGroup = async (groupId: string, userId: string) => {
  const collections = await requireMongo();
  if (collections) {
    const group = await collections.groups.findOne({ id: groupId });
    if (!group) return null;
    if (group.isDisabled) return null;
    if (group.requiresApproval) {
      await collections.groups.updateOne({ id: groupId }, { $addToSet: { pendingMemberIds: userId } });
      await collections.joinRequests.insertOne({ id: randomUUID(), groupId, userId, createdAt: new Date().toISOString() });
      return group;
    }

    await Promise.all([
      collections.groups.updateOne({ id: groupId }, { $addToSet: { memberIds: userId } }),
      collections.users.updateOne({ id: userId }, { $addToSet: { joinedGroupIds: groupId } })
    ]);
    return getGroupById(groupId);
  }

  const group = memory.groups.find((item) => item.id === groupId) ?? null;
  const user = memory.users.find((item) => item.id === userId) ?? null;
  if (!group || !user) return null;
  if (group.isDisabled) return null;
  if (group.requiresApproval) {
    if (!group.pendingMemberIds.includes(userId)) group.pendingMemberIds.unshift(userId);
    if (!memory.joinRequests.some((request) => request.groupId === groupId && request.userId === userId)) {
      memory.joinRequests.unshift({ id: randomUUID(), groupId, userId, createdAt: new Date().toISOString() });
    }
    return group;
  }
  if (!group.memberIds.includes(userId)) group.memberIds.unshift(userId);
  if (!user.joinedGroupIds.includes(groupId)) user.joinedGroupIds.unshift(groupId);
  return group;
};

export const approveJoinRequest = async (groupId: string, userId: string) => {
  const collections = await requireMongo();
  if (collections) {
    await Promise.all([
      collections.groups.updateOne({ id: groupId }, { $pull: { pendingMemberIds: userId }, $addToSet: { memberIds: userId } }),
      collections.users.updateOne({ id: userId }, { $addToSet: { joinedGroupIds: groupId } }),
      collections.joinRequests.deleteMany({ groupId, userId })
    ]);
    return getGroupById(groupId);
  }

  const group = memory.groups.find((item) => item.id === groupId) ?? null;
  const user = memory.users.find((item) => item.id === userId) ?? null;
  if (!group || !user) return null;
  group.pendingMemberIds = group.pendingMemberIds.filter((id) => id !== userId);
  if (!group.memberIds.includes(userId)) group.memberIds.unshift(userId);
  if (!user.joinedGroupIds.includes(groupId)) user.joinedGroupIds.unshift(groupId);
  memory.joinRequests = memory.joinRequests.filter((request) => !(request.groupId === groupId && request.userId === userId));
  return group;
};

export const rejectJoinRequest = async (groupId: string, userId: string) => {
  const collections = await requireMongo();
  if (collections) {
    await Promise.all([
      collections.groups.updateOne({ id: groupId }, { $pull: { pendingMemberIds: userId } }),
      collections.joinRequests.deleteMany({ groupId, userId })
    ]);
    return getGroupById(groupId);
  }

  const group = memory.groups.find((item) => item.id === groupId) ?? null;
  if (!group) return null;
  group.pendingMemberIds = group.pendingMemberIds.filter((id) => id !== userId);
  memory.joinRequests = memory.joinRequests.filter((request) => !(request.groupId === groupId && request.userId === userId));
  return group;
};

export const leaveGroup = async (groupId: string, userId: string) => {
  const collections = await requireMongo();
  if (collections) {
    await Promise.all([
      collections.groups.updateOne({ id: groupId }, { $pull: { memberIds: userId } }),
      collections.users.updateOne({ id: userId }, { $pull: { joinedGroupIds: groupId } })
    ]);
    return getGroupById(groupId);
  }

  const group = memory.groups.find((item) => item.id === groupId) ?? null;
  const user = memory.users.find((item) => item.id === userId) ?? null;
  if (!group || !user) return null;
  group.memberIds = group.memberIds.filter((id) => id !== userId);
  user.joinedGroupIds = user.joinedGroupIds.filter((id) => id !== groupId);
  return group;
};

export const deleteGroup = async (groupId: string) => {
  const collections = await requireMongo();
  if (collections) {
    const postIds = (await collections.posts.find({ groupId }).project({ id: 1 }).toArray()).map((post) => post.id);
    await Promise.all([
      collections.groups.deleteOne({ id: groupId }),
      collections.posts.deleteMany({ groupId }),
      collections.comments.deleteMany({ postId: { $in: postIds } }),
      collections.joinRequests.deleteMany({ groupId })
    ]);
    return;
  }

  const postIds = memory.posts.filter((post) => post.groupId === groupId).map((post) => post.id);
  memory.groups = memory.groups.filter((group) => group.id !== groupId);
  memory.posts = memory.posts.filter((post) => post.groupId !== groupId);
  memory.comments = memory.comments.filter((comment) => !postIds.includes(comment.postId));
  memory.joinRequests = memory.joinRequests.filter((request) => request.groupId !== groupId);
};

export const lockGroup = async (groupId: string, isLocked: boolean) => {
  const collections = await requireMongo();
  if (collections) {
    await collections.groups.updateOne({ id: groupId }, { $set: { isLocked } });
    return getGroupById(groupId);
  }

  const group = memory.groups.find((item) => item.id === groupId) ?? null;
  if (!group) return null;
  group.isLocked = isLocked;
  return group;
};

export const createPost = async (input: {
  groupId: string;
  userId: string;
  text: string;
  imageUrl?: string;
  type: "sale" | "giveaway";
}) => {
  const post: Post = {
    id: randomUUID(),
    groupId: input.groupId,
    userId: input.userId,
    text: input.text.trim(),
    imageUrl: input.imageUrl?.trim() || "",
    type: input.type,
    isLocked: false,
    isDisabled: false,
    createdAt: new Date().toISOString()
  };

  const collections = await requireMongo();
  if (collections) {
    await collections.posts.insertOne(post);
  } else {
    memory.posts.unshift(post);
  }
  return post;
};

export const deletePost = async (postId: string) => {
  const collections = await requireMongo();
  if (collections) {
    await Promise.all([collections.posts.deleteOne({ id: postId }), collections.comments.deleteMany({ postId })]);
    return;
  }

  memory.posts = memory.posts.filter((post) => post.id !== postId);
  memory.comments = memory.comments.filter((comment) => comment.postId !== postId);
};

export const lockUser = async (userId: string, isLocked: boolean) => {
  const collections = await requireMongo();
  if (collections) {
    await collections.users.updateOne({ id: userId }, { $set: { isLocked } });
    return getUserById(userId);
  }

  const user = memory.users.find((item) => item.id === userId) ?? null;
  if (!user) return null;
  user.isLocked = isLocked;
  return user;
};

export const disableUser = async (userId: string, isDisabled: boolean) => {
  const collections = await requireMongo();
  if (collections) {
    await collections.users.updateOne({ id: userId }, { $set: { isDisabled } });
    return getUserById(userId);
  }

  const user = memory.users.find((item) => item.id === userId) ?? null;
  if (!user) return null;
  user.isDisabled = isDisabled;
  return user;
};

export const deleteUser = async (userId: string) => {
  const collections = await requireMongo();
  if (collections) {
    const postIds = (await collections.posts.find({ userId }).project({ id: 1 }).toArray()).map((post) => post.id);
    await Promise.all([
      collections.users.deleteOne({ id: userId }),
      collections.groups.updateMany({ adminId: userId }, { $set: { adminId: "" } }),
      collections.groups.updateMany({}, { $pull: { memberIds: userId, pendingMemberIds: userId } }),
      collections.posts.deleteMany({ userId }),
      collections.comments.deleteMany({ userId }),
      collections.messages.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] }),
      collections.joinRequests.deleteMany({ userId }),
      collections.comments.deleteMany({ postId: { $in: postIds } })
    ]);
    return;
  }

  memory.users = memory.users.filter((user) => user.id !== userId);
  memory.groups.forEach((group) => {
    if (group.adminId === userId) group.adminId = "";
    group.memberIds = group.memberIds.filter((id) => id !== userId);
    group.pendingMemberIds = group.pendingMemberIds.filter((id) => id !== userId);
  });
  const postIds = memory.posts.filter((post) => post.userId === userId).map((post) => post.id);
  memory.posts = memory.posts.filter((post) => post.userId !== userId);
  memory.comments = memory.comments.filter((comment) => comment.userId !== userId && !postIds.includes(comment.postId));
  memory.messages = memory.messages.filter((message) => message.senderId !== userId && message.receiverId !== userId);
  memory.joinRequests = memory.joinRequests.filter((request) => request.userId !== userId);
};

export const addComment = async (input: {
  postId: string;
  userId: string;
  text: string;
}) => {
  const comment: Comment = {
    id: randomUUID(),
    postId: input.postId,
    userId: input.userId,
    text: input.text.trim(),
    createdAt: new Date().toISOString()
  };

  const collections = await requireMongo();
  if (collections) {
    await collections.comments.insertOne(comment);
  } else {
    memory.comments.unshift(comment);
  }
  return comment;
};

export const deleteComment = async (commentId: string) => {
  const collections = await requireMongo();
  if (collections) {
    await collections.comments.deleteOne({ id: commentId });
    return;
  }

  memory.comments = memory.comments.filter((comment) => comment.id !== commentId);
};

export const lockPost = async (postId: string, lockedBy: string, isLocked: boolean) => {
  const collections = await requireMongo();
  if (collections) {
    await collections.posts.updateOne(
      { id: postId },
      {
        $set: isLocked
          ? { isLocked: true, lockedBy, lockedAt: new Date().toISOString() }
          : { isLocked: false, lockedBy: "", lockedAt: "" }
      }
    );
    return getPostById(postId);
  }

  const post = memory.posts.find((item) => item.id === postId) ?? null;
  if (!post) return null;
  Object.assign(post, isLocked
    ? { isLocked: true, lockedBy, lockedAt: new Date().toISOString() }
    : { isLocked: false, lockedBy: "", lockedAt: "" });
  return post;
};

export const disablePost = async (postId: string, isDisabled: boolean) => {
  const collections = await requireMongo();
  if (collections) {
    await collections.posts.updateOne({ id: postId }, { $set: { isDisabled } });
    return getPostById(postId);
  }

  const post = memory.posts.find((item) => item.id === postId) ?? null;
  if (!post) return null;
  post.isDisabled = isDisabled;
  return post;
};

export const sendMessage = async (input: {
  senderId: string;
  receiverId: string;
  text: string;
}) => {
  const message: Message = {
    id: randomUUID(),
    senderId: input.senderId,
    receiverId: input.receiverId,
    text: input.text.trim(),
    createdAt: new Date().toISOString()
  };

  const collections = await requireMongo();
  if (collections) {
    await collections.messages.insertOne(message);
  } else {
    memory.messages.unshift(message);
  }
  return message;
};

export const conversationPartners = async (userId: string) => {
  const messages = await getMessages();
  const partnerIds = new Set<string>();
  messages.forEach((message) => {
    if (message.senderId === userId) partnerIds.add(message.receiverId);
    if (message.receiverId === userId) partnerIds.add(message.senderId);
  });

  const partners = await Promise.all([...partnerIds].map((id) => getPublicUserById(id)));
  return partners.filter(Boolean) as PublicUser[];
};

export const conversationWith = async (userId: string, partnerId: string) => {
  const messages = await getMessages();
  return messages
    .filter((message) =>
      (message.senderId === userId && message.receiverId === partnerId) ||
      (message.senderId === partnerId && message.receiverId === userId)
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

export const postStats = async (postId: string) => {
  const comments = await getComments();
  return {
    commentsCount: comments.filter((comment) => comment.postId === postId).length
  };
};
