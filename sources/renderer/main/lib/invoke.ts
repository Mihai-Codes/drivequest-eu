/**
 * Shared typed IPC bridge to the Glaze backend.
 * One place that knows the glazeAPI shape so every feature stays DRY.
 */

export const invoke = <T = unknown>(channel: string, ...args: unknown[]): Promise<T> =>
  (
    window as unknown as {
      glazeAPI: { glaze: { ipc: { invoke: (c: string, ...a: unknown[]) => Promise<T> } } };
    }
  ).glazeAPI.glaze.ipc.invoke(channel, ...args);
