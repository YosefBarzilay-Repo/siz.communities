Build a **mobile-first web application** called **SIZ (S-I-Z)** – a minimal, intuitive platform for **buying, selling, and giving away items inside community-based groups**.

## Core Concept

SIZ is a hybrid between Slack and WhatsApp:

* Users join **groups (communities)** based on category or affiliation
* Inside each group, users can **post items (for sale / giveaway)**
* Other users can:

  * Reply in a **thread (public discussion)**
  * Send a **private message (1:1 chat)**

The system should prioritize **simplicity, speed, and clarity**, not feature overload.

---

## Tech Stack (strict)

* Frontend: React (Next.js preferred, App Router)
* Backend: Node.js (Express or Next.js API routes)
* Database: MongoDB
* Real-time: WebSockets (Socket.io or native)
* Auth: JWT-based authentication
* Styling: Tailwind CSS
* Icons: Use open-source icon libraries (e.g. Google Material Icons or Lucide). DO NOT use emojis.

---

## Language & UX

* The entire UI must be in **Hebrew (RTL support required)**
* Design should be:

  * Clean
  * Minimal
  * Icon-driven (reduce text where possible)
  * Mobile-first (primary target: smartphones)
* Use a **modern, bright, clean color palette** (light background, clear primary color, subtle accents)

---

## Core Features

### 1. Authentication

* Register with:

  * Username
  * Email
  * Password
* Login / Logout
* Basic validation
* Store users securely (hashed passwords)

---

### 2. Groups (Communities)

Users can:

* Create a group
* Join/leave groups
* View list of available groups

Group properties:

* Name
* Category (free text or simple tag)
* Description (optional)
* Creator (admin)

Admin capabilities:

* Remove users
* Delete messages/posts
* Edit group details
* Delete group

Examples:

* Neighborhood (e.g. רחובות)
* Organization-based
* Niche communities (e.g. weddings, students)

---

### 3. Posts (Listings)

Inside each group:

Users can create a post:

* Text (required)
* Image (optional)
* Type:

  * For sale
  * Giveaway

Display:

* Feed of posts per group (chronological)

---

### 4. Threads (Public Discussion)

Each post supports:

* Threaded replies
* All users in the group can see replies
* Clean UI separation between post and thread

---

### 5. Private Messaging (DM)

* Users can send direct messages to each other
* 1:1 conversations
* Real-time updates
* Accessible from:

  * User profile
  * Post (contact seller)

---

### 6. Navigation (Mobile-first)

Bottom navigation bar with icons:

* Home (feed / groups)
* Groups
* Create Post
* Messages (DM)
* Profile

---

### 7. UI/UX Guidelines

* Focus on **icon-based actions** (not text-heavy buttons)
* Clear affordances:

  * Comment icon → opens thread
  * Message icon → opens DM
* Smooth transitions between screens
* Avoid clutter

---

## Data Models (high-level)

User:

* id
* username
* email
* passwordHash

Group:

* id
* name
* category
* description
* adminId
* members[]

Post:

* id
* groupId
* userId
* text
* imageUrl
* type (sale/giveaway)
* createdAt

Comment (Thread):

* id
* postId
* userId
* text
* createdAt

Message (DM):

* id
* senderId
* receiverId
* text
* createdAt

---

## Constraints

* Keep the system **simple and scalable**
* Avoid over-engineering
* No payments, no advanced search, no complex filtering (for MVP)
* Clean architecture with separation between frontend, backend, and database

---

## Output Requirements

* Working full-stack project
* Clear folder structure
* Setup instructions
* Minimal but clean UI
* Ready for local development

---

## Goal

Deliver a **lean MVP** that feels fast, intuitive, and community-driven, allowing users to easily:

* Join groups
* Post items
* Talk publicly or privately
* Manage simple communities
