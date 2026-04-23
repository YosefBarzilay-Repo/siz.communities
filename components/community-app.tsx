"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { io } from "socket.io-client";
import type { BootstrapPayload, Comment, Group, Message, Post } from "@/lib/types";
import {
  ArrowLeft,
  BadgeInfo,
  Bell,
  Check,
  CircleUserRound,
  Heart,
  Home,
  LogOut,
  MessageCircle,
  MessagesSquare,
  Plus,
  Reply,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Store,
  UserRound,
  Users,
  X
} from "lucide-react";

type PublicUser = BootstrapPayload["users"][number];

type AppData = BootstrapPayload & {
  conversations: Array<{
    partner: PublicUser;
    messages: Message[];
  }>;
  currentUserDetail: PublicUser | null;
};

type Section = "home" | "groups" | "create" | "messages" | "profile";
type Panel = "thread" | "dm" | null;

const emptyData: AppData = {
  currentUser: null,
  users: [],
  groups: [],
  posts: [],
  comments: [],
  messages: [],
  conversations: [],
  currentUserDetail: null
};

const tokenStorageKey = "siz_auth_token";

const authDefaults = {
  login: { email: "noa@siz.local", password: "123456" },
  register: { username: "", email: "", password: "", bio: "" }
};

const readStoredToken = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(tokenStorageKey);
};

const writeStoredToken = (token: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(tokenStorageKey, token);
};

const clearStoredToken = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(tokenStorageKey);
};

const api = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const storedToken = readStoredToken();
  const requestUrl = storedToken && !url.includes("token=")
    ? `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(storedToken)}`
    : url;
  const response = await fetch(requestUrl, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
      ...(init?.headers ?? {})
    },
    credentials: "include"
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "שגיאה");
  }

  return payload as T;
};

const timeLabel = (value: string) =>
  new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));

const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "short"
  }).format(new Date(value));

const postTypeLabel = (type: Post["type"]) => (type === "sale" ? "למכירה" : "למסירה");

