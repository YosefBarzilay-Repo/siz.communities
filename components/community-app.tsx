"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { io } from "socket.io-client";
import { ArrowLeft, Lock, MessageCircle, Plus, Send, Store, Upload, UserRound, X } from "lucide-react";
import type { BootstrapPayload, Group, Post } from "@/lib/types";

type PublicUser = BootstrapPayload["users"][number];

type AppData = BootstrapPayload & {
  currentUserDetail: PublicUser | null;
};

type View = "groups" | "group" | "join" | "create" | "profile";

const emptyData: AppData = {
  currentUser: null,
  users: [],
  groups: [],
  posts: [],
  comments: [],
  messages: [],
  joinRequests: [],
  currentUserDetail: null
};

const tokenStorageKey = "siz_auth_token";

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
  const requestUrl =
    storedToken && !url.includes("token=")
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
  const [view, setView] = useState<View>("groups");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [replyTargetPostId, setReplyTargetPostId] = useState("");
  const [postText, setPostText] = useState("");
  const [postImage, setPostImage] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [messageText, setMessageText] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [hasSeenIntro, setHasSeenIntro] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ username: "", email: "", password: "" });
  const [newGroup, setNewGroup] = useState({ name: "", description: "", isLocked: false });

  const currentUser = data.currentUser;
  const currentUserDetail = data.currentUserDetail;

  const userById = (id: string) => data.users.find((user) => user.id === id);

  const joinedGroups = useMemo(() => {
    const joinedIds = new Set(currentUserDetail?.joinedGroupIds ?? []);
    return data.groups.filter((group) => joinedIds.has(group.id));
  }, [currentUserDetail?.joinedGroupIds, data.groups]);

  const availableGroups = useMemo(() => {
    const joinedIds = new Set(currentUserDetail?.joinedGroupIds ?? []);
    return data.groups.filter((group) => !joinedIds.has(group.id));
  }, [currentUserDetail?.joinedGroupIds, data.groups]);

  const selectedGroup = useMemo(
    () => data.groups.find((group) => group.id === selectedGroupId) ?? null,
    [data.groups, selectedGroupId]
  );

  const groupPosts = useMemo(() => {
    if (!selectedGroup) return [];
    return data.posts
      .filter((post) => post.groupId === selectedGroup.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [data.posts, selectedGroup]);

  const activeReplyPost = replyTargetPostId ? data.posts.find((post) => post.id === replyTargetPostId) ?? null : null;
  const activeReplyAuthor = activeReplyPost ? userById(activeReplyPost.userId) : null;
  const canManageGroup = Boolean(currentUser && selectedGroup && currentUser.id === selectedGroup.adminId);

  const messagePartners = useMemo(() => {
    const partnerIds = new Set<string>();
    data.messages.forEach((message) => {
      if (message.senderId === currentUser?.id) partnerIds.add(message.receiverId);
      if (message.receiverId === currentUser?.id) partnerIds.add(message.senderId);
    });
    return [...partnerIds].map((id) => userById(id)).filter(Boolean) as PublicUser[];
  }, [data.messages, currentUser?.id, data.users]);

  const selectedPartner = selectedPartnerId ? userById(selectedPartnerId) ?? null : messagePartners[0] ?? null;
  const currentConversation = selectedPartner
    ? data.messages
        .filter((message) =>
          (message.senderId === currentUser?.id && message.receiverId === selectedPartner.id) ||
          (message.senderId === selectedPartner.id && message.receiverId === currentUser?.id)
        )
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    : [];

  const recentNotifications = useMemo(() => {
    return data.messages
      .filter((message) => message.receiverId === currentUser?.id)
      .slice(0, 5);
  }, [data.messages, currentUser?.id]);

  const refresh = async () => {
    const payload = await api<AppData>("/api/bootstrap");
    setData(payload);
    const joined = payload.groups.filter((group) => (payload.currentUserDetail?.joinedGroupIds ?? []).includes(group.id));
    if (!selectedGroupId && joined[0]) {
      setSelectedGroupId(joined[0].id);
    }
  };

  useEffect(() => {
    refresh()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem("siz_seen_intro") === "1";
    setHasSeenIntro(seen);
    const socket = io("/", { path: "/socket.io" });
    socket.on("store:update", () => {
      refresh().catch(() => undefined);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (replyTargetPostId && !groupPosts.some((post) => post.id === replyTargetPostId)) {
      setReplyTargetPostId("");
    }
  }, [groupPosts, replyTargetPostId, selectedGroup]);

  useEffect(() => {
    if (!selectedPartnerId && messagePartners[0]) {
      setSelectedPartnerId(messagePartners[0].id);
    }
  }, [messagePartners, selectedPartnerId]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const payload = await api<{ user: PublicUser; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(loginForm)
    });
    writeStoredToken(payload.token);
    setHasSeenIntro(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("siz_seen_intro", "0");
    }
    await refresh();
  };

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const payload = await api<{ user: PublicUser; token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(registerForm)
    });
    writeStoredToken(payload.token);
    setHasSeenIntro(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("siz_seen_intro", "0");
    }
    await refresh();
  };

  const handleLogout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    clearStoredToken();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("siz_seen_intro");
    }
    setData(emptyData);
    setView("groups");
    setSelectedGroupId("");
    setReplyTargetPostId("");
    setPostText("");
    setPostImage("");
    setUploadName("");
    setCommentText("");
    setSelectedPartnerId("");
    setMessageText("");
  };

  const handleJoinGroup = async (groupId: string) => {
    await api(`/api/groups/${groupId}/join`, { method: "POST" });
    await refresh();
    setView("groups");
  };

  const handleLeaveGroup = async (groupId: string) => {
    await api(`/api/groups/${groupId}/join`, { method: "DELETE" });
    setSelectedGroupId("");
    setReplyTargetPostId("");
    setCommentText("");
    setPostText("");
    await refresh();
    setView("groups");
  };

  const handleCreateGroup = async (event: FormEvent) => {
    event.preventDefault();
    await api("/api/groups", {
      method: "POST",
      body: JSON.stringify(newGroup)
    });
    setNewGroup({ name: "", description: "", isLocked: false });
    await refresh();
    setView("groups");
  };

  const handleApproveJoin = async (groupId: string, userId: string) => {
    await api(`/api/groups/${groupId}/approve`, {
      method: "POST",
      body: JSON.stringify({ userId })
    });
    await refresh();
  };

  const handleTogglePostLock = async (postId: string, locked: boolean) => {
    await api(`/api/posts/${postId}`, {
      method: "PATCH",
      body: JSON.stringify({ locked })
    });
    await refresh();
  };

  const handleDeletePost = async (postId: string) => {
    await api(`/api/posts/${postId}`, {
      method: "DELETE"
    });
    if (replyTargetPostId === postId) {
      setReplyTargetPostId("");
      setCommentText("");
    }
    await refresh();
  };

  const handleImageInput = async (file: File | null) => {
    if (!file) return;
    setUploadName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setPostImage(String(reader.result ?? ""));
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPartner?.id || !messageText.trim()) return;
    await api("/api/messages", {
      method: "POST",
      body: JSON.stringify({ receiverId: selectedPartner.id, text: messageText })
    });
    setMessageText("");
    await refresh();
  };

  const handleComposerSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedGroup) return;

    if (activeReplyPost) {
      const text = commentText.trim();
      if (!text || activeReplyPost.isLocked) return;
      await api(`/api/posts/${activeReplyPost.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ text })
      });
      setCommentText("");
      await refresh();
      return;
    }

    const text = postText.trim();
    if (!text) return;
    await api("/api/posts", {
      method: "POST",
      body: JSON.stringify({
        groupId: selectedGroup.id,
        text,
        imageUrl: postImage,
        type: "sale"
      })
    });
    setPostText("");
    setPostImage("");
    setUploadName("");
    await refresh();
  };

  if (loading) {
    return <div className="flex min-h-[100dvh] items-center justify-center">Loading</div>;
  }

  if (!currentUser) {
    return (
      <div className="min-h-[100dvh] bg-background px-4 py-6">
        <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-md flex-col justify-center rounded-[2rem] bg-white p-6 shadow-card">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-dark">
              <Store className="h-6 w-6" />
            </div>
            <div className="text-3xl font-black tracking-tight text-primary">SIZ</div>
          </div>

          <div className="mb-5 flex rounded-full bg-surface-soft p-1">
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold ${authMode === "login" ? "bg-white text-primary shadow-sm" : "text-text-muted"}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("register")}
              className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold ${authMode === "register" ? "bg-white text-primary shadow-sm" : "text-text-muted"}`}
            >
              Register
            </button>
          </div>

          {authMode === "login" ? (
            <form className="space-y-4" onSubmit={handleLogin}>
              <input
                value={loginForm.email}
                onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
                type="email"
                className="w-full rounded-2xl border border-surface-border bg-white px-4 py-4 text-right outline-none transition focus:border-primary"
                placeholder="Email"
              />
              <input
                value={loginForm.password}
                onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                type="password"
                className="w-full rounded-2xl border border-surface-border bg-white px-4 py-4 text-right outline-none transition focus:border-primary"
                placeholder="Password"
              />
              <button type="submit" className="w-full rounded-full bg-primary px-4 py-4 font-semibold text-white">
                Login
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleRegister}>
              <input
                value={registerForm.username}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, username: event.target.value }))}
                type="text"
                className="w-full rounded-2xl border border-surface-border bg-white px-4 py-4 text-right outline-none transition focus:border-primary"
                placeholder="Name"
              />
              <input
                value={registerForm.email}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))}
                type="email"
                className="w-full rounded-2xl border border-surface-border bg-white px-4 py-4 text-right outline-none transition focus:border-primary"
                placeholder="Email"
              />
              <input
                value={registerForm.password}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
                type="password"
                className="w-full rounded-2xl border border-surface-border bg-white px-4 py-4 text-right outline-none transition focus:border-primary"
                placeholder="Password"
              />
              <button type="submit" className="w-full rounded-full bg-primary px-4 py-4 font-semibold text-white">
                Register
              </button>
            </form>
          )}

          {error ? <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-danger">{error}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/90 px-4 py-4 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            {view === "groups" ? (
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary-dark">
                <Store className="h-6 w-6" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (view === "create") {
                    setView("join");
                  } else {
                    setView("groups");
                  }
                }}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-soft text-text"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="text-2xl font-black tracking-tight text-primary">SIZ</div>
          </div>
          <button
            type="button"
            onClick={() => setView("profile")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-soft text-text"
          >
            <UserRound className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 flex-1 max-w-5xl flex-col px-4 py-4">
        {!hasSeenIntro ? (
          <ShellCard className="mb-4 p-4 text-right">
            <div className="text-lg font-bold text-text">Welcome to SIZ</div>
            <div className="mt-2 text-sm leading-6 text-text-muted">
              Tap + to join groups. Open a group to publish posts, comment on threads, and message people from your profile.
            </div>
            <button
              type="button"
              onClick={() => {
                setHasSeenIntro(true);
                if (typeof window !== "undefined") {
                  window.localStorage.setItem("siz_seen_intro", "1");
                }
              }}
              className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Got it
            </button>
          </ShellCard>
        ) : null}

        {view === "groups" ? (
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-text">My groups</div>
              <button
                type="button"
                onClick={() => setView("join")}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-sm"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              {joinedGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    setSelectedGroupId(group.id);
                    setReplyTargetPostId("");
                    setCommentText("");
                    setPostText("");
                    setPostImage("");
                    setUploadName("");
                    setView("group");
                  }}
                  className="w-full rounded-2xl bg-white p-4 text-right shadow-card"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-text">{group.name}</div>
                    {group.isLocked ? <Lock className="h-4 w-4 text-text-muted" /> : null}
                  </div>
                </button>
              ))}
              {!joinedGroups.length ? (
                <ShellCard className="p-4 text-right">
                  <div className="text-lg font-bold text-text">No groups yet</div>
                </ShellCard>
              ) : null}
            </div>
          </div>
        ) : null}

        {view === "join" ? (
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setView("groups")}
                className="flex items-center gap-2 rounded-full bg-surface-soft px-4 py-2 text-sm font-semibold text-text"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <div className="text-lg font-bold text-text">All groups</div>
              <button
                type="button"
                onClick={() => setView("create")}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-sm"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              {availableGroups.map((group) => (
                <div key={group.id} className="rounded-2xl bg-white p-4 shadow-card">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-right">
                      <div className="text-lg font-bold text-text">{group.name}</div>
                      {group.isLocked ? <div className="mt-1 text-xs text-text-muted">Locked group</div> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleJoinGroup(group.id)}
                      className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
                    >
                      Join
                    </button>
                  </div>
                </div>
              ))}
              {!availableGroups.length ? (
                <ShellCard className="p-4 text-right">
                  <div className="text-lg font-bold text-text">No more groups</div>
                </ShellCard>
              ) : null}
            </div>
          </div>
        ) : null}

        {view === "create" ? (
          <form className="flex-1 space-y-3 rounded-2xl bg-white p-4 shadow-card" onSubmit={handleCreateGroup}>
            <div className="text-lg font-bold text-text">Create group</div>
            <input
              value={newGroup.name}
              onChange={(event) => setNewGroup((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-2xl border border-surface-border px-4 py-3 text-right outline-none focus:border-primary"
              placeholder="Group name"
            />
            <textarea
              value={newGroup.description}
              onChange={(event) => setNewGroup((prev) => ({ ...prev, description: event.target.value }))}
              className="min-h-28 w-full rounded-2xl border border-surface-border px-4 py-3 text-right outline-none focus:border-primary"
              placeholder="Description"
            />
            <label className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={newGroup.isLocked}
                onChange={(event) => setNewGroup((prev) => ({ ...prev, isLocked: event.target.checked }))}
              />
              Locked group
            </label>
            <button type="submit" className="w-full rounded-full bg-primary px-4 py-3 font-semibold text-white">
              Create
            </button>
          </form>
        ) : null}

        {view === "profile" ? (
          <div className="flex-1 space-y-3">
            <ShellCard className="p-4 text-right">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-text">{currentUser.username}</div>
                  <div className="mt-1 text-sm text-text-muted">{currentUser.email}</div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full bg-surface-soft px-4 py-2 text-sm font-semibold text-text"
                >
                  Logout
                </button>
              </div>
            </ShellCard>

            <ShellCard className="p-4 text-right">
              <div className="mb-3 text-lg font-bold text-text">Notifications</div>
              <div className="space-y-2">
                {recentNotifications.map((message) => {
                  const sender = userById(message.senderId);
                  return (
                    <div key={message.id} className="rounded-2xl bg-surface-soft px-3 py-2">
                      <div className="text-sm font-semibold text-text">{sender?.username ?? "Message"}</div>
                      <div className="text-sm text-text-muted">{message.text}</div>
                    </div>
                  );
                })}
                {!recentNotifications.length ? <div className="text-sm text-text-muted">No notifications</div> : null}
              </div>
            </ShellCard>

            <ShellCard className="p-4 text-right">
              <div className="mb-3 text-lg font-bold text-text">Private messages</div>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {messagePartners.map((partner) => (
                    <button
                      key={partner.id}
                      type="button"
                      onClick={() => setSelectedPartnerId(partner.id)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        selectedPartner?.id === partner.id ? "bg-primary text-white" : "bg-surface-soft text-text"
                      }`}
                    >
                      {partner.username}
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl bg-surface-soft p-3">
                  <div className="mb-3 max-h-72 space-y-2 overflow-y-auto">
                    {currentConversation.length ? (
                      currentConversation.map((message) => {
                        const mine = message.senderId === currentUser.id;
                        return (
                          <div
                            key={message.id}
                            className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                              mine ? "mr-auto bg-primary text-white" : "ml-auto bg-white text-text"
                            }`}
                          >
                            <div>{message.text}</div>
                            <div className={`mt-1 text-[11px] ${mine ? "text-white/70" : "text-text-muted"}`}>
                              {timeLabel(message.createdAt)}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm text-text-muted">Select a person to start a chat.</div>
                    )}
                  </div>
                  <form onSubmit={handleSendMessage} className="space-y-2">
                    <textarea
                      value={messageText}
                      onChange={(event) => setMessageText(event.target.value)}
                      className="min-h-20 w-full resize-none rounded-2xl border border-surface-border bg-white px-4 py-3 text-right outline-none focus:border-primary"
                      placeholder="Write a private message"
                    />
                    <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 font-semibold text-white">
                      <Send className="h-4 w-4" />
                      Send
                    </button>
                  </form>
                </div>
              </div>
            </ShellCard>
          </div>
        ) : null}

        {view === "group" && selectedGroup ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="text-lg font-bold text-text">{selectedGroup.name}</div>
                {selectedGroup.isLocked ? <Lock className="h-4 w-4 text-text-muted" /> : null}
              </div>
              <button
                type="button"
                onClick={() => handleLeaveGroup(selectedGroup.id)}
                className="rounded-full bg-surface-soft px-4 py-2 text-sm font-semibold text-text"
              >
                Leave
              </button>
            </div>

            {canManageGroup ? (
              <ShellCard className="mb-3 p-4 text-right">
                <div className="text-sm font-semibold text-text">Join requests</div>
                <div className="mt-3 space-y-2">
                  {data.joinRequests.filter((request) => request.groupId === selectedGroup.id).map((request) => {
                    const applicant = userById(request.userId);
                    return (
                      <div key={request.id} className="flex items-center justify-between rounded-2xl bg-surface-soft px-3 py-2">
                        <div className="text-sm text-text">{applicant?.username ?? "User"}</div>
                        <button
                          type="button"
                          onClick={() => handleApproveJoin(selectedGroup.id, request.userId)}
                          className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Approve
                        </button>
                      </div>
                    );
                  })}
                </div>
              </ShellCard>
            ) : null}

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-4">
              {groupPosts.map((post: Post) => {
                const author = userById(post.userId);
                const comments = data.comments
                  .filter((comment) => comment.postId === post.id)
                  .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
                const canManagePost = currentUser?.id === post.userId || canManageGroup;
                return (
                  <article key={post.id} className="rounded-2xl bg-white p-4 shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-semibold text-text">{author?.username ?? "User"}</div>
                      {post.isLocked ? (
                        <span className="rounded-full bg-surface-soft px-2 py-1 text-[11px] font-semibold text-text-muted">
                          Locked
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 text-right text-sm leading-6 text-text">{post.text}</div>
                    {post.imageUrl ? (
                      <div className="mt-3 overflow-hidden rounded-2xl">
                        <img src={post.imageUrl} alt="" className="h-auto w-full object-cover" />
                      </div>
                    ) : null}

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-surface-soft pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyTargetPostId(post.id);
                          setCommentText("");
                        }}
                        disabled={post.isLocked}
                        className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${
                          post.isLocked ? "bg-surface-soft text-text-muted" : "bg-primary text-white"
                        }`}
                      >
                        <MessageCircle className="h-4 w-4" />
                        Comment
                      </button>

                      {canManagePost ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleTogglePostLock(post.id, !post.isLocked)}
                            className="rounded-full bg-surface-soft px-3 py-2 text-sm font-semibold text-text"
                          >
                            {post.isLocked ? "Unlock" : "Lock"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                            className="rounded-full bg-red-50 px-3 py-2 text-sm font-semibold text-danger"
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 space-y-2 border-t border-surface-soft pt-3">
                      {comments.map((comment) => {
                        const commenter = userById(comment.userId);
                        return (
                          <div key={comment.id} className="rounded-2xl bg-surface-soft px-3 py-2 text-right">
                            <div className="text-xs font-semibold text-text">{commenter?.username ?? "User"}</div>
                            <div className="text-sm text-text">{comment.text}</div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>

            <form onSubmit={handleComposerSubmit} className="sticky bottom-0 rounded-2xl bg-white p-4 shadow-card">
              {activeReplyPost ? (
                <div className="mb-3 flex items-center justify-between rounded-2xl bg-surface-soft px-3 py-2 text-sm text-text">
                  <div className="truncate">
                    Replying to {activeReplyAuthor?.username ?? "thread"}
                    {activeReplyPost.isLocked ? " · locked" : ""}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyTargetPostId("");
                      setCommentText("");
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-text"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}

              <textarea
                value={activeReplyPost ? commentText : postText}
                onChange={(event) => {
                  if (activeReplyPost) {
                    setCommentText(event.target.value);
                  } else {
                    setPostText(event.target.value);
                  }
                }}
                className="min-h-24 w-full resize-none rounded-2xl border border-surface-border bg-white px-4 py-3 text-right outline-none focus:border-primary"
                placeholder={activeReplyPost ? "Write a comment" : "Write a post"}
                disabled={Boolean(activeReplyPost?.isLocked)}
              />

              {!activeReplyPost ? (
                <div className="mt-3 space-y-3">
                  {postImage ? (
                    <div className="overflow-hidden rounded-2xl">
                      <img src={postImage} alt="" className="h-auto w-full object-cover" />
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex cursor-pointer items-center gap-2 rounded-full bg-surface-soft px-4 py-2 text-sm font-semibold text-text">
                      <Upload className="h-4 w-4" />
                      <span>{uploadName || "Image"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => handleImageInput(event.target.files?.[0] ?? null)}
                      />
                    </label>
                    <button type="submit" className="rounded-full bg-primary px-5 py-3 font-semibold text-white">
                      Publish
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-end">
                  <button
                    type="submit"
                    className="rounded-full bg-primary px-5 py-3 font-semibold text-white"
                    disabled={Boolean(activeReplyPost?.isLocked)}
                  >
                    Comment
                  </button>
                </div>
              )}
            </form>
          </div>
        ) : null}
      </main>

      {error ? (
        <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-white px-4 py-3 text-right text-sm text-danger shadow-lift">
          {error}
        </div>
      ) : null}
    </div>
  );
}
