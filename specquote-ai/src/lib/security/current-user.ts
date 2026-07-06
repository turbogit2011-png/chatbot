import "server-only";
import { redirect } from "next/navigation";
import { readSessionFromCookies, type SessionPayload } from "./session";

/**
 * Server Components / Route Handlers must always scope Prisma queries by
 * `orgId` from this session — never trust a client-supplied org id. This is
 * the single source of tenant isolation for the app.
 */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  return readSessionFromCookies();
}

export async function requireCurrentUser(): Promise<SessionPayload> {
  const session = await getCurrentUser();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** For API route handlers, where redirect() isn't appropriate — throw and let the route catch it into a 401. */
export async function requireApiUser(): Promise<SessionPayload> {
  const session = await getCurrentUser();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}