function IconButton({
  children,
  active = false,
  onClick
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-full transition active:scale-95 ${
        active ? "bg-primary text-white" : "bg-white text-text border border-surface-border"
      }`}
    >
      {children}
    </button>
  );
}

function ShellCard({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`rounded-2xl bg-white shadow-card ${className}`}>{children}</div>;
}

export default function CommunityApp() {
  const [data, setData] = useState<AppData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [section, setSection] = useState<Section>("home");
  const [panel, setPanel] = useState<Panel>(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedPostId, setSelectedPostId] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [commentText, setCommentText] = useState("");
  const [messageText, setMessageText] = useState("");
  const [createPostText, setCreatePostText] = useState("");
  const [createPostType, setCreatePostType] = useState<Post["type"]>("sale");
  const [createPostImage, setCreatePostImage] = useState("");
  const [createGroup, setCreateGroup] = useState({ name: "", category: "", description: "" });
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginForm, setLoginForm] = useState(authDefaults.login);
  const [registerForm, setRegisterForm] = useState(authDefaults.register);

  const selectedGroup = data.groups.find((group) => group.id === selectedGroupId) ?? data.groups[0] ?? null;
  const selectedPost = data.posts.find((post) => post.id === selectedPostId) ?? null;
  const selectedPartner = data.users.find((user) => user.id === selectedPartnerId) ?? null;
  const currentUser = data.currentUser;
  const currentUserDetail = data.currentUserDetail;

  const commentsForSelectedPost = useMemo(
    () => data.comments.filter((comment) => comment.postId === selectedPostId),
    [data.comments, selectedPostId]
  );

  const feedPosts = useMemo(() => {
    const groupId = selectedGroup?.id;
    return data.posts.filter((post) => (groupId ? post.groupId === groupId : true));
  }, [data.posts, selectedGroup]);

  const userById = (id: string) => data.users.find((user) => user.id === id);

  const refresh = async () => {
    const payload = await api<AppData>("/api/bootstrap");
    setData(payload);
    setSelectedGroupId((current) => current || payload.groups[0]?.id || "");
    if (!selectedPartnerId && payload.conversations[0]?.partner?.id) {
      setSelectedPartnerId(payload.conversations[0].partner.id);
    }
  };

  useEffect(() => {
    const token = readStoredToken();
    if (token) {
      setError("");
    }
    refresh()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedGroupId && data.groups[0]) {
      setSelectedGroupId(data.groups[0].id);
    }
  }, [data.groups, selectedGroupId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const socket = io("/", { path: "/socket.io" });
    socket.on("store:update", () => {
      refresh().catch(() => undefined);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const payload = await api<{ user: PublicUser; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(loginForm)
    });
    writeStoredToken(payload.token);
    await refresh();
    setSection("home");
  };

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const payload = await api<{ user: PublicUser; token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(registerForm)
    });
    writeStoredToken(payload.token);
    await refresh();
    setSection("home");
  };

  const handleLogout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    clearStoredToken();
    setData(emptyData);
    setSection("home");
    setPanel(null);
    setSelectedGroupId("");
    setSelectedPartnerId("");
  };

  const handleJoinToggle = async (group: Group) => {
    const joined = currentUserDetail?.joinedGroupIds?.includes(group.id) ?? false;
    await api(`/api/groups/${group.id}/join`, {
      method: joined ? "DELETE" : "POST"
    });
    await refresh();
  };

  const handleCreatePost = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedGroup) return;
    await api("/api/posts", {
      method: "POST",
      body: JSON.stringify({
        groupId: selectedGroup.id,
        text: createPostText,
        imageUrl: createPostImage,
        type: createPostType
      })
    });
    setCreatePostText("");
    setCreatePostImage("");
    setSection("home");
    await refresh();
  };

  const handleCreateGroup = async (event: FormEvent) => {
    event.preventDefault();
    await api("/api/groups", {
      method: "POST",
      body: JSON.stringify(createGroup)
    });
    setCreateGroup({ name: "", category: "", description: "" });
    setSection("groups");
    await refresh();
  };

  const handleComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPost) return;
    await api(`/api/posts/${selectedPost.id}/comments`, {
      method: "POST",
      body: JSON.stringify({ text: commentText })
    });
    setCommentText("");
    await refresh();
  };

  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPartner) return;
    await api("/api/messages", {
      method: "POST",
      body: JSON.stringify({
        receiverId: selectedPartner.id,
        text: messageText
      })
    });
    setMessageText("");
    await refresh();
  };

  const currentConversation = selectedPartnerId
    ? data.conversations.find((conversation) => conversation.partner.id === selectedPartnerId) ?? null
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-text-muted">
        טוען את SIZ...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen px-4 py-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md flex-col justify-between rounded-[2rem] bg-white p-6 shadow-card">
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-dark">
                <Store className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-black tracking-tight text-primary">SIZ</div>
                <div className="text-sm text-text-muted">קהילה. קנייה. מסירה.</div>
              </div>
            </div>

            <div className="mb-6 space-y-3">
              <h1 className="text-3xl font-bold leading-tight text-text">מקום אחד לקהילה שלך</h1>
              <p className="text-sm leading-6 text-text-muted">
                מצטרפים לקהילות, מפרסמים פריטים, מגיבים בשרשור ושולחים הודעה פרטית בשיחה אחת פשוטה.
              </p>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-3 text-right">
              <ShellCard className="p-4">
                <div className="text-lg font-bold text-text">קבוצות</div>
                <div className="text-xs text-text-muted">שכונה, סטודנטים, ארגונים</div>
              </ShellCard>
              <ShellCard className="p-4">
                <div className="text-lg font-bold text-text">פוסטים</div>
                <div className="text-xs text-text-muted">למכירה או למסירה</div>
              </ShellCard>
              <ShellCard className="p-4">
                <div className="text-lg font-bold text-text">צ'אט</div>
                <div className="text-xs text-text-muted">תגובה או הודעה פרטית</div>
              </ShellCard>
            </div>

            <div className="mb-4 flex rounded-full bg-surface-soft p-1">
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold ${
                  authMode === "login" ? "bg-white text-primary shadow-sm" : "text-text-muted"
                }`}
              >
                כניסה
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("register")}
                className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold ${
                  authMode === "register" ? "bg-white text-primary shadow-sm" : "text-text-muted"
                }`}
              >
                הרשמה
              </button>
            </div>

            {authMode === "login" ? (
              <form className="space-y-4" onSubmit={handleLogin}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-text-muted">אימייל</span>
                  <div className="relative">
                    <input
                      value={loginForm.email}
                      onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
                      type="email"
                      className="w-full rounded-2xl border border-surface-border bg-white px-4 py-4 pr-12 text-right outline-none transition focus:border-primary"
                      placeholder="noa@siz.local"
                    />
                    <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-text-muted">סיסמה</span>
                  <input
                    value={loginForm.password}
                    onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                    type="password"
                    className="w-full rounded-2xl border border-surface-border bg-white px-4 py-4 text-right outline-none transition focus:border-primary"
                    placeholder="123456"
                  />
                </label>

                <button type="submit" className="w-full rounded-full bg-primary px-4 py-4 font-semibold text-white shadow-sm">
                  כניסה
                </button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleRegister}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-text-muted">שם משתמש</span>
                  <input
                    value={registerForm.username}
                    onChange={(event) => setRegisterForm((prev) => ({ ...prev, username: event.target.value }))}
                    type="text"
                    className="w-full rounded-2xl border border-surface-border bg-white px-4 py-4 text-right outline-none transition focus:border-primary"
                    placeholder="נועה לוי"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-text-muted">אימייל</span>
                  <input
                    value={registerForm.email}
                    onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))}
                    type="email"
                    className="w-full rounded-2xl border border-surface-border bg-white px-4 py-4 text-right outline-none transition focus:border-primary"
                    placeholder="you@siz.local"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-text-muted">סיסמה</span>
                  <input
                    value={registerForm.password}
                    onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
                    type="password"
                    className="w-full rounded-2xl border border-surface-border bg-white px-4 py-4 text-right outline-none transition focus:border-primary"
                    placeholder="לפחות 6 תווים"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-text-muted">תיאור קצר</span>
                  <input
                    value={registerForm.bio}
                    onChange={(event) => setRegisterForm((prev) => ({ ...prev, bio: event.target.value }))}
                    type="text"
                    className="w-full rounded-2xl border border-surface-border bg-white px-4 py-4 text-right outline-none transition focus:border-primary"
                    placeholder="קצת עליך"
                  />
                </label>
                <button type="submit" className="w-full rounded-full bg-primary px-4 py-4 font-semibold text-white shadow-sm">
                  יצירת חשבון
                </button>
              </form>
            )}

            {error ? (
              <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-danger">{error}</div>
            ) : null}

            <div className="mt-6 rounded-2xl bg-surface-soft p-4 text-right text-sm text-text-muted">
              <div className="mb-1 font-semibold text-text">חשבון דמו מהיר</div>
              <div>אימייל: noa@siz.local</div>
              <div>סיסמה: 123456</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/90 px-5 py-4 shadow-sm glass">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary-dark">
              <Store className="h-6 w-6" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-black tracking-tight text-primary">SIZ</div>
              <div className="text-xs text-text-muted">קהילת פריטים, שיחות ופעולות מהירות</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <IconButton>
              <Bell className="h-4 w-4" />
            </IconButton>
            <IconButton onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4">
        <div className="space-y-4">
          <ShellCard className="fade-up overflow-hidden p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="text-right">
                <div className="mb-2 text-sm text-text-muted">שלום, {currentUser.username}</div>
                <h1 className="text-2xl font-bold text-text">לוח קהילה פשוט, מהיר וקריא</h1>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  כל מה שצריך כדי לפרסם, להגיב ולדבר ישירות בתוך קהילות משותפות.
                </p>
              </div>
              <div className="rounded-2xl bg-primary-soft px-3 py-2 text-right">
                <div className="text-xs text-text-muted">קהילות פעילות</div>
                <div className="text-xl font-bold text-primary-dark">{data.groups.length}</div>
              </div>
            </div>
          </ShellCard>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {data.groups.map((group) => {
              const joined = currentUserDetail?.joinedGroupIds?.includes(group.id) ?? false;
              const active = selectedGroup?.id === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => {
                    setSelectedGroupId(group.id);
                    setSection("home");
                  }}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active ? "bg-primary text-white" : joined ? "bg-white text-primary-dark border border-primary/20" : "bg-surface-soft text-text-muted"
                  }`}
                >
                  {group.name}
                </button>
              );
            })}
          </div>

          {section === "home" ? (
            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
              <div className="space-y-4">
                <ShellCard className="p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-right">
                      <div className="text-xs text-text-muted">פיד נוכחי</div>
                      <div className="text-lg font-bold text-text">{selectedGroup?.name ?? "כל הקהילות"}</div>
                    </div>
                    <div className="rounded-full bg-surface-soft px-3 py-2 text-xs text-text-muted">
                      {feedPosts.length} פוסטים
                    </div>
                  </div>

                  <div className="space-y-4">
                    {feedPosts.map((post) => {
                      const author = userById(post.userId);
                      const group = data.groups.find((item) => item.id === post.groupId);
                      const commentCount = data.comments.filter((comment) => comment.postId === post.id).length;
                      return (
                        <article key={post.id} className="overflow-hidden rounded-2xl border border-surface-border bg-white">
                          <div className="flex items-start justify-between gap-3 p-4">
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-dark">
                                  {author?.username?.slice(0, 1) ?? "?"}
                                </div>
                                <div>
                                  <div className="font-bold text-text">{author?.username ?? "משתמש"}</div>
                                  <div className="text-xs text-text-muted">
                                    {group?.name ?? ""} · {timeLabel(post.createdAt)}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className={`rounded-full px-3 py-1 text-xs font-semibold ${post.type === "sale" ? "bg-primary-soft text-primary-dark" : "bg-orange-50 text-accent"}`}>
                              {postTypeLabel(post.type)}
                            </div>
                          </div>

                          <div className="px-4 pb-4 text-right text-sm leading-6 text-text">
                            {post.text}
                          </div>

                          <div className="px-4 pb-4">
                            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary-soft via-white to-orange-50">
                              <div className="flex min-h-36 items-end justify-between p-4">
                                <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-text-muted shadow-sm">
                                  {dateLabel(post.createdAt)}
                                </div>
                                <div className="rounded-full bg-white/80 p-2 shadow-sm">
                                  <Heart className="h-4 w-4 text-danger" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-surface-border px-4 py-3">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPostId(post.id);
                                  setPanel("thread");
                                }}
                                className="inline-flex items-center gap-2 rounded-full bg-surface-soft px-3 py-2 text-xs font-semibold text-text-muted transition active:scale-95"
                              >
                                <MessageCircle className="h-4 w-4" />
                                {commentCount}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!author) return;
                                  setSelectedPartnerId(author.id);
                                  setPanel("dm");
                                }}
                                className="inline-flex items-center gap-2 rounded-full bg-surface-soft px-3 py-2 text-xs font-semibold text-text-muted transition active:scale-95"
                              >
                                <MessagesSquare className="h-4 w-4" />
                                הודעה
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPostId(post.id);
                                setPanel("thread");
                              }}
                              className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white transition active:scale-95"
                            >
                              <Reply className="h-4 w-4" />
                              תגובה
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </ShellCard>
              </div>

              <div className="space-y-4">
                <ShellCard className="p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-right">
                      <div className="text-xs text-text-muted">הקהילה שלי</div>
                      <div className="text-lg font-bold text-text">חדרי דיון ופעולה</div>
                    </div>
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-3">
                    {data.groups.map((group) => {
                      const joined = currentUserDetail?.joinedGroupIds?.includes(group.id) ?? false;
                      return (
                        <div key={group.id} className="rounded-2xl border border-surface-border p-3 text-right">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-sm font-bold text-text">{group.name}</span>
                            <span className="rounded-full bg-surface-soft px-2 py-1 text-[11px] text-text-muted">{group.category}</span>
                          </div>
                          <div className="text-xs leading-5 text-text-muted">{group.description}</div>
                          <div className="mt-3 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => handleJoinToggle(group)}
                              className={`rounded-full px-3 py-2 text-xs font-semibold transition active:scale-95 ${
                                joined ? "bg-primary-soft text-primary-dark" : "bg-primary text-white"
                              }`}
                            >
                              {joined ? "עזיבה" : "הצטרפות"}
                            </button>
                            <div className="text-xs text-text-muted">{group.memberIds.length} חברים</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ShellCard>

                <ShellCard className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-right">
                      <div className="text-xs text-text-muted">פעילות חיה</div>
                      <div className="text-lg font-bold text-text">הודעות ותגובות אחרונות</div>
                    </div>
                    <Sparkles className="h-5 w-5 text-accent" />
                  </div>
                  <div className="space-y-3">
                    {data.conversations.slice(0, 2).map((conversation) => (
                      <button
                        key={conversation.partner.id}
                        type="button"
                        onClick={() => {
                          setSelectedPartnerId(conversation.partner.id);
                          setPanel("dm");
                        }}
                        className="flex w-full items-center justify-between rounded-2xl border border-surface-border p-3 text-right transition hover:bg-surface-soft"
                      >
                        <div>
                          <div className="font-semibold text-text">{conversation.partner.username}</div>
                          <div className="text-xs text-text-muted">
                            {conversation.messages[conversation.messages.length - 1]?.text ?? "אין הודעות"}
                          </div>
                        </div>
                        <ArrowLeft className="h-4 w-4 text-text-muted" />
                      </button>
                    ))}
                  </div>
                </ShellCard>
              </div>
            </div>
          ) : null}

          {section === "groups" ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <ShellCard className="p-4">
                <div className="mb-4 text-right">
                  <div className="text-xs text-text-muted">קהילות זמינות</div>
                  <div className="text-xl font-bold text-text">רשימת קבוצות</div>
                </div>
                <div className="space-y-3">
                  {data.groups.map((group) => {
                    const joined = currentUserDetail?.joinedGroupIds?.includes(group.id) ?? false;
                    return (
                      <div key={group.id} className="rounded-2xl border border-surface-border p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="text-right">
                            <div className="font-bold text-text">{group.name}</div>
                            <div className="mt-1 text-xs text-text-muted">{group.category}</div>
                            <p className="mt-2 text-sm leading-6 text-text-muted">{group.description}</p>
                          </div>
                          <IconButton active={joined} onClick={() => handleJoinToggle(group)}>
                            {joined ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          </IconButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ShellCard>

              <ShellCard className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-right">
                    <div className="text-xs text-text-muted">יצירת קהילה</div>
                    <div className="text-xl font-bold text-text">קבוצה חדשה</div>
                  </div>
                  <BadgeInfo className="h-5 w-5 text-primary" />
                </div>
                <form className="space-y-3" onSubmit={handleCreateGroup}>
                  <input
                    value={createGroup.name}
                    onChange={(event) => setCreateGroup((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-2xl border border-surface-border bg-white px-4 py-3 text-right outline-none transition focus:border-primary"
                    placeholder="שם הקהילה"
                  />
                  <input
                    value={createGroup.category}
                    onChange={(event) => setCreateGroup((prev) => ({ ...prev, category: event.target.value }))}
                    className="w-full rounded-2xl border border-surface-border bg-white px-4 py-3 text-right outline-none transition focus:border-primary"
                    placeholder="קטגוריה"
                  />
                  <textarea
                    value={createGroup.description}
                    onChange={(event) => setCreateGroup((prev) => ({ ...prev, description: event.target.value }))}
                    className="min-h-32 w-full rounded-2xl border border-surface-border bg-white px-4 py-3 text-right outline-none transition focus:border-primary"
                    placeholder="תיאור קצר"
                  />
                  <button type="submit" className="w-full rounded-full bg-primary px-4 py-3 font-semibold text-white">
                    יצירת קהילה
                  </button>
                </form>
              </ShellCard>
            </div>
          ) : null}

          {section === "create" ? (
            <ShellCard className="p-4">
              <div className="mb-4 text-right">
                <div className="text-xs text-text-muted">פוסט חדש</div>
                <div className="text-xl font-bold text-text">פרסום פריט</div>
              </div>
              <form className="space-y-3" onSubmit={handleCreatePost}>
                <select
                  value={selectedGroup?.id ?? ""}
                  onChange={(event) => setSelectedGroupId(event.target.value)}
                  className="w-full rounded-2xl border border-surface-border bg-white px-4 py-3 text-right outline-none transition focus:border-primary"
                >
                  {data.groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <div className="flex rounded-full bg-surface-soft p-1">
                  <button
                    type="button"
                    onClick={() => setCreatePostType("sale")}
                    className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold ${
                      createPostType === "sale" ? "bg-white text-primary-dark shadow-sm" : "text-text-muted"
                    }`}
                  >
                    למכירה
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatePostType("giveaway")}
                    className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold ${
                      createPostType === "giveaway" ? "bg-white text-primary-dark shadow-sm" : "text-text-muted"
                    }`}
                  >
                    למסירה
                  </button>
                </div>
                <textarea
                  value={createPostText}
                  onChange={(event) => setCreatePostText(event.target.value)}
                  className="min-h-40 w-full rounded-2xl border border-surface-border bg-white px-4 py-3 text-right outline-none transition focus:border-primary"
                  placeholder="תיאור קצר של הפריט"
                />
                <input
                  value={createPostImage}
                  onChange={(event) => setCreatePostImage(event.target.value)}
                  className="w-full rounded-2xl border border-surface-border bg-white px-4 py-3 text-right outline-none transition focus:border-primary"
                  placeholder="קישור תמונה אופציונלי"
                />
                <button type="submit" className="w-full rounded-full bg-primary px-4 py-3 font-semibold text-white">
                  פרסום
                </button>
              </form>
            </ShellCard>
          ) : null}

          {section === "messages" ? (
            <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <ShellCard className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-right">
                    <div className="text-xs text-text-muted">הודעות פרטיות</div>
                    <div className="text-xl font-bold text-text">שיחות פעילות</div>
                  </div>
                  <MessagesSquare className="h-5 w-5 text-primary" />
                </div>

                <div className="space-y-3">
                  {data.conversations.map((conversation) => (
                    <button
                      key={conversation.partner.id}
                      type="button"
                      onClick={() => setSelectedPartnerId(conversation.partner.id)}
                      className={`w-full rounded-2xl border p-3 text-right transition ${
                        selectedPartnerId === conversation.partner.id ? "border-primary bg-primary-soft" : "border-surface-border bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-bold text-text">{conversation.partner.username}</div>
                          <div className="text-xs text-text-muted">
                            {conversation.messages[conversation.messages.length - 1]?.text ?? "אין הודעות"}
                          </div>
                        </div>
                        <div className="text-[11px] text-text-muted">
                          {conversation.messages[conversation.messages.length - 1] ? timeLabel(conversation.messages[conversation.messages.length - 1].createdAt) : ""}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ShellCard>

              <ShellCard className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-right">
                    <div className="text-xs text-text-muted">שיחה פרטית</div>
                    <div className="text-xl font-bold text-text">{selectedPartner?.username ?? "בחר שיחה"}</div>
                  </div>
                  <UserRound className="h-5 w-5 text-primary" />
                </div>

                {currentConversation ? (
                  <div className="space-y-4">
                    <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl bg-surface-soft p-3">
                      {currentConversation.messages.map((message) => {
                        const mine = message.senderId === currentUser.id;
                        return (
                          <div key={message.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                                mine ? "bg-white text-text shadow-sm" : "bg-primary text-white"
                              }`}
                            >
                              {message.text}
                              <div className={`mt-1 text-[11px] ${mine ? "text-text-muted" : "text-white/80"}`}>{timeLabel(message.createdAt)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        value={messageText}
                        onChange={(event) => setMessageText(event.target.value)}
                        className="min-w-0 flex-1 rounded-2xl border border-surface-border bg-white px-4 py-3 text-right outline-none transition focus:border-primary"
                        placeholder="כתוב הודעה"
                      />
                      <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 text-white">
                        <Send className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-surface-soft p-4 text-right text-sm text-text-muted">
                    בחר שיחה כדי לראות את ההיסטוריה.
                  </div>
                )}
              </ShellCard>
            </div>
          ) : null}

          {section === "profile" ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
              <ShellCard className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="text-right">
                    <div className="text-xs text-text-muted">פרופיל</div>
                    <div className="text-2xl font-bold text-text">{currentUser.username}</div>
                    <div className="mt-1 text-sm text-text-muted">{currentUser.email}</div>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary-dark">
                    <CircleUserRound className="h-7 w-7" />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-surface-soft p-4 text-right">
                    <div className="text-xs text-text-muted">חברים</div>
                    <div className="text-xl font-bold text-text">{data.users.length}</div>
                  </div>
                  <div className="rounded-2xl bg-surface-soft p-4 text-right">
                    <div className="text-xs text-text-muted">פוסטים</div>
                    <div className="text-xl font-bold text-text">{data.posts.length}</div>
                  </div>
                  <div className="rounded-2xl bg-surface-soft p-4 text-right">
                    <div className="text-xs text-text-muted">שיחות</div>
                    <div className="text-xl font-bold text-text">{data.conversations.length}</div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-surface-border p-4 text-right">
                  <div className="mb-2 text-sm font-semibold text-text">מידע קצר</div>
                  <p className="text-sm leading-6 text-text-muted">
                    {currentUserDetail?.bio ?? "חבר קהילה פעיל ב-SIZ."}
                  </p>
                </div>
              </ShellCard>

              <ShellCard className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-right">
                    <div className="text-xs text-text-muted">בטיחות וניהול</div>
                    <div className="text-xl font-bold text-text">פעולות חשבון</div>
                  </div>
                  <ShieldAlert className="h-5 w-5 text-accent" />
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl bg-surface-soft p-4 text-right text-sm text-text-muted">
                    היישום רץ עם JWT, API routes, ממשק RTL ורענון חי דרך Socket.IO.
                  </div>
                  <button onClick={handleLogout} className="w-full rounded-full bg-text px-4 py-3 font-semibold text-white">
                    התנתקות
                  </button>
                </div>
              </ShellCard>
            </div>
          ) : null}
        </div>
      </main>

      {panel === "thread" && selectedPost ? (
        <div className="fixed inset-0 z-40 flex items-end bg-black/25 p-3">
          <div className="w-full max-w-2xl rounded-[1.75rem] bg-white p-4 shadow-lift">
            <div className="mb-3 flex items-center justify-between">
              <button type="button" onClick={() => setPanel(null)} className="rounded-full bg-surface-soft p-2">
                <X className="h-4 w-4" />
              </button>
              <div className="text-right">
                <div className="text-xs text-text-muted">שרשור</div>
                <div className="font-bold text-text">{userById(selectedPost.userId)?.username ?? "פוסט"}</div>
              </div>
            </div>

            <div className="mb-4 rounded-2xl bg-surface-soft p-4 text-right">
              <div className="mb-2 text-xs text-text-muted">{selectedGroup?.name ?? ""}</div>
              <div className="text-sm leading-6 text-text">{selectedPost.text}</div>
            </div>

            <div className="max-h-72 space-y-3 overflow-y-auto">
              {commentsForSelectedPost.map((comment) => {
                const author = userById(comment.userId);
                return (
                  <div key={comment.id} className="rounded-2xl border border-surface-border p-3 text-right">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="font-semibold text-text">{author?.username ?? "משתמש"}</div>
                      <div className="text-xs text-text-muted">{timeLabel(comment.createdAt)}</div>
                    </div>
                    <div className="text-sm leading-6 text-text-muted">{comment.text}</div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleComment} className="mt-4 flex gap-2">
              <input
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                className="min-w-0 flex-1 rounded-2xl border border-surface-border bg-white px-4 py-3 text-right outline-none transition focus:border-primary"
                placeholder="תגובה קצרה"
              />
              <button type="submit" className="rounded-2xl bg-primary px-4 text-white">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {panel === "dm" && selectedPartner ? (
        <div className="fixed inset-0 z-40 flex items-end bg-black/25 p-3">
          <div className="w-full max-w-2xl rounded-[1.75rem] bg-white p-4 shadow-lift">
            <div className="mb-3 flex items-center justify-between">
              <button type="button" onClick={() => setPanel(null)} className="rounded-full bg-surface-soft p-2">
                <X className="h-4 w-4" />
              </button>
              <div className="text-right">
                <div className="text-xs text-text-muted">הודעה פרטית</div>
                <div className="font-bold text-text">{selectedPartner.username}</div>
              </div>
            </div>

            <div className="max-h-80 space-y-3 overflow-y-auto rounded-2xl bg-surface-soft p-3">
              {(currentConversation?.messages ?? []).map((message) => {
                const mine = message.senderId === currentUser.id;
                return (
                  <div key={message.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${mine ? "bg-white shadow-sm" : "bg-primary text-white"}`}>
                      {message.text}
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
              <input
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                className="min-w-0 flex-1 rounded-2xl border border-surface-border bg-white px-4 py-3 text-right outline-none transition focus:border-primary"
                placeholder="כתוב הודעה"
              />
              <button type="submit" className="rounded-2xl bg-primary px-4 text-white">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/80 bg-white/95 px-3 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] glass">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-2">
          {[
            { key: "home", label: "בית", icon: Home },
            { key: "groups", label: "קהילות", icon: Users },
            { key: "create", label: "פרסום", icon: Plus },
            { key: "messages", label: "הודעות", icon: MessageCircle },
            { key: "profile", label: "פרופיל", icon: UserRound }
          ].map((item) => {
            const active = section === item.key;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setSection(item.key as Section);
                  setPanel(null);
                }}
                className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition ${
                  active ? "bg-primary text-white" : "text-text-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {error ? (
        <div className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-white px-4 py-3 text-right text-sm text-danger shadow-lift">
          {error}
        </div>
      ) : null}
    </div>
  );
}
