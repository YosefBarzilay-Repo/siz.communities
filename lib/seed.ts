import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import type { BootstrapPayload, Comment, Group, GroupJoinRequest, Message, Post, User } from "./types";

const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

const createUser = (username: string, email: string, password: string, bio: string): User => ({
  id: randomUUID(),
  username,
  email,
  passwordHash: bcrypt.hashSync(password, 10),
  joinedGroupIds: [],
  isSuperUser: false,
  isLocked: false,
  isDisabled: false,
  blockedUserIds: [],
  marketingOptIn: false,
  acceptedTermsAt: daysAgo(30),
  acceptedPrivacyAt: daysAgo(30),
  emailVerifiedAt: daysAgo(30),
  bio,
  createdAt: daysAgo(30)
});

const users: User[] = [
  createUser("Noa Levi", "noa@siz.local", "123456", "Community organizer and fast responder."),
  createUser("Michal Cohen", "michal@siz.local", "123456", "Neighborhood volunteer who likes to help."),
  createUser("Dan Barak", "dan@siz.local", "123456", "Student, gadget hunter, and casual seller."),
  createUser("Yael Sini", "yael@siz.local", "123456", "Local organizer for building updates.")
];

users[0].isSuperUser = true;

const groups: Group[] = [
  {
    id: randomUUID(),
    name: "Neighborhood Exchange",
    category: "Housing",
    description: "The neighborhood board for buildings, moving, and shared updates.",
    adminId: users[0].id,
    memberIds: [users[0].id, users[1].id, users[2].id],
    writeBlockedMemberIds: [],
    isLocked: false,
    isDisabled: false,
    requiresApproval: false,
    pendingMemberIds: [],
    createdAt: daysAgo(20)
  },
  {
    id: randomUUID(),
    name: "Students in the Center",
    category: "Students",
    description: "Rentals, books, exams, and everything buzzing between classes.",
    adminId: users[2].id,
    memberIds: [users[1].id, users[2].id, users[3].id],
    writeBlockedMemberIds: [],
    isLocked: false,
    isDisabled: false,
    requiresApproval: false,
    pendingMemberIds: [],
    createdAt: daysAgo(14)
  },
  {
    id: randomUUID(),
    name: "Events Under the Stars",
    category: "Other",
    description: "Private conversations after events, together with invites and tips.",
    adminId: users[1].id,
    memberIds: [users[0].id, users[1].id, users[3].id],
    writeBlockedMemberIds: [],
    isLocked: true,
    isDisabled: false,
    requiresApproval: true,
    pendingMemberIds: [],
    createdAt: daysAgo(8)
  }
];

users[0].joinedGroupIds = [groups[0].id, groups[2].id];
users[1].joinedGroupIds = [groups[0].id, groups[1].id, groups[2].id];
users[2].joinedGroupIds = [groups[0].id, groups[1].id];
users[3].joinedGroupIds = [groups[1].id, groups[2].id];

const posts: Post[] = [
  {
    id: randomUUID(),
    groupId: groups[0].id,
    userId: users[0].id,
    text: "Solid wood desk for sale. In great condition. Suitable for studying or a home office. Asking 18.",
    imageUrl: "",
    type: "sale",
    isLocked: false,
    isDisabled: false,
    createdAt: daysAgo(1)
  },
  {
    id: randomUUID(),
    groupId: groups[0].id,
    userId: users[1].id,
    text: "Free snack box for the neighborhood. Clean, nice, no pickup needed.",
    imageUrl: "",
    type: "giveaway",
    isLocked: false,
    isDisabled: false,
    createdAt: daysAgo(2)
  },
  {
    id: randomUUID(),
    groupId: groups[1].id,
    userId: users[2].id,
    text: "Small mini-mart shelf, good condition. Looking for a quick pickup by the end of the week.",
    imageUrl: "",
    type: "sale",
    isLocked: false,
    isDisabled: false,
    createdAt: daysAgo(1)
  }
];

const comments: Comment[] = [
  {
    id: randomUUID(),
    postId: posts[0].id,
    userId: users[2].id,
    text: "Is the desk still available? Can I pick it up tonight?",
    createdAt: daysAgo(1)
  },
  {
    id: randomUUID(),
    postId: posts[0].id,
    userId: users[1].id,
    text: "Yes, it is reserved until tomorrow morning.",
    createdAt: daysAgo(1)
  }
];

const messages: Message[] = [];

const joinRequests: GroupJoinRequest[] = [];

export const seedData: BootstrapPayload = {
  currentUser: null,
  users: users.map(({ passwordHash, ...rest }) => rest),
  groups,
  posts,
  comments,
  messages,
  joinRequests
};

export const seedUsers = users;
