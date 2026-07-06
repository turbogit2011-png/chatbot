import { NextResponse } from "next/server";
import { ForbiddenError } from "./rbac";
import { UnauthorizedError, getCurrentUser } from "./current-user";
import type { SessionPayload } from "./session";

/** Wraps a Route Handler so every API route gets consistent auth + error handling without repeating boilerplate. The handler always receives the caller's session (never null) already scoped to their orgId. */
export function withAuth<T extends unknown[]>(
  handler: (session: SessionPayload, ...args: T) => Promise<Response>,
) {
  return async (...args: T): Promise<Response> => {
    try {
      const session = await getCurrentUser();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return await handler(session, ...args);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

export function toErrorResponse(err: unknown): Response {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  if (err instanceof Error) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Something went wrong." }, { status: 400 });
  }
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}
