import { useEffect, useState } from "react";

const invoke = (channel: string, ...args: unknown[]) =>
  (window as unknown as { glazeAPI: { glaze: { ipc: { invoke: (c: string, ...a: unknown[]) => Promise<unknown> } } } })
    .glazeAPI.glaze.ipc.invoke(channel, ...args);

type Props = {
  country: string;
  /** Bare filename from question.media, e.g. "give-way.svg". Null/undefined = no illustration. */
  media: string | null | undefined;
  alt: string;
  className?: string;
};

/**
 * Question illustration. Fetches the data: URL from the packs:media channel
 * and renders it. Renders NOTHING (not even a placeholder) when the question
 * has no media or the asset is missing — a missing illustration must never
 * surface as a broken-image icon.
 */
export function QuestionMedia({ country, media, alt, className }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    setSrc(null);
    if (!media) return;
    let live = true;
    invoke("packs:media", { country, name: media })
      .then((url) => {
        if (live && typeof url === "string" && url.startsWith("data:image/")) setSrc(url);
      })
      .catch(() => {
        /* stay empty on IPC failure */
      });
    return () => {
      live = false;
    };
  }, [country, media]);

  if (!src) return null;
  return <img src={src} alt={alt} className={className} draggable={false} />;
}
