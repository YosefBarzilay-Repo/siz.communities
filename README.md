# SIZ Communities

Mobile-first Hebrew RTL MVP for community buying, selling, and giveaways.

## What is included

- Next.js App Router frontend
- Hebrew RTL UI with Tailwind CSS
- JWT auth with login, registration, and logout
- Group feed, group creation, join/leave actions
- Post creation for sale/giveaway
- Public comment threads
- 1:1 private messages
- Socket.IO live refresh for new activity

## Local setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Demo account

- Email: `noa@siz.local`
- Password: `123456`

## Notes

- If `MONGODB_URI` is missing, the app falls back to seeded in-memory data for local development.
- Set `MONGODB_URI`, `MONGODB_DB`, and `JWT_SECRET` in `.env.local` for Mongo-backed persistence.

## GitHub + Hosting

1. Create a GitHub repository and push this project to it.
2. Create a MongoDB Atlas cluster and copy your connection string into `MONGODB_URI`.
3. Deploy the GitHub repo to a host that supports a custom Node server and Socket.IO, such as Render or Railway.
4. Add the same environment variables on the host:
   - `MONGODB_URI`
   - `MONGODB_DB`
   - `JWT_SECRET`
   - `NODE_ENV=production`
5. Use the project’s start command:
   - `npm start`

## Recommended host

- `Render` is a good fit here because this app uses a custom server for Socket.IO.
- `Vercel` is not the best default choice for this exact setup unless you remove the custom server and move realtime elsewhere.
