import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/session";
import { uploadImageBuffer } from "@/lib/integrations/cloudinary";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(req: Request) {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.res;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Only JPG, PNG, WebP or AVIF images are allowed" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be 5 MB or smaller" }, { status: 400 });

  try {
    const result = await uploadImageBuffer(Buffer.from(await file.arrayBuffer()));
    return NextResponse.json(result);
  } catch (err) {
    console.error("Cloudinary upload failed", err);
    const msg = err instanceof Error && err.message.includes("not configured") ? "Image storage is not configured (Cloudinary keys missing)" : "Image upload failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
