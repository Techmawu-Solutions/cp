import { redirect } from "next/navigation";

/** Student courses now open in the full-screen learning area. */
export default async function StudentCourseRedirect({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  redirect(`/learn/${id}${tab && tab !== "content" ? `?tab=${tab}` : ""}`);
}
