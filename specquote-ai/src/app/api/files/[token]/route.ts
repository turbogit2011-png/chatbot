import { NextResponse } from "next/server";
import { withAuth } from "@/lib/security/api-handler";
import { verifyStorageToken, storage } from "@/lib/security/storage";
import mimeTypeFor from "@/lib/security/mime";

export const GET = withAuth(async (session, _req: Request, ctx: { params: Promise<{ token: string }> }) => {
  const { token } = await ctx.params;
  const verified = verifyStorageToken(decodeURIComponent(token));

  if (!verified || verified.orgId !== session.orgId) {
    return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 403 });
  }

  const buffer = await storage.read(verified.key);
  const fileName = verified.key.split("/").pop() ?? "file";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeTypeFor(fileName),
      "Content-Disposition": `inline; filename="${fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
});
