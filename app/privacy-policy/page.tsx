import { CompliancePage } from "@/components/compliance-page";

const sections = [
  {
    title: "איסוף מידע",
    items: [
      "כתובת אימייל, שם משתמש ופרטי התחברות.",
      "הודעות פרטיות, פוסטים, תגובות ותמונות שהמשתמש מעלה.",
      "נתוני שימוש בסיסיים לצורך אבטחה, תפעול ושיפור השירות."
    ]
  },
  {
    title: "מטרות השימוש",
    items: [
      "הפעלת החשבון, זיהוי משתמשים ואימות התחברות.",
      "ניהול קבוצות, פוסטים, הודעות ודיווחי בטיחות.",
      "ציות לדרישות החוק, טיפול בבקשות משתמשים ומניעת הונאה או הטרדה."
    ]
  },
  {
    title: "שמירה ותקופות",
    items: [
      "המידע נשמר רק למשך הזמן הנדרש להפעלת השירות, עמידה בחוק וטיפול במחלוקות.",
      "במקרה של מחיקת חשבון, נמחק או נהפוך את המידע לאנונימי בכפוף לדין החל.",
      "יש לשמור עותק פנימי של המדיניות המעודכנת והגרסה האחרונה."
    ]
  }
];

export default function PrivacyPolicyPage() {
  return (
    <CompliancePage
      title="מדיניות פרטיות"
      subtitle="תבנית מדיניות פרטיות לאפליקציית Marketplace בעברית. יש להשלים, לאמת משפטית ולתאם עם מדיניות הארגון."
    >
      <section className="space-y-4 rounded-[2rem] bg-white p-6 shadow-card">
        <div className="rounded-2xl bg-surface-soft px-4 py-3 text-sm leading-6 text-text-muted">
          <strong className="text-text">הערה:</strong> זהו טקסט תבנית בלבד. בישראל יש להתאים את נוסח המדיניות ל-PPA, לחוק הגנת הפרטיות ולמדיניות האבטחה של המערכת.
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
