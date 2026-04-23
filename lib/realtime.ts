import type { Server as SocketServer } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var __siz_socket: SocketServer | undefined;
}

export const setSocketServer = (server: SocketServer) => {
  globalThis.__siz_socket = server;
};

export const broadcastUpdate = (event: string, payload: Record<string, unknown>) => {
  globalThis.__siz_socket?.emit(event, payload);
};
