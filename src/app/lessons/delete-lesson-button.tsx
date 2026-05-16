"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type DeleteLessonButtonProps = {
  lessonId: string;
  lessonTitle: string;
};

export function DeleteLessonButton({
  lessonId,
  lessonTitle,
}: DeleteLessonButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isBusy = isDeleting || isPending;

  async function onDelete() {
    setError(null);
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/lessons/${encodeURIComponent(lessonId)}`, {
        method: "DELETE",
      });
      const payload = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(payload?.error ?? "Could not delete lesson");
      }
      setOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button size="icon-sm" variant="destructive" />}>
        <Trash2 className="size-3.5" />
        <span className="sr-only">Delete {lessonTitle}</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete lesson?</DialogTitle>
          <DialogDescription>
            This will permanently delete "{lessonTitle}" and its saved versions.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <DialogFooter>
          <DialogClose render={<Button disabled={isBusy} variant="outline" />}>
            Cancel
          </DialogClose>
          <Button disabled={isBusy} onClick={onDelete} variant="destructive">
            {isBusy ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
