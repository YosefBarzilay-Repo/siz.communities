"use client";

import { useEffect, useState } from "react";
import { CompliancePage } from "@/components/compliance-page";

type MePayload = {
  currentUser: { id: string; username: string; email: string; isSuperUser: boolean } | null;
  users?: unknown[];
  groups?: unknown[];
  posts?: unknown[];
  comments?: unknown[];
  messages?: unknown[];
  joinRequests?: unknown[];
};

export default function MyDataPage() {
  const [data, setData] = useState<MePayload | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Not authenticated");
        return response.json();
      })
      .then(setData)
      .catch(() => setData({ currentUser: null }));
  }, []);

  const downloadData = async () => {
    setStatus("מכין קובץ...");
    const response = await fetch("/api/me", { credentials: "include" });
    if (!response.ok) {
      setStatus("נדרש להתחבר כדי להוריד את הנתונים.");
      return;
    }
    const payload = (await response.json()) as MePayload;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "siz-my-data.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("הקובץ הוכן להורדה.");
  };

  const deleteMessages = async () => {
    setStatus("מוחק הודעות...");
    const response = await fetch("/api/me/messages", { method: "DELETE", credentials: "include" });
    setStatus(response.ok ? "ההודעות נמחקו." : "לא ניתן למחוק הודעות.");
  };

  const deleteAccount = async () => {
    if (!window.confirm("למחוק את החשבון וכל הנתונים שלך?")) return;
    setStatus("מוחק חשבון...");
    const response = await fetch("/api/me", { method: "DELETE", credentials: "include" });
    if (response.ok) {
      window.location.href = "/";
      return;
    }
    setStatus("לא ניתן למחוק את החשבון.");
  };

  return (
    <CompliancePage
      title="הנתונים שלי"
      subtitle="לוח נתונים להורדה, מחיקת הודעות ובקשת מחיקת חשבון. זהו כלי תבנית שיש להתאים למדיניות המחיקה והאחזקה בפועל."
    >
      <section className="space-y-4 rounded-[2rem] bg-white p-6 shadow-card">
        <div className="rounded-2xl bg-surface-soft px-4 py-3 text-sm leading-6 text-text-muted">
          <strong className="text-text">זכויות משתמש:</strong> הורדה, מחיקה, תיקון ובקשת מחיקה של נתונים בכפוף לדין החל.
        </div>
        <div className="space-y-3">
          <button type="button" onClick={downloadData} className="w-full rounded-full bg-primary px-4 py-3 font-semibold text-white">
            הורדת כל הנתונים שלי
          </button>
          <button type="button" onClick={deleteMessages} className="w-full rounded-full bg-surface-soft px-4 py-3 font-semibold text-text">
            מחיקת כל ההודעות שלי
          </button>
          <button type="button" onClick={deleteAccount} className="w-full rounded-full bg-red-50 px-4 py-3 font-semibold text-danger">
            מחיקת החשבון שלי
          </button>
        </div>
        <div className="text-sm text-text-muted">{status}</div>
        <div className="text-xs leading-6 text-text-muted">
          שימו לב: מחיקת נתונים בפועל תלויה במדיניות השמירה של המערכת, בדרישות דין, וביכולתם של צדדים שלישיים למחוק גיבויים לפי המדיניות.
        </div>
      </section>
    </CompliancePage>
  );
}
