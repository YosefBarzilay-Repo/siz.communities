import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import type { BootstrapPayload, Comment, Group, Message, Post, User } from "./types";

const now = new Date();

const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

const createUser = (username: string, email: string, password: string, bio: string): User => ({
  id: randomUUID(),
  username,
  email,
  passwordHash: bcrypt.hashSync(password, 10),
  joinedGroupIds: [],
  bio,
  createdAt: daysAgo(30)
});

const users: User[] = [
  createUser("נועה לוי", "noa@siz.local", "123456", "משפצת בתים, מוסרת ומוכרת במהירות."),
  createUser("מיכל כהן", "michal@siz.local", "123456", "מתנדבת שכונתית, אוהבת להעביר הלאה."),
  createUser("דן ברק", "dan@siz.local", "123456", "סטודנט, מחפש ריהוט זול ונגיש."),
  createUser("יעל סיני", "yael@siz.local", "123456", "רכזת קהילה באגודת הבניין.")
];

const groups: Group[] = [
  {
    id: randomUUID(),
    name: "קהילת רחובות",
    category: "שכונה",
    description: "לוח הקהילה של הבניינים, המעברים והיד השנייה בשכונה.",
    adminId: users[0].id,
    memberIds: [users[0].id, users[1].id, users[2].id],
    createdAt: daysAgo(20)
  },
  {
    id: randomUUID(),
    name: "סטודנטים במרכז",
    category: "סטודנטים",
    description: "ריהוט, ספרים, מטבחונים וכל מה שזז בין חדרי מעונות.",
    adminId: users[2].id,
    memberIds: [users[1].id, users[2].id, users[3].id],
    createdAt: daysAgo(14)
  },
  {
    id: randomUUID(),
    name: "למסירה: אירועים",
    category: "אחר",
    description: "פריטים שנשארו אחרי חתונות, בריתות וכנסים.",
    adminId: users[1].id,
    memberIds: [users[0].id, users[1].id, users[3].id],
    createdAt: daysAgo(8)
  }
];

users[0].joinedGroupIds = [groups[0].id, groups[2].id];
users[1].joinedGroupIds = [groups[0].id, groups[1].id, groups[2].id];
users[2].joinedGroupIds = [groups[0].id, groups[1].id];
users[3].joinedGroupIds = [groups[1].id, groups[2].id];

const posts: Post[] = [
  {
    id: randomUUID(),
    groupId: groups[0].id,
    userId: users[0].id,
    text: "שולחן עבודה לבן, מצב מצוין. מתאים ללימודים או לפינת עבודה ביתית. איסוף מהרצל 18.",
    imageUrl: "",
    type: "sale",
    createdAt: daysAgo(1)
  },
  {
    id: randomUUID(),
    groupId: groups[0].id,
    userId: users[1].id,
    text: "כיסא אוכל לתינוק למסירה. נקי, יציב, ללא צורך בהרכבה.",
    imageUrl: "",
    type: "giveaway",
    createdAt: daysAgo(2)
  },
  {
    id: randomUUID(),
    groupId: groups[1].id,
    userId: users[2].id,
    text: "מקרר מיני, עובד מצוין. מחפש קנייה מהירה כי עוברים דירה בסוף השבוע.",
    imageUrl: "",
    type: "sale",
    createdAt: daysAgo(1)
  },
  {
    id: randomUUID(),
    groupId: groups[2].id,
    userId: users[3].id,
    text: "סט כוסות מזכוכית למסירה. מתאים לבית חדש או למטבחון משותף.",
    imageUrl: "",
    type: "giveaway",
    createdAt: daysAgo(3)
  }
];

const comments: Comment[] = [
  {
    id: randomUUID(),
    postId: posts[0].id,
    userId: users[2].id,
    text: "יש עדיין את הכיסא המתאים? אני יכול להגיע היום בערב.",
    createdAt: daysAgo(1)
  },
  {
    id: randomUUID(),
    postId: posts[0].id,
    userId: users[1].id,
    text: "כן, שמור עד מחר בבוקר אם תרצה.",
    createdAt: daysAgo(1)
  },
  {
    id: randomUUID(),
    postId: posts[2].id,
    userId: users[3].id,
    text: "אפשר תמונה של המדף העליון?",
    createdAt: daysAgo(1)
  }
];

const messages: Message[] = [
  {
    id: randomUUID(),
    senderId: users[2].id,
    receiverId: users[0].id,
    text: "האם השולחן עדיין פנוי? אני מעוניין לאסוף הערב.",
    createdAt: daysAgo(1)
  },
  {
    id: randomUUID(),
    senderId: users[0].id,
    receiverId: users[2].id,
    text: "כן, שמרתי לך אותו עד 20:00.",
    createdAt: daysAgo(1)
  },
  {
    id: randomUUID(),
    senderId: users[1].id,
    receiverId: users[3].id,
    text: "יש לי גם מתקן כביסה אם צריך, רוצה שאוסיף לשרשור?",
    createdAt: daysAgo(2)
  }
];

export const seedData: BootstrapPayload = {
  currentUser: null,
  users: users.map(({ passwordHash, ...rest }) => rest),
  groups,
  posts,
  comments,
  messages
};

export const seedUsers = users;
