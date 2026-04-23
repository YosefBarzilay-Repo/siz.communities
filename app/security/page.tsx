import { CompliancePage } from "@/components/compliance-page";

const sections = [
  {
    title: "אימות וסיסמאות",
    items: [
      "הסיסמאות נשמרות כ-hash בצד השרת באמצעות bcrypt, ולא כטקסט גלוי.",
      "יש להשתמש ב-JWT או cookies מאובטחים, עם HttpOnly ו-SameSite במקום שמתאים למערכת.",
      "במערכת פרודקשן יש לאכוף TLS/HTTPS בלבד."
    ]
  },
  {
    title: "כותרות אבטחה מומלצות",
    items: [
      "X-Content-Type-Options: nosniff",
      "X-Frame-Options: DENY",
      "Referrer-Policy: strict-origin-when-cross-origin",
      "Permissions-Policy מצומצם לפי הצורך",
      "HSTS בסביבת ייצור"
    ]
  },
  {
    title: "הודעות פרטיות ובטיחות",
    items: [
      "הודעות נשמרות בצד השרת ונגישות רק למשתמשים הצדדים לשיחה.",
      "יש לתמוך ב-Block/Report כדי להפחית הטרדה.",
      "רצוי לתעד אירועי אבטחה, בקשות מחיקה ודיווחי בטיחות."
    ]
  }
];

export default function SecurityPage() {
  return (
    <CompliancePage
      title="אבטחה ופרטיות"
      subtitle="תבנית הנחיות אבטחה ותפעול לאפליקציית Marketplace. יש לעדכן לפי סביבת הייצור והמדיניות הארגונית."
    >
      <section className="space-y-4 rounded-[2rem] bg-white p-6 shadow-card">
        <div className="rounded-2xl bg-surface-soft px-4 py-3 text-sm leading-6 text-text-muted">
          <strong className="text-text">טכנולוגיה:</strong> React + Node.js / Next.js + MongoDB.
        </div>
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h2 className="text-xl font-bold text-text">{section.title}</h2>
            <ul className="space-y-2 text-sm leading-7 text-text-muted">
              {section.items.map((item) => (
                <li key={item} className="rounded-2xl bg-background px-4 py-3">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </CompliancePage>
  );
}
