"use client";

import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { Awareness } from "y-protocols/awareness";

function getRandomColor(): string {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
    "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
    "#BB8FCE", "#85C1E9", "#F0B27A", "#82E0AA",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function useYjs(docId: string) {
  const [ready, setReady] = useState(false);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const wsUrl = `ws${window.location.protocol === "https:" ? "s" : ""}://${window.location.host}`;
    const provider = new WebsocketProvider(wsUrl, `ws/${docId}`, ydoc, {
      connect: true,
    });
    const ytext = ydoc.getText("content");

    const userName = localStorage.getItem("markdocs-user") || "Anonymous";
    let userColor = localStorage.getItem("markdocs-color");
    if (!userColor) {
      userColor = getRandomColor();
      localStorage.setItem("markdocs-color", userColor);
    }

    provider.awareness.setLocalStateField("user", {
      name: userName,
      color: userColor,
      colorLight: userColor + "40",
    });

    ydocRef.current = ydoc;
    providerRef.current = provider;
    ytextRef.current = ytext;
    awarenessRef.current = provider.awareness;

    provider.on("sync", (synced: boolean) => {
      if (synced) setReady(true);
    });

    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, [docId]);

  return {
    ydoc: ydocRef.current,
    provider: providerRef.current,
    ytext: ytextRef.current,
    awareness: awarenessRef.current,
    ready,
  };
}
