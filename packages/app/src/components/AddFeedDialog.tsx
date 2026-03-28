import { useState } from "react";
import { Button, Dialog, Field, Input } from "@cloudflare/kumo";
import { XIcon } from "@phosphor-icons/react";
import { ApiError } from "../lib/api.ts";

interface AddFeedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (url: string) => Promise<void>;
}

export function AddFeedDialog({ open, onOpenChange, onAdd }: AddFeedDialogProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setError(null);
    setLoading(true);
    try {
      await onAdd(trimmed);
      setUrl("");
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("This feed URL is already in your list.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to add feed.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setUrl("");
    setError(null);
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog size="sm">
        <div className="mb-6 flex items-start justify-between gap-4">
          <Dialog.Title className="text-xl font-semibold text-kumo-strong">Add feed</Dialog.Title>
          <Dialog.Close
            aria-label="Close"
            render={(props) => (
              <Button
                {...props}
                className={props.className ?? ""}
                variant="secondary"
                shape="square"
                size="sm"
                icon={<XIcon />}
                aria-label="Close"
                onClick={handleClose}
              />
            )}
          />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field
            label="Feed URL"
            {...(error ? { error: { message: error, match: "customError" as const } } : {})}
          >
            <Input
              type="url"
              placeholder="https://example.com/feed.xml"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus
              required
            />
          </Field>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={loading}>
              Add feed
            </Button>
          </div>
        </form>
      </Dialog>
    </Dialog.Root>
  );
}
