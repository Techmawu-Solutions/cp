import { redirect } from "next/navigation";

/** Lessons now open in the full-screen learning area. */
export default async function StudentLessonRedirect({ params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  redirect(`/learn/${id}/${itemId}`);
}
