"use client";

import { RequirePermission } from "@/components/layout/app-shell";
import { InteractiveVideoEditor } from "@/components/interactive-video/interactive-video-editor";

export default function SchoolInteractiveVideoPage() {
  return (
    <RequirePermission perm="courses.view">
      <InteractiveVideoEditor base="/school" />
    </RequirePermission>
  );
}
