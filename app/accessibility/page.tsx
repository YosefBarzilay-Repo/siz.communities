import { CompliancePage } from "@/components/compliance-page";

const sections = [
  {
    title: "הצהרת נגישות",
    items: [
      "האתר נבנה לפי עקרונות תקן ישראלי 5568 ולפי WCAG 2.1 ברמת AA ככל האפשר.",
      "הדגש הוא על ניווט מקלדת, מבנה סמנטי, טקסט חלופי לתמונות וניגודיות קריאה.",
      "מומלץ לבצע בדיקת נגישות תקופתית ולשמור מסמך התאמות מעודכן."
    ]
  },
  {
    title: "מגבלות ידועות",
    items: [
      "ייתכנו רכיבים או מסמכים חיצוניים שאינם נגישים במלואם.",
      "יש להציג ערוץ פנייה ברור לדיווח על בעיות נגישות ולקבלת חלופות.",
      "במערכת אמיתית יש לעדכן תאריך בדיקה, שם אחראי נגישות ופרטי קשר."
    ]
  }
];

export default function AccessibilityPage() {
  return (
    <CompliancePage
      title="הצהרת נגישות"
      subtitle="תבנית הצהרת נגישות התואמת דרישות ישראליות כלליות. יש להשלים פרטי קשר, תאריך בדיקה ומסמך התאמות."
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
