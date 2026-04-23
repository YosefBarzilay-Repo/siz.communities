# SIZ Communities

Mobile-first Hebrew RTL MVP for community buying, selling, and giveaways.

## What is included

- Next.js App Router frontend
- Hebrew RTL UI with Tailwind CSS
- JWT auth with login, registration, and logout
- Group feed, group creation, join/leave actions
- Post creation for sale/giveaway
- Public comment threads with threaded replies
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
- This seeded account is marked as a super user in the default data.

## Notes

- In development, if `MONGODB_URI` is missing, the app falls back to seeded in-memory data.
- In production, MongoDB is required. If `MONGODB_URI` is missing or the server cannot reach Atlas, the app will fail to start instead of quietly using memory.
- Set `MONGODB_URI`, `MONGODB_DB`, and `JWT_SECRET` in `.env.local` for local Mongo-backed persistence.
- Set `SUPER_USER_EMAILS` to a comma-separated list of emails that should always resolve as super users, even if the database does not yet store that flag.

## GitHub + Hosting

1. Create a GitHub repository and push this project to it.
2. Create a MongoDB Atlas cluster and copy your connection string into `MONGODB_URI`.
3. Deploy the GitHub repo to a host that supports a custom Node server and Socket.IO, such as Render or Railway.
4. Add the same environment variables on the host:
   - `MONGODB_URI`
   - `MONGODB_DB`
   - `JWT_SECRET`
   - `SUPER_USER_EMAILS`
   - `NODE_ENV=production`
5. Use the project start command:
   - `npm start`

## Railway Checklist

- Add `MONGODB_URI` in the Railway service variables, not only in your local shell.
- Make sure your Atlas cluster network access allows Railway to connect.
- Check Railway logs on startup. If Mongo is misconfigured, the app should now fail fast with a clear error instead of silently using memory.

## Recommended host

- `Render` is a good fit here because this app uses a custom server for Socket.IO.
- `Vercel` is not the best default choice for this exact setup unless you remove the custom server and move realtime elsewhere.
