"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { io } from "socket.io-client";
import type { BootstrapPayload, Group, Post } from "@/lib/types";
import { ArrowLeft, ImagePlus, LogOut, Plus, Send, Store, Upload } from "lucide-react";

type PublicUser = BootstrapPayload["users"][number];

type AppData = BootstrapPayload & {
  currentUserDetail: PublicUser | null;
};

type View = "groups" | "group" | "join";

const emptyData: AppData = {
  currentUser: null,
  users: [],
  groups: [],
  posts: [],
  comments: [],
  messages: [],
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
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginForm, setLoginForm] = useState(authDefaults.login);
  const [registerForm, setRegisterForm] = useState(authDefaults.register);
  const [view, setView] = useState<View>("groups");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [postText, setPostText] = useState("");
  const [postImage, setPostImage] = useState("");
  const [uploadName, setUploadName] = useState("");

  const currentUser = data.currentUser;
  const currentUserDetail = data.currentUserDetail;

  const joinedGroups = useMemo(() => {
    const joinedIds = new Set(currentUserDetail?.joinedGroupIds ?? []);
    return data.groups.filter((group) => joinedIds.has(group.id));
  }, [currentUserDetail?.joinedGroupIds, data.groups]);

  const availableGroups = useMemo(() => {
    const joinedIds = new Set(currentUserDetail?.joinedGroupIds ?? []);
    return data.groups.filter((group) => !joinedIds.has(group.id));
  }, [currentUserDetail?.joinedGroupIds, data.groups]);

  const selectedGroup = useMemo(() => {
    return data.groups.find((group) => group.id === selectedGroupId) ?? null;
  }, [data.groups, selectedGroupId]);

  const groupPosts = useMemo(() => {
    if (!selectedGroup) return [];
    return data.posts
      .filter((post) => post.groupId === selectedGroup.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [data.posts, selectedGroup]);

  const userById = (id: string) => data.users.find((user) => user.id === id);

  const refresh = async () => {
    const payload = await api<AppData>("/api/bootstrap");
    setData(payload);
    const currentJoined = payload.groups.filter((group) => (payload.currentUserDetail?.joinedGroupIds ?? []).includes(group.id));
    if (!selectedGroupId && currentJoined[0]) {
      setSelectedGroupId(currentJoined[0].id);
    }
  };

  useEffect(() => {
    refresh()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
  };

  const handleLogout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    clearStoredToken();
    setData(emptyData);
    setView("groups");
    setSelectedGroupId("");
    setPostText("");
    setPostImage("");
    setUploadName("");
  };

  const handleJoinGroup = async (groupId: string) => {
    await api(`/api/groups/${groupId}/join`, { method: "POST" });
    await refresh();
    setView("groups");
  };

  const handlePost = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedGroup) return;
    await api("/api/posts", {
      method: "POST",
      body: JSON.stringify({
        groupId: selectedGroup.id,
        text: postText,
        imageUrl: postImage,
        type: "sale"
      })
    });
    setPostText("");
    setPostImage("");
    setUploadName("");
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center px-6">טוען</div>;
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen px-4 py-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md flex-col justify-center rounded-[2rem] bg-white p-6 shadow-card">
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
              כניסה
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("register")}
              className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold ${authMode === "register" ? "bg-white text-primary shadow-sm" : "text-text-muted"}`}
            >
              הרשמה
            </button>
          </div>

          {authMode === "login" ? (
            <form className="space-y-4" onSubmit={handleLogin}>
              <input
                value={loginForm.email}
                onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
                type="email"
                className="w-full rounded-2xl border border-surface-border bg-white px-4 py-4 text-right outline-none transition focus:border-primary"
                placeholder="אימייל"
              />
              <input
                value={loginForm.password}
                onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                type="password"
                className="w-full rounded-2xl border border-surface-border bg-white px-4 py-4 text-right outline-none transition focus:border-primary"
                placeholder="סיסמה"
              />
              <button type="submit" className="w-full rounded-full bg-primary px-4 py-4 font-semibold text-white">
                כניסה
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleRegister}>
              <input
                value={registerForm.username}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, username: event.target.value }))}
                type="text"
                className="w-full rounded-2xl border border-surface-border bg-white px-4 py-4 text-right outline-none transition focus:border-primary"
                placeholder="שם"
              />
              <input
                value={registerForm.email}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))}
                type="email"
                className="w-full rounded-2xl border border-surface-border bg-white px-4 py-4 text-right outline-none transition focus:border-primary"
                placeholder="אימייל"
              />
              <input
                value={registerForm.password}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
                type="password"
                className="w-full rounded-2xl border border-surface-border bg-white px-4 py-4 text-right outline-none transition focus:border-primary"
                placeholder="סיסמה"
              />
              <button type="submit" className="w-full rounded-full bg-primary px-4 py-4 font-semibold text-white">
                הרשמה
              </button>
            </form>
          )}

          {error ? <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-danger">{error}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-6">
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/90 px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            {view === "group" ? (
              <button
                type="button"
                onClick={() => setView("groups")}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-soft text-text"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary-dark">
                <Store className="h-6 w-6" />
              </div>
            )}
            <div className="text-2xl font-black tracking-tight text-primary">SIZ</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setView("join")}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-sm"
            >
              <Plus className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-soft text-text"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-4">
        {view === "groups" ? (
          <div className="space-y-3">
            {joinedGroups.length ? (
              joinedGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    setSelectedGroupId(group.id);
                    setView("group");
                  }}
                  className="w-full rounded-2xl bg-white p-4 text-right shadow-card transition active:scale-[0.99]"
                >
                  <div className="text-lg font-bold text-text">{group.name}</div>
                </button>
              ))
            ) : (
              <ShellCard className="p-4 text-right">
                <div className="text-lg font-bold text-text">אין קבוצות</div>
              </ShellCard>
            )}
          </div>
        ) : null}

        {view === "join" ? (
          <div className="space-y-3">
            {availableGroups.length ? (
              availableGroups.map((group) => {
                const joined = (currentUserDetail?.joinedGroupIds ?? []).includes(group.id);
                return (
                  <div key={group.id} className="rounded-2xl bg-white p-4 shadow-card">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-right">
                        <div className="text-lg font-bold text-text">{group.name}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleJoinGroup(group.id)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${joined ? "bg-surface-soft text-text" : "bg-primary text-white"}`}
                      >
                        {joined ? "נכנס" : "הצטרף"}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <ShellCard className="p-4 text-right">
                <div className="text-lg font-bold text-text">אין עוד קבוצות</div>
              </ShellCard>
            )}
          </div>
        ) : null}

        {view === "group" && selectedGroup ? (
          <div className="space-y-4">
            <ShellCard className="p-4 text-right">
              <div className="text-lg font-bold text-text">{selectedGroup.name}</div>
            </ShellCard>

            <div className="space-y-3">
              {groupPosts.map((post) => {
                const author = userById(post.userId);
                return (
                  <article key={post.id} className="rounded-2xl bg-white p-4 shadow-card">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-semibold text-text">{author?.username ?? ""}</div>
                    </div>
                    <div className="text-right text-sm leading-6 text-text">{post.text}</div>
                    {post.imageUrl ? (
                      <div className="mt-3 overflow-hidden rounded-2xl">
                        <img src={post.imageUrl} alt="" className="h-auto w-full object-cover" />
                      </div>
                    ) : null}
                    <div className="mt-2 text-left text-[11px] text-text-muted">{timeLabel(post.createdAt)}</div>
                  </article>
                );
              })}
            </div>

            <form onSubmit={handlePost} className="rounded-2xl bg-white p-4 shadow-card">
              <textarea
                value={postText}
                onChange={(event) => setPostText(event.target.value)}
                className="min-h-28 w-full resize-none rounded-2xl border border-surface-border bg-white px-4 py-3 text-right outline-none transition focus:border-primary"
                placeholder="כתוב"
              />
              {postImage ? (
                <div className="mt-3 overflow-hidden rounded-2xl">
                  <img src={postImage} alt="" className="h-auto w-full object-cover" />
                </div>
              ) : null}
              <div className="mt-3 flex items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-full bg-surface-soft px-4 py-2 text-sm font-semibold text-text">
                  <Upload className="h-4 w-4" />
                  <span>{uploadName || "תמונה"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleImageInput(event.target.files?.[0] ?? null)}
                  />
                </label>
                <button type="submit" className="rounded-full bg-primary px-5 py-3 font-semibold text-white">
                  פרסם
                </button>
              </div>
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
