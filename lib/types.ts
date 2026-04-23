export type GroupType = "שכונה" | "ארגון" | "סטודנטים" | "אחר";

export type ListingType = "sale" | "giveaway";

export type User = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  joinedGroupIds: string[];
  isLocked: boolean;
  isDisabled: boolean;
  bio: string;
  createdAt: string;
};

export type Group = {
  id: string;
  name: string;
  category: string;
  description: string;
  adminId: string;
  memberIds: string[];
  isLocked: boolean;
  isDisabled: boolean;
  requiresApproval: boolean;
  pendingMemberIds: string[];
  createdAt: string;
};

export type Post = {
  id: string;
  groupId: string;
  userId: string;
  text: string;
  imageUrl?: string;
  type: ListingType;
  isLocked: boolean;
  isDisabled: boolean;
  lockedBy?: string;
  lockedAt?: string;
  createdAt: string;
};

export type Comment = {
  id: string;
  postId: string;
  userId: string;
  text: string;
  createdAt: string;
};

export type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
};

export type GroupJoinRequest = {
  id: string;
  groupId: string;
  userId: string;
  createdAt: string;
};

export type AuthSession = {
  id: string;
  username: string;
  email: string;
};

export type BootstrapPayload = {
  currentUser: AuthSession | null;
  users: Omit<User, "passwordHash">[];
  groups: Group[];
  posts: Post[];
  comments: Comment[];
  messages: Message[];
  joinRequests: GroupJoinRequest[];
};
