import express from "express";
import next from "next";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { setSocketServer } from "./lib/realtime";

async function main() {
  const dev = process.env.NODE_ENV !== "production";
  const app = next({ dev, dir: process.cwd() });
  const handle = app.getRequestHandler();
  const port = Number(process.env.PORT ?? 3000);

  await app.prepare();

  const serverApp = express();
  const server = http.createServer(serverApp);
  const io = new SocketIOServer(server, {
    path: "/socket.io",
    cors: {
      origin: true,
      credentials: true
    }
  });

  setSocketServer(io);

  io.on("connection", (socket) => {
    socket.emit("store:update", { kind: "sync" });
  });

  serverApp.get("/health", (_request, response) => {
    response.json({ ok: true });
  });

  serverApp.all("*", (request, response) => handle(request, response));

  server.listen(port, () => {
    console.log(`SIZ running on http://localhost:${port}`);
  });
}

void main();
