"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { io } from "socket.io-client";
import { ArrowLeft, Ban, Check, LogOut, Lock, MessageCircle, Plus, Send, ShieldCheck, Store, Trash2, Unlock, Upload, UserRound, X } from "lucide-react";
import type { BootstrapPayload, Comment, Group, Post } from "@/lib/types";

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
    throw new Error(payload.error || "An error occurred");
  }

  return payload as T;
};

const timeLabel = (value: string) =>
  new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));

const dateTimeLabel = (value: string) =>
  new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
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

type ConfirmAction = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
};

export default function CommunityApp() {
  const [data, setData] = useState<AppData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("groups");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [replyTargetPostId, setReplyTargetPostId] = useState("");
  const [replyTargetCommentId, setReplyTargetCommentId] = useState("");
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
  const [newGroup, setNewGroup] = useState({ name: "", description: "", requiresApproval: false });
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const selectedGroupIdRef = useRef("");

  const currentUser = data.currentUser;
  const currentUserDetail = data.currentUserDetail;
  const isSuperUser = Boolean(currentUserDetail?.isSuperUser);
  const isWriteBlockedUser = Boolean(!isSuperUser && (currentUserDetail?.isLocked || currentUserDetail?.isDisabled));

  const userById = (id: string) => data.users.find((user) => user.id === id);

  const joinedGroups = useMemo(() => {
    if (isSuperUser) return data.groups;
    const joinedIds = new Set(currentUserDetail?.joinedGroupIds ?? []);
    return data.groups.filter((group) => joinedIds.has(group.id));
  }, [currentUserDetail?.joinedGroupIds, data.groups, isSuperUser]);

  const availableGroups = useMemo(() => {
    if (isSuperUser) return [];
    const joinedIds = new Set(currentUserDetail?.joinedGroupIds ?? []);
    return data.groups.filter((group) => !joinedIds.has(group.id));
  }, [currentUserDetail?.joinedGroupIds, data.groups, isSuperUser]);

  const selectedGroup = useMemo(
    () => data.groups.find((group) => group.id === selectedGroupId) ?? null,
    [data.groups, selectedGroupId]
  );
  const selectedGroupAdmin = selectedGroup ? userById(selectedGroup.adminId) ?? null : null;

  const groupPosts = useMemo(() => {
    if (!selectedGroup) return [];
    return data.posts
      .filter((post) => post.groupId === selectedGroup.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [data.posts, selectedGroup]);

  const activeReplyPost = replyTargetPostId ? data.posts.find((post) => post.id === replyTargetPostId) ?? null : null;
  const activeReplyComment = replyTargetCommentId ? data.comments.find((comment) => comment.id === replyTargetCommentId) ?? null : null;
  const activeReplyAuthor = activeReplyComment ? userById(activeReplyComment.userId) : activeReplyPost ? userById(activeReplyPost.userId) : null;
  const canManageGroup = Boolean(currentUser && selectedGroup && (isSuperUser || currentUser.id === selectedGroup.adminId));
  const canAccessSelectedGroup = Boolean(
    selectedGroup && (isSuperUser || selectedGroup.adminId === currentUser?.id || selectedGroup.memberIds.includes(currentUser?.id ?? ""))
  );
  const canWriteInSelectedGroup = Boolean(
    selectedGroup &&
      canAccessSelectedGroup &&
      (isSuperUser || (!selectedGroup.isLocked && !selectedGroup.isDisabled)) &&
      !isWriteBlockedUser
  );
  const adminGroups = useMemo(
    () => (isSuperUser ? data.groups : data.groups.filter((group) => group.adminId === currentUser?.id)),
    [data.groups, currentUser?.id, isSuperUser]
  );
  const adminUsers = useMemo(
    () => data.users.filter((user) => user.id !== currentUser?.id),
    [data.users, currentUser?.id]
  );
  const adminPosts = useMemo(
    () =>
      data.posts
        .filter((post) => isSuperUser || adminGroups.some((group) => group.id === post.groupId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [adminGroups, data.posts, isSuperUser]
  );

  const messagePartners = useMemo(() => {
    const partnerIds = new Set<string>();
    data.messages.forEach((message) => {
      if (message.senderId === currentUser?.id) partnerIds.add(message.receiverId);
      if (message.receiverId === currentUser?.id) partnerIds.add(message.senderId);
    });
    return [...partnerIds].map((id) => userById(id)).filter(Boolean) as PublicUser[];
  }, [data.messages, currentUser?.id, data.users]);

  const groupContacts = useMemo(() => {
    const ids = new Set<string>();
    (isSuperUser ? data.groups : joinedGroups).forEach((group) => {
      group.memberIds.forEach((id) => {
        if (id !== currentUser?.id) ids.add(id);
      });
    });
    return [...ids].map((id) => userById(id)).filter(Boolean) as PublicUser[];
  }, [joinedGroups, currentUser?.id, data.users, isSuperUser, data.groups]);

  const selectedPartner = selectedPartnerId ? userById(selectedPartnerId) ?? null : messagePartners[0] ?? groupContacts[0] ?? null;
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

  const openPrivateMessage = (userId: string) => {
    if (!userId || userId === currentUser?.id) return;
    setSelectedPartnerId(userId);
    setMessageText("");
    setView("profile");
  };

  const askConfirm = (action: ConfirmAction) => {
    setConfirmAction(action);
  };

  const runConfirm = async () => {
    if (!confirmAction) return;
    const action = confirmAction;
    setConfirmAction(null);
    await action.onConfirm();
  };

  const refresh = async () => {
    const payload = await api<AppData>("/api/bootstrap");
    setData(payload);
    const joined = payload.groups.filter((group) => (payload.currentUserDetail?.joinedGroupIds ?? []).includes(group.id));
    if (!selectedGroupIdRef.current && joined[0]) {
      setSelectedGroupId(joined[0].id);
    }
  };

  useEffect(() => {
    selectedGroupIdRef.current = selectedGroupId;
  }, [selectedGroupId]);

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
      setReplyTargetCommentId("");
    }
  }, [groupPosts, replyTargetPostId, selectedGroup]);

  useEffect(() => {
    if (replyTargetCommentId && !data.comments.some((comment) => comment.id === replyTargetCommentId)) {
      setReplyTargetCommentId("");
    }
  }, [data.comments, replyTargetCommentId]);

  useEffect(() => {
    if (!selectedPartnerId && messagePartners[0]) {
      setSelectedPartnerId(messagePartners[0].id);
    }
  }, [messagePartners, selectedPartnerId]);

  useEffect(() => {
    if (selectedGroupId && selectedGroup && !canAccessSelectedGroup) {
      setSelectedGroupId("");
      setView("groups");
    }
  }, [canAccessSelectedGroup, selectedGroup, selectedGroupId]);

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
    setReplyTargetCommentId("");
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
    setReplyTargetCommentId("");
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
    setNewGroup({ name: "", description: "", requiresApproval: false });
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

  const handleRejectJoin = async (groupId: string, userId: string) => {
    await api(`/api/groups/${groupId}/reject`, {
      method: "POST",
      body: JSON.stringify({ userId })
    });
    await refresh();
  };

  const handleToggleGroupLock = async (groupId: string, locked: boolean) => {
    await api(`/api/groups/${groupId}`, {
      method: "PATCH",
      body: JSON.stringify({ isLocked: locked })
    });
    await refresh();
  };

  const handleToggleGroupDisabled = async (groupId: string, disabled: boolean) => {
    await api(`/api/groups/${groupId}`, {
      method: "PATCH",
      body: JSON.stringify({ isDisabled: disabled })
    });
    await refresh();
  };

  const handleDeleteGroup = async (groupId: string) => {
    await api(`/api/groups/${groupId}`, { method: "DELETE" });
    if (selectedGroupId === groupId) {
      setSelectedGroupId("");
    }
    await refresh();
    setView("groups");
  };

  const handleTogglePostLock = async (postId: string, locked: boolean) => {
    await api(`/api/posts/${postId}`, {
      method: "PATCH",
      body: JSON.stringify({ locked })
    });
    await refresh();
  };

  const handleTogglePostDisabled = async (postId: string, disabled: boolean) => {
    await api(`/api/posts/${postId}`, {
      method: "PATCH",
      body: JSON.stringify({ isDisabled: disabled })
    });
    await refresh();
  };

  const handleDeletePost = async (postId: string) => {
    await api(`/api/posts/${postId}`, {
      method: "DELETE"
    });
    if (replyTargetPostId === postId) {
      setReplyTargetPostId("");
      setReplyTargetCommentId("");
      setCommentText("");
    }
    await refresh();
  };

  const handleToggleUserLock = async (userId: string, locked: boolean) => {
    await api(`/api/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ locked })
    });
    await refresh();
  };

  const handleToggleUserDisabled = async (userId: string, disabled: boolean) => {
    await api(`/api/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ isDisabled: disabled })
    });
    await refresh();
  };

  const handleDeleteUser = async (userId: string) => {
    await api(`/api/users/${userId}`, { method: "DELETE" });
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
    const currentGroupId = selectedGroup.id;

    if (activeReplyPost) {
      const text = commentText.trim();
      if (!text || (!isSuperUser && activeReplyPost.isLocked)) return;
      await api(`/api/posts/${activeReplyPost.id}/comments`, {
        method: "POST",
        body: JSON.stringify({
          text,
          parentCommentId: replyTargetCommentId || null
        })
      });
      setCommentText("");
      setReplyTargetPostId("");
      setReplyTargetCommentId("");
      await refresh();
      setSelectedGroupId(currentGroupId);
      setView("group");
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
    setSelectedGroupId(currentGroupId);
    setView("group");
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
    <div className="flex min-h-[100dvh] w-full flex-col overflow-hidden bg-background">
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/90 px-3 py-3 shadow-sm backdrop-blur">
        <div className="flex w-full items-center justify-between">
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

      <main className="flex min-h-0 flex-1 flex-col px-3 py-3">
        {!hasSeenIntro ? (
          <ShellCard className="mb-4 p-4 text-right">
            <div className="text-lg font-bold text-text">Welcome to SIZ</div>
            <div className="mt-2 text-sm leading-6 text-text-muted">
              Create and join community groups, post items, reply to threads, and send private messages.
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
              Continue
            </button>
          </ShellCard>
        ) : null}

        {isWriteBlockedUser ? (
          <ShellCard className="mb-4 p-4 text-right">
            <div className="text-lg font-bold text-danger">Write access blocked</div>
            <div className="mt-1 text-sm text-text-muted">Your account is disabled or locked, so you can only browse content.</div>
          </ShellCard>
        ) : null}

        {view === "groups" ? (
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
                <div className="text-lg font-bold text-text">My groups</div>
              <button
                type="button"
                onClick={() => setView("join")}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-sm"
                title="Add group"
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
                    setReplyTargetCommentId("");
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
                    <div className="flex items-center gap-2 text-text-muted">
                      {group.isDisabled ? <Ban className="h-4 w-4" aria-label="disabled" /> : null}
                      {group.isLocked ? <Lock className="h-4 w-4" aria-label="locked" /> : null}
                        {isSuperUser || group.adminId === currentUser?.id ? <ShieldCheck className="h-4 w-4 text-primary" aria-label="admin" /> : null}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-text-muted">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {userById(group.adminId)?.username ?? "Admin"}
                    </span>
                    {group.requiresApproval ? <span className="inline-flex items-center gap-1"><Lock className="h-3.5 w-3.5" />Approval required</span> : null}
                  </div>
                </button>
              ))}
              {!joinedGroups.length ? (
                <ShellCard className="p-4 text-right">
                  <div className="text-lg font-bold text-text">No joined groups yet</div>
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
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft text-text"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="text-lg font-bold text-text">All groups</div>
              <button
                type="button"
                onClick={() => setView("create")}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-sm"
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
                                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-text-muted">
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {userById(group.adminId)?.username ?? "Admin"}
                        </span>
                        {group.requiresApproval ? <span className="inline-flex items-center gap-1"><Lock className="h-3.5 w-3.5" />Approval required</span> : null}
                        {group.isLocked ? <span className="inline-flex items-center gap-1"><Lock className="h-3.5 w-3.5" />Locked</span> : null}
                        {group.isDisabled ? <span className="inline-flex items-center gap-1"><Ban className="h-3.5 w-3.5" />Disabled</span> : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleJoinGroup(group.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50"
                      disabled={isWriteBlockedUser}
                      aria-label="join"
                    >
                      <Plus className="h-4 w-4" />
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
                checked={newGroup.requiresApproval}
                onChange={(event) => setNewGroup((prev) => ({ ...prev, requiresApproval: event.target.checked }))}
              />
              Requires approval to join
            </label>
            <button type="submit" className="w-full rounded-full bg-primary px-4 py-3 font-semibold text-white disabled:opacity-50" disabled={isWriteBlockedUser}>
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
                  onClick={() =>
                    askConfirm({
                      title: "Log out",
                      description: "Sign out of this account?",
                      confirmLabel: "Log out",
                      onConfirm: handleLogout
                    })
                  }
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-soft text-text"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </ShellCard>

            <ShellCard className="p-4 text-right">
              <div className="mb-3 text-lg font-bold text-text">Notifications</div>
              <div className="space-y-2">
                {recentNotifications.map((message) => {
                  const sender = userById(message.senderId);
                  return (
                    <button
                      type="button"
                      key={message.id}
                      onClick={() => openPrivateMessage(message.senderId)}
                      className="w-full rounded-2xl bg-surface-soft px-3 py-2 text-right"
                    >
                      <div className="text-sm font-semibold text-text">{sender?.username ?? "User"}</div>
                      <div className="text-sm text-text-muted">{message.text}</div>
                    </button>
                  );
                })}
                {!recentNotifications.length ? <div className="text-sm text-text-muted">No notifications</div> : null}
              </div>
            </ShellCard>

            <ShellCard className="p-4 text-right">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-lg font-bold text-text">Private messages</div>
                <div className="text-xs text-text-muted">Tap a name to open a chat</div>
              </div>
              <div className="mb-3">
                <div className="mb-2 text-xs font-semibold text-text-muted">Members</div>
                <div className="flex flex-wrap gap-2">
                  {groupContacts.map((partner) => (
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
                  {!groupContacts.length ? <div className="text-sm text-text-muted">Join a group to find people</div> : null}
                </div>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
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
                {!messagePartners.length ? <div className="text-sm text-text-muted">No chats yet</div> : null}
              </div>

              <div className="rounded-2xl bg-surface-soft p-3">
                <div className="mb-3 max-h-72 space-y-2 overflow-y-auto">
                  {currentConversation.length ? (
                    currentConversation.map((message) => {
                      const mine = message.senderId === currentUser.id;
                      const sender = userById(message.senderId);
                      return (
                        <button
                          type="button"
                          key={message.id}
                          onClick={() => openPrivateMessage(message.senderId === currentUser.id ? message.receiverId : message.senderId)}
                          className={`block w-full max-w-[90%] rounded-2xl px-3 py-2 text-right text-sm ${
                            mine ? "mr-auto bg-primary text-white" : "ml-auto bg-white text-text"
                          }`}
                        >
                          <div className="text-xs font-semibold opacity-80">{mine ? "You" : sender?.username ?? "User"}</div>
                          <div className="mt-1">{message.text}</div>
                          <div className={`mt-1 text-[11px] ${mine ? "text-white/70" : "text-text-muted"}`}>
                            {dateTimeLabel(message.createdAt)}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-sm text-text-muted">Choose a person to start chatting</div>
                  )}
                </div>
                <form onSubmit={handleSendMessage} className="space-y-2">
                  <textarea
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    className="min-h-20 w-full resize-none rounded-2xl border border-surface-border bg-white px-4 py-3 text-right outline-none focus:border-primary"
                    placeholder={selectedPartner ? `Message ${selectedPartner.username}` : "Choose a person first"}
                    disabled={!selectedPartner}
                  />
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 font-semibold text-white disabled:opacity-50"
                    disabled={!selectedPartner || isWriteBlockedUser}
                    aria-label="send message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </ShellCard>

            {data.groups.length ? (
              <ShellCard className="p-4 text-right">
                <div className="mb-3 text-lg font-bold text-text">Admin panel</div>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-text">Groups</div>
                    {data.groups.map((group) => (
                      <div key={group.id} className="rounded-2xl bg-surface-soft p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-text">{group.name}</div>
                            <div className="text-xs text-text-muted inline-flex items-center gap-1">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              {userById(group.adminId)?.username ?? "Admin"}
                            </div>
                            <div className="text-xs text-text-muted">
                              {group.requiresApproval ? "Approval required" : "Open group"}
                              {group.isLocked ? " · Locked" : ""}
                            </div>
                          </div>
                        {isSuperUser || group.adminId === currentUser?.id ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              askConfirm({
                                title: group.isLocked ? "Unlock group" : "Lock group",
                                description: group.isLocked ? "Allow writing in this group?" : "Make this group read only?",
                                confirmLabel: group.isLocked ? "Unlock" : "Lock",
                                onConfirm: () => handleToggleGroupLock(group.id, !group.isLocked)
                              })
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-text"
                            aria-label="toggle group lock"
                          >
                            {group.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              askConfirm({
                                title: group.isDisabled ? "Enable group" : "Disable group",
                                description: group.isDisabled ? "Restore this group?" : "Disable this group?",
                                confirmLabel: group.isDisabled ? "Enable" : "Disable",
                                onConfirm: () => handleToggleGroupDisabled(group.id, !group.isDisabled)
                              })
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-text"
                            aria-label="toggle group disabled"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              askConfirm({
                                title: "Delete group",
                                description: "Delete this group and all its threads?",
                                confirmLabel: "Delete",
                                onConfirm: () => handleDeleteGroup(group.id)
                              })
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-danger"
                            aria-label="delete group"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        ) : (
                          <div className="text-xs text-text-muted">Read only</div>
                        )}
                        </div>
                        {isSuperUser || group.adminId === currentUser?.id ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {group.pendingMemberIds.map((userId) => {
                            const pendingUser = userById(userId);
                            return (
                              <div key={userId} className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs">
                                <button type="button" className="font-semibold text-text" onClick={() => openPrivateMessage(userId)}>
                                  {pendingUser?.username ?? "User"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApproveJoin(group.id, userId)}
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white"
                                  aria-label="approve"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectJoin(group.id, userId)}
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-danger"
                                  aria-label="reject"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-text">Users</div>
                    {adminUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-soft px-3 py-2">
                        <button type="button" onClick={() => openPrivateMessage(user.id)} className="text-right">
                          <div className="font-semibold text-text">{user.username}</div>
                            <div className="text-xs text-text-muted">{user.isDisabled ? "Disabled" : user.isLocked ? "Locked" : "Active"}</div>
                        </button>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              askConfirm({
                                title: user.isLocked ? "Unlock user" : "Lock user",
                                description: user.isLocked ? "Allow this user to write again?" : "Make this user read only?",
                                confirmLabel: user.isLocked ? "Unlock" : "Lock",
                                onConfirm: () => handleToggleUserLock(user.id, !user.isLocked)
                              })
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-text"
                            aria-label="toggle user lock"
                          >
                            {user.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              askConfirm({
                                title: user.isDisabled ? "Enable user" : "Disable user",
                                description: user.isDisabled ? "Allow this user to write again?" : "Disable this user?",
                                confirmLabel: user.isDisabled ? "Enable" : "Disable",
                                onConfirm: () => handleToggleUserDisabled(user.id, !user.isDisabled)
                              })
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-text"
                            aria-label="toggle user disabled"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              askConfirm({
                                title: "Delete user",
                                description: "Delete this user and their content?",
                                confirmLabel: "Delete",
                                onConfirm: () => handleDeleteUser(user.id)
                              })
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-danger"
                            aria-label="delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-text">Threads</div>
                    {adminPosts.map((post) => {
                      const postGroup = data.groups.find((group) => group.id === post.groupId);
                      const author = userById(post.userId);
                      return (
                        <div key={post.id} className="rounded-2xl bg-surface-soft p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-text">{author?.username ?? "User"}</div>
                              <div className="text-xs text-text-muted">{postGroup?.name ?? "Group"}</div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  askConfirm({
                                    title: post.isLocked ? "Unlock thread" : "Lock thread",
                                    description: post.isLocked ? "Allow comments on this thread?" : "Stop comments on this thread?",
                                    confirmLabel: post.isLocked ? "Unlock" : "Lock",
                                    onConfirm: () => handleTogglePostLock(post.id, !post.isLocked)
                                  })
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-text"
                                aria-label="toggle thread lock"
                              >
                                {post.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  askConfirm({
                                    title: post.isDisabled ? "Enable thread" : "Disable thread",
                                    description: post.isDisabled ? "Restore comments on this thread?" : "Disable this thread?",
                                    confirmLabel: post.isDisabled ? "Enable" : "Disable",
                                    onConfirm: () => handleTogglePostDisabled(post.id, !post.isDisabled)
                                  })
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-text"
                                aria-label="toggle thread disabled"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  askConfirm({
                                    title: "Delete thread",
                                    description: "Delete this thread and its comments?",
                                    confirmLabel: "Delete",
                                    onConfirm: () => handleDeletePost(post.id)
                                  })
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-danger"
                                aria-label="delete thread"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ShellCard>
            ) : null}
          </div>
        ) : null}

        {view === "group" && selectedGroup && canAccessSelectedGroup ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="text-lg font-bold text-text">{selectedGroup.name}</div>
                {selectedGroup.isLocked ? <Lock className="h-4 w-4 text-text-muted" aria-label="locked" /> : null}
                {selectedGroup.isDisabled ? <Ban className="h-4 w-4 text-text-muted" aria-label="disabled" /> : null}
                {isSuperUser || selectedGroup.adminId === currentUser?.id ? <ShieldCheck className="h-4 w-4 text-primary" aria-label="admin" /> : null}
              </div>
              <div className="flex items-center gap-2">
                {canManageGroup ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        askConfirm({
                          title: selectedGroup.isLocked ? "Unlock group" : "Lock group",
                          description: selectedGroup.isLocked ? "Allow writing in this group?" : "Make this group read only?",
                          confirmLabel: selectedGroup.isLocked ? "Unlock" : "Lock",
                          onConfirm: () => handleToggleGroupLock(selectedGroup.id, !selectedGroup.isLocked)
                        })
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft text-text"
                      aria-label="toggle group lock"
                    >
                      {selectedGroup.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        askConfirm({
                          title: selectedGroup.isDisabled ? "Enable group" : "Disable group",
                          description: selectedGroup.isDisabled ? "Restore writing in this group?" : "Disable this group?",
                          confirmLabel: selectedGroup.isDisabled ? "Enable" : "Disable",
                          onConfirm: () => handleToggleGroupDisabled(selectedGroup.id, !selectedGroup.isDisabled)
                        })
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft text-text"
                      aria-label="toggle group disabled"
                    >
                      <Ban className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        askConfirm({
                          title: "Delete group",
                          description: "Delete this group and all its threads?",
                          confirmLabel: "Delete",
                          onConfirm: () => handleDeleteGroup(selectedGroup.id)
                        })
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    askConfirm({
                      title: "Leave group",
                      description: "Leave this group?",
                      confirmLabel: "Leave",
                      onConfirm: () => handleLeaveGroup(selectedGroup.id)
                    })
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft text-text disabled:opacity-50"
                  disabled={isWriteBlockedUser}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mb-3 flex items-center justify-between text-xs text-text-muted">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                {selectedGroupAdmin?.username ?? "Admin"}
              </span>
              {selectedGroup.requiresApproval ? <span className="inline-flex items-center gap-1"><Lock className="h-3.5 w-3.5" />Approval required</span> : null}
            </div>

            {canManageGroup && data.joinRequests.some((request) => request.groupId === selectedGroup.id) ? (
              <ShellCard className="mb-3 p-4 text-right">
                <div className="text-sm font-semibold text-text">Join requests</div>
                <div className="mt-3 space-y-2">
                  {data.joinRequests.filter((request) => request.groupId === selectedGroup.id).map((request) => {
                    const applicant = userById(request.userId);
                    return (
                      <div key={request.id} className="flex items-center justify-between rounded-2xl bg-surface-soft px-3 py-2">
                        <button type="button" onClick={() => openPrivateMessage(request.userId)} className="text-sm text-text">
                          {applicant?.username ?? "User"}
                        </button>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveJoin(selectedGroup.id, request.userId)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50"
                            disabled={isWriteBlockedUser}
                            aria-label="approve"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectJoin(selectedGroup.id, request.userId)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-danger disabled:opacity-50"
                            disabled={isWriteBlockedUser}
                            aria-label="reject"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
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
                const canManagePost = isSuperUser || currentUser?.id === post.userId || canManageGroup;
                const rootComments: Comment[] = [];
                const commentChildren = new Map<string, Comment[]>();
                comments.forEach((comment) => {
                  if (comment.parentCommentId) {
                    const children = commentChildren.get(comment.parentCommentId) ?? [];
                    children.push(comment);
                    commentChildren.set(comment.parentCommentId, children);
                    return;
                  }
                  rootComments.push(comment);
                });
                const renderCommentNode = (comment: Comment, depth = 0): ReactNode => {
                  const commenter = userById(comment.userId);
                  const replyDisabled = !canWriteInSelectedGroup || (!isSuperUser && (post.isLocked || post.isDisabled));
                  const children = commentChildren.get(comment.id) ?? [];
                  return (
                    <div key={comment.id} className={depth > 0 ? "mr-6 border-r border-primary/15 pr-3" : ""}>
                      <div className="rounded-2xl bg-surface-soft px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => openPrivateMessage(comment.userId)}
                          className="text-xs font-semibold text-text"
                        >
                          {commenter?.username ?? "User"}
                        </button>
                        <div className="mt-1 text-sm text-text">{comment.text}</div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="text-[11px] text-text-muted">{dateTimeLabel(comment.createdAt)}</div>
                          <button
                            type="button"
                            onClick={() => {
                              setReplyTargetPostId(post.id);
                              setReplyTargetCommentId(comment.id);
                              setCommentText("");
                            }}
                            disabled={replyDisabled}
                            className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-semibold text-primary disabled:opacity-50"
                            aria-label="reply to comment"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            Reply
                          </button>
                        </div>
                      </div>
                      {children.length ? <div className="mt-2 space-y-2">{children.map((child) => renderCommentNode(child, depth + 1))}</div> : null}
                    </div>
                  );
                };
                return (
                  <article key={post.id} className="rounded-2xl bg-white p-4 shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => openPrivateMessage(post.userId)}
                        className="text-sm font-semibold text-text"
                      >
                        {author?.username ?? "User"}
                      </button>
                      <div className="flex items-center gap-2 text-text-muted">
                        {post.isDisabled ? <Ban className="h-4 w-4" aria-label="disabled" /> : null}
                        {post.isLocked ? <Lock className="h-4 w-4" aria-label="locked" /> : null}
                      </div>
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
                          setReplyTargetCommentId("");
                          setCommentText("");
                        }}
                        disabled={!canWriteInSelectedGroup || (!isSuperUser && (post.isLocked || post.isDisabled))}
                        className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${
                          !canWriteInSelectedGroup || (!isSuperUser && (post.isLocked || post.isDisabled)) ? "bg-surface-soft text-text-muted" : "bg-primary text-white"
                        }`}
                        aria-label="comment"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>

                      {canManagePost ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleTogglePostLock(post.id, !post.isLocked)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-soft text-text"
                            aria-label="toggle thread lock"
                          >
                            {post.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTogglePostDisabled(post.id, !post.isDisabled)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-soft text-text"
                            aria-label="toggle thread disabled"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-danger"
                            aria-label="delete thread"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 space-y-2 border-t border-surface-soft pt-3">
                      {rootComments.map((comment) => renderCommentNode(comment))}
                    </div>
                  </article>
                );
              })}
            </div>

            <form onSubmit={handleComposerSubmit} className="shrink-0 rounded-2xl bg-white p-4 shadow-card">
              {activeReplyPost ? (
                <div className="mb-3 flex items-center justify-between rounded-2xl bg-surface-soft px-3 py-2 text-sm text-text">
                  <div className="truncate">
                    Replying to {activeReplyComment ? "comment by " : ""}
                    {activeReplyAuthor?.username ?? "thread"}
                    {activeReplyPost.isLocked ? " · Locked" : ""}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyTargetPostId("");
                      setReplyTargetCommentId("");
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
                placeholder={activeReplyPost ? "Write a reply" : "Write a post"}
                disabled={Boolean(!canWriteInSelectedGroup || (!isSuperUser && (activeReplyPost?.isLocked || activeReplyPost?.isDisabled)))}
              />

              {!activeReplyPost ? (
                <div className="mt-3 space-y-3">
                  {postImage ? (
                    <div className="overflow-hidden rounded-2xl">
                      <img src={postImage} alt="" className="h-auto w-full object-cover" />
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-surface-soft text-text">
                      <Upload className="h-4 w-4" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => handleImageInput(event.target.files?.[0] ?? null)}
                      />
                    </label>
                    <button type="submit" className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50" disabled={!canWriteInSelectedGroup} aria-label="publish">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-end">
                  <button
                    type="submit"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50"
                    disabled={Boolean(!canWriteInSelectedGroup || (!isSuperUser && (activeReplyPost?.isLocked || activeReplyPost?.isDisabled)))}
                    aria-label="comment"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                </div>
              )}
            </form>
          </div>
        ) : null}

        {view === "group" && selectedGroup && !canAccessSelectedGroup ? (
          <ShellCard className="p-4 text-right">
            <div className="text-lg font-bold text-text">Access denied</div>
            <div className="mt-1 text-sm text-text-muted">This group is locked or you do not have permission to access it.</div>
          </ShellCard>
        ) : null}
      </main>

      {confirmAction ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-3 py-3 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-4 shadow-lift">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-text">{confirmAction.title}</div>
                <div className="mt-1 text-sm leading-6 text-text-muted">{confirmAction.description}</div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="flex-1 rounded-full bg-surface-soft px-4 py-3 font-semibold text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runConfirm}
                className="flex-1 rounded-full bg-primary px-4 py-3 font-semibold text-white"
              >
                {confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-white px-4 py-3 text-right text-sm text-danger shadow-lift">
          {error}
        </div>
      ) : null}
    </div>
  );
}


