"use client";

import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DocumentViewer } from "@/components/media/document-viewer";

/**
 * Opens a file inside the platform (spec section 27.1). The viewer's toolbar lets the
 * user open it in a new browser tab or download it to open in another app.
 */
export function FileViewerDialog({
  open,
  onOpenChange,
  url,
  fileName,
  allowDownload = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null while the file is loading. */
  url: string | null;
  fileName: string;
  allowDownload?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogTitle className="sr-only">{fileName}</DialogTitle>
        <DialogDescription className="sr-only">File viewer</DialogDescription>
        {url ? (
          <DocumentViewer
            url={url}
            fileName={fileName}
            allowDownload={allowDownload}
            className="h-[85dvh] rounded-none border-0"
            actions={
              <Button type="button" variant="ghost" size="icon-xs" onClick={() => onOpenChange(false)} aria-label="Close" title="Close">
                <X />
              </Button>
            }
          />
        ) : (
          <div className="flex h-[40dvh] items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Opening {fileName}…
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
