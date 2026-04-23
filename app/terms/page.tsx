import { CompliancePage } from "@/components/compliance-page";

const sections = [
  {
    title: "תוכן שנוצר על ידי משתמשים",
    items: [
      "המשתמש אחראי לתוכן שהוא מעלה, כולל פוסטים, תגובות, תמונות והודעות.",
      "למפעיל הפלטפורמה שמורה הזכות להסיר תוכן בלתי חוקי, מסוכן, מטעה או מפר זכויות.",
      "אין לפרסם מידע אישי של צד שלישי ללא הרשאה מתאימה."
    ]
  },
  {
    title: "פריטים אסורים",
    items: [
      "אין לפרסם פריטים אסורים לפי דין, לרבות פריטים גנובים, מזויפים, מסוכנים או בלתי חוקיים.",
      "אין לפרסם נשק, סמים, מוצרים המסכנים קטינים, או כל פריט שנאסר למסחר לפי דין.",
      "המפעיל רשאי להשהות, לחסום או למחוק חשבון או פוסט אם עולה חשש להפרה."
    ]
  },
  {
    title: "הגבלת אחריות",
    items: [
      "העסקאות בין משתמשים נעשות באחריותם הבלעדית.",
      "המפעיל אינו צד לעסקה, למפגש, לתשלום או לאיכות הפריט.",
      "יש לאמת זהות, מצב פריט ותנאי מסירה לפני כל עסקה."
    ]
  }
];

export default function TermsPage() {
  return (
    <CompliancePage
      title="תנאי שימוש"
      subtitle="תבנית תנאי שימוש לאפליקציית Marketplace. יש להתאים להיקף השירות, למדיניות התוכן ולייעוץ משפטי."
    >
      <section className="space-y-4 rounded-[2rem] bg-white p-6 shadow-card">
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
