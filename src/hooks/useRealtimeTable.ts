"use client";

import { useEffect } from "react";
import type { WebsocketProvider } from "y-websocket";
import * as decoding from "lib0/decoding";

const MESSAGE_DATA_UPDATE = 100;

/**
 * Listen for data-change notifications broadcast through the Yjs WebSocket.
 * When the server sends a MESSAGE_DATA_UPDATE for the given table,
 * the callback is invoked so the component can refetch data.
 */
export function useRealtimeTable(
  provider: WebsocketProvider | null,
  table: string,
  onChangeCallback: () => void
) {
  useEffect(() => {
    if (!provider) return;

    function processMessage(data: Uint8Array) {
      try {
        const decoder = decoding.createDecoder(data);
        const messageType = decoding.readVarUint(decoder);
        if (messageType !== MESSAGE_DATA_UPDATE) return;

        const payload = JSON.parse(decoding.readVarString(decoder));
        if (payload.type === "data_update" && payload.table === table) {
          onChangeCallback();
        }
      } catch {
        // Not our message type, ignore
      }
    }

    const handler = (data: ArrayBuffer) => {
      processMessage(new Uint8Array(data));
    };

    // y-websocket provider emits 'message' events with the raw ArrayBuffer
    // But we need to listen on the underlying WebSocket for custom message types
    // since y-websocket only forwards Yjs protocol messages.
    // Instead, we hook into the provider's WebSocket directly.

    function attachWsListener(ws: WebSocket) {
      const msgHandler = (event: MessageEvent) => {
        if (event.data instanceof ArrayBuffer) {
          processMessage(new Uint8Array(event.data));
        } else if (event.data instanceof Blob) {
          event.data.arrayBuffer().then((buf) => {
            processMessage(new Uint8Array(buf));
          });
        }
      };
      ws.addEventListener("message", msgHandler);
      return () => ws.removeEventListener("message", msgHandler);
    }

    let cleanup: (() => void) | null = null;

    // The provider's ws may already be connected
    if (provider.ws && provider.ws.readyState === WebSocket.OPEN) {
      cleanup = attachWsListener(provider.ws);
    }

    // Re-attach when provider reconnects (new WebSocket instance)
    const onStatus = ({ status }: { status: string }) => {
      if (status === "connected" && provider.ws) {
        cleanup?.();
        cleanup = attachWsListener(provider.ws);
      }
    };

    provider.on("status", onStatus);

    return () => {
      provider.off("status", onStatus);
      cleanup?.();
    };
  }, [provider, table, onChangeCallback]);
}
