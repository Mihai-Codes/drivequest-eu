import { useEffect, useState } from "react";
import { Button, ScrollArea, Text, Textarea, toast } from "@glaze/core/components";

function closeWindow(): void {
  void window.glazeAPI.glaze.ipc.invoke("window:closeImportCookies");
}

export function ImportCookiesView() {
  const [raw, setRaw] = useState("");
  const [importing, setImporting] = useState(false);

  // Close on Escape unless the textarea is focused (Esc should just blur/clear
  // selection there, not dismiss an in-progress paste).
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (event.defaultPrevented) return;
      if (document.activeElement instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      closeWindow();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleImport = async () => {
    const trimmed = raw.trim();
    if (!trimmed) {
      toast.error("Paste a cookie string first.");
      return;
    }
    setImporting(true);
    try {
      const result = (await window.glazeAPI.glaze.ipc.invoke("grok:importSessionCookies", trimmed)) as {
        count: number;
      };
      toast.success(
        `Imported ${result.count} cookie${result.count === 1 ? "" : "s"} across grok.com, x.ai, and accounts.x.ai. Reloading…`,
      );
      setTimeout(closeWindow, 900);
    } catch (error) {
      toast.error(`Import failed: ${error}`);
      setImporting(false);
    }
  };

  return (
    <ScrollArea title="Import Session Cookies" className="h-full">
      <div className="px-5 pt-2 pb-6 flex flex-col gap-4">
        <Text variant="small" color="secondary">
          Paste a raw cookie string — the same format as <code>document.cookie</code> or a{" "}
          <code>Cookie</code> request header (semicolon-separated <code>name=value</code>{" "}
          pairs) from an already-signed-in browser session. It's written directly into this
          app's cookie store for grok.com, x.ai, and accounts.x.ai, then Grok reloads.
        </Text>
        <Textarea
          size="medium"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="sso=...; sso-rw=...; cf_clearance=..."
          className="min-h-[160px] font-mono text-xs resize-none"
          autoFocus
          disabled={importing}
        />
        <div className="flex justify-end gap-2">
          <Button variant="muted" onClick={closeWindow} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={() => void handleImport()} disabled={importing || !raw.trim()}>
            {importing ? "Importing…" : "Import"}
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
