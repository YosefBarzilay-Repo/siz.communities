import { CompliancePage } from "@/components/compliance-page";

const sections = [
  {
    title: "אימות ובקרות",
    items: [
      "אימות אימייל נדרש לפני שליחת הודעות פרטיות.",
      "המערכת משתמשת ב-JWT וב-cookies מאובטחים עם HttpOnly ו-SameSite.",
      "ניתן להגביל משתמשים, לחסום כתיבה, להשבית תכנים ולפעול מול דיווחים."
    ]
  },
  {
    title: "דיווח וניטור",
    items: [
      "בכל הודעה ניתן לבצע דיווח לצורך טיפול בהטרדה, הונאה או הפרת תנאים.",
      "המערכת שומרת לוגים תפעוליים ופעולות מנהליות לצורכי בקרה ובירור אירועים.",
      "באופן תפעולי, כדאי להגדיר תהליך הודעה והסרה לטיפול מהיר בתוכן בעייתי."
    ]
  },
  {
    title: "שחזור וגיבוי",
    items: [
      "יש לשמור גיבויים מאובטחים של בסיס הנתונים וההגדרות.",
      "מומלץ לבדוק שגרות שחזור תקופתיות כדי לוודא שניתן להחזיר מידע במקרה תקלה.",
      "יש להגביל גישה לגיבויים ולרשומות לוג רק לבעלי הרשאה."
    ]
  }
];

export default function SecurityPage() {
  return (
    <CompliancePage
      title="אבטחה ופרטיות"
      subtitle="תמצית בקרות אבטחה תפעוליות למערכת Marketplace. יש להשלים התאמה לסביבת הייצור ולמדיניות הארגון."
    >
      <section className="space-y-4 rounded-[2rem] bg-white p-6 shadow-card">
        <div className="rounded-2xl bg-surface-soft px-4 py-3 text-sm leading-6 text-text-muted">
          <strong className="text-text">טכנולוגיה:</strong> Next.js, Node.js, MongoDB ו-Socket.IO.
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
