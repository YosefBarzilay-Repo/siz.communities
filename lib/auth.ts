import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { getUserById } from "./store";

const TOKEN_NAME = "siz_token";
const AUTH_HEADER = "authorization";
const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "siz-dev-secret");

export const tokenName = TOKEN_NAME;

export const signAuthToken = async (userId: string) =>
  new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

export const verifyAuthToken = async (token: string) => {
  const result = await jwtVerify(token, secret);
  return result.payload.sub?.toString() ?? null;
};

export const readToken = (request: NextRequest) => request.cookies.get(TOKEN_NAME)?.value ?? null;

export const readBearerToken = (request: NextRequest) => {
  const header = request.headers.get(AUTH_HEADER);
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
};

export const readQueryToken = (request: NextRequest) => request.nextUrl.searchParams.get("token")?.trim() ?? null;

export const getUserFromRequest = async (request: NextRequest) => {
  const token = readQueryToken(request) ?? readBearerToken(request) ?? readToken(request);
  if (!token) return null;
  try {
    const userId = await verifyAuthToken(token);
    if (process.env.SIZ_DEBUG_AUTH === "1") {
      const user = userId ? await getUserById(userId) : null;
      console.log("auth-debug", {
        hasToken: Boolean(token),
        userId,
        resolved: Boolean(user)
      });
      return user;
    }
    return userId ? await getUserById(userId) : null;
  } catch {
    if (process.env.SIZ_DEBUG_AUTH === "1") {
      console.log("auth-debug", { hasToken: Boolean(token), error: "verify_failed" });
    }
    return null;
  }
};

export const getWritableUserFromRequest = async (request: NextRequest) => {
  const user = await getUserFromRequest(request);
  if (!user) return null;
  const dbUser = await getUserById(user.id);
  if (dbUser?.isLocked) return null;
  return user;
};
