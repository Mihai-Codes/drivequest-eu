import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  Button,
  Field,
  FieldSet,
  Input,
  ScrollArea,
  Switch,
  Text,
  toast,
} from "@glaze/core/components";

type Prefs = {
  globalShortcut: string;
  launchAtLogin: boolean;
  defaultShortcut: string;
};

function formatAccelerator(e: ReactKeyboardEvent): string | null {
  // Ignore pure modifier presses.
  if (["Meta", "Control", "Alt", "Shift", "CapsLock"].includes(e.key)) return null;

  const parts: string[] = [];
  // Prefer Control/Alt as the primary combo for this app (⌥Space is left free for Raycast).
  if (e.ctrlKey) parts.push("Control");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  if (e.metaKey) parts.push("Command");

  let key = e.key;
  if (key === " ") key = "Space";
  else if (key.length === 1) key = key.toUpperCase();
  else if (key.startsWith("Arrow"))
    key = key.slice(5); // ArrowUp → Up
  else if (key === "Escape") key = "Esc";

  // Require at least one modifier so we don't steal plain typing keys.
  if (parts.length === 0) return null;
  parts.push(key);
  return parts.join("+");
}

function prettyAccelerator(acc: string): string {
  if (!acc) return "Disabled";
  return acc
    .replace(/CommandOrControl/g, "⌘")
    .replace(/Command/g, "⌘")
    .replace(/Control/g, "⌃")
    .replace(/Alt/g, "⌥")
    .replace(/Shift/g, "⇧")
    .replace(/\+/g, "");
}

export function SettingsView() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [pendingShortcut, setPendingShortcut] = useState<string | null>(null);

  // Close on Escape unless capturing a shortcut or an interactive element is focused.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (event.defaultPrevented) return;
      if (capturing) {
        event.preventDefault();
        setCapturing(false);
        setPendingShortcut(null);
        return;
      }

      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      ) {
        return;
      }

      if (document.querySelector("[data-radix-popper-content-wrapper]")) return;

      event.preventDefault();
      void window.glazeAPI.glaze.ipc.invoke("window:closeSettings");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [capturing]);

  useEffect(() => {
    void (async () => {
      try {
        const data = (await window.glazeAPI.glaze.ipc.invoke("grok:getPrefs")) as Prefs;
        setPrefs(data);
      } catch (error) {
        toast.error(`Failed to load preferences: ${error}`);
      }
    })();
  }, []);

  const handleLaunchChange = async (checked: boolean) => {
    if (!prefs) return;
    setPrefs({ ...prefs, launchAtLogin: checked });
    try {
      await window.glazeAPI.glaze.ipc.invoke("grok:setLaunchAtLogin", checked);
    } catch (error) {
      toast.error(`Couldn't update launch-at-login: ${error}`);
      setPrefs({ ...prefs, launchAtLogin: !checked });
    }
  };

  const applyShortcut = async (accelerator: string) => {
    if (!prefs) return;
    try {
      const result = (await window.glazeAPI.glaze.ipc.invoke("grok:setShortcut", accelerator)) as {
        ok: boolean;
        globalShortcut: string;
      };
      if (!result.ok) {
        toast.error("That shortcut is already in use. Try another combination.");
        return;
      }
      setPrefs({ ...prefs, globalShortcut: result.globalShortcut });
      toast.success(`Shortcut set to ${prettyAccelerator(result.globalShortcut)}`);
    } catch (error) {
      toast.error(`Couldn't set shortcut: ${error}`);
    } finally {
      setCapturing(false);
      setPendingShortcut(null);
    }
  };

  const handleCaptureKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!capturing) return;
    e.preventDefault();
    e.stopPropagation();
    const acc = formatAccelerator(e);
    if (!acc) return;
    setPendingShortcut(acc);
    void applyShortcut(acc);
  };

  const handleDisableShortcut = async () => {
    if (!prefs) return;
    try {
      await window.glazeAPI.glaze.ipc.invoke("grok:disableShortcut");
      setPrefs({ ...prefs, globalShortcut: "" });
      toast.success("Global shortcut disabled");
    } catch (error) {
      toast.error(`Couldn't disable shortcut: ${error}`);
    }
  };

  const handleResetShortcut = async () => {
    if (!prefs) return;
    await applyShortcut(prefs.defaultShortcut);
  };

  const displayShortcut = capturing
    ? pendingShortcut
      ? prettyAccelerator(pendingShortcut)
      : "Press keys…"
    : prettyAccelerator(prefs?.globalShortcut ?? "");

  return (
    <ScrollArea title="Preferences" className="h-full">
      <div className="px-5 pt-2 pb-8 flex flex-col gap-6">
        <FieldSet title="General">
          <Field
            label="Launch at login"
            description="Open Grok automatically when you sign in to your Mac"
          >
            <Switch
              checked={prefs?.launchAtLogin ?? false}
              onCheckedChange={(v) => void handleLaunchChange(v)}
              disabled={!prefs}
            />
          </Field>
        </FieldSet>

        <FieldSet title="Global Shortcut">
          <Field
            label="Summon / Hide"
            description="Show or hide Grok from anywhere. Default is ⌃⌥G (⌥Space is left free for Raycast)."
          >
            <Input
              readOnly
              value={displayShortcut}
              placeholder="None"
              className="w-36 text-center tabular-nums"
              onFocus={() => setCapturing(true)}
              onBlur={() => {
                // Delay so a click on Reset/Disable still works.
                setTimeout(() => setCapturing(false), 150);
              }}
              onKeyDown={handleCaptureKey}
              aria-label="Global shortcut"
            />
          </Field>

          <Field>
            <div className="flex items-center gap-2">
              <Button size="small" onClick={() => void handleResetShortcut()} disabled={!prefs}>
                Reset to Default
              </Button>
              <Button
                size="small"
                variant="muted"
                onClick={() => void handleDisableShortcut()}
                disabled={!prefs || !prefs.globalShortcut}
              >
                Disable
              </Button>
            </div>
          </Field>

          {capturing ? (
            <Text variant="small" color="secondary">
              Press a key combination now. Esc cancels.
            </Text>
          ) : null}
        </FieldSet>
      </div>
    </ScrollArea>
  );
}
