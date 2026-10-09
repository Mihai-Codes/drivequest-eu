import { Outlet, useRouterState } from "@tanstack/react-router";
import * as React from "react";
import { SplitView, Status } from "@glaze/core/components";
import { useTheme, useConnection, useEnvironment } from "@glaze/core/hooks";
import { Hud } from "./components/hud.js";
import { ambientSetActive, unlockAudio } from "./lib/sound.js";
import { SoundToggle } from "./components/sound-toggle.js";

export function RootView() {
  useTheme();

  // IPC connection and environment
  const connectionQuery = useConnection();
  const environmentQuery = useEnvironment();

  // Cleanup IPC connection on unmount
  React.useEffect(() => {
    return () => {
      console.log("[RootView] cleanup - disconnecting IPC client");
      window.glazeAPI?.glaze?.ipc?.disconnect();
    };
  }, []);

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // The showroom keeps its own dark hero; the HUD appears on the exam screens.
  const showHud = pathname !== "/";

  // Audio: unlock the WebAudio context on the first user gesture (autoplay
  // policy), and keep the garage ambient bed on the landing route only — it
  // fades out on every other screen.
  React.useEffect(() => {
    const gesture = () => unlockAudio();
    window.addEventListener("pointerdown", gesture, { once: true });
    window.addEventListener("keydown", gesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", gesture);
      window.removeEventListener("keydown", gesture);
    };
  }, []);

  React.useEffect(() => {
    ambientSetActive(pathname === "/");
  }, [pathname]);

  return (
    <div className="h-full relative [&:not(:has([data-toolbar]))_.drag-region]:z-50">
      {/* Draggable top bar - fallback for when no toolbar is present */}
      <div className="drag-region fixed top-0 left-0 right-0 h-13" />
      {/* Global sound mute — every screen, top-right */}
      <SoundToggle className="fixed right-4 top-3 z-50" />
      {showHud ? <Hud /> : null}
      <SplitView className="h-full">
        <Outlet />
      </SplitView>

      <div className="flex flex-col items-end gap-1 mt-2 fixed bottom-12 right-2">
        {import.meta.env.DEV ? (
          <>
            {connectionQuery.error ? <Status variant="error">Backend disconnected</Status> : null}
            {environmentQuery.data ? null : <Status variant="error">Dev Server not found</Status>}
          </>
        ) : null}
      </div>
    </div>
  );
}
