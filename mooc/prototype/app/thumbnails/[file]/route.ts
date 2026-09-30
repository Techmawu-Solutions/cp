import { courseBySlug } from "@/lib/data/courses";
import { courseThumbnailSvg } from "@/lib/thumbnail";

/** GET /thumbnails/<slug>.svg — the generated course cover (spec FR-TR-3). */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const course = courseBySlug.get(file.replace(/\.svg$/, ""));
  if (!course) return new Response("Not found", { status: 404 });
  return new Response(courseThumbnailSvg(course), {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
