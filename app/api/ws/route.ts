export const runtime = "edge";

type AcceptingWebSocket = WebSocket & { accept(): void };

declare const WebSocketPair: {
  new (): { 0: WebSocket; 1: AcceptingWebSocket };
};

type ChatMessage = {
  id: string;
  alias: string;
  content: string;
  timestamp: number;
};

type ClientState = {
  alias: string;
};

type ChatState = {
  clients: Map<WebSocket, ClientState>;
  history: ChatMessage[];
};

const MAX_HISTORY = 100;

function getState(): ChatState {
  const globalObject = globalThis as unknown as { __anonWave__?: ChatState };
  if (!globalObject.__anonWave__) {
    globalObject.__anonWave__ = {
      clients: new Map(),
      history: []
    };
  }
  return globalObject.__anonWave__;
}

function buildAlias(): string {
  const adjectives = ["Lunar", "Crimson", "Velvet", "Neon", "Echo", "Solar", "Aurora", "Quantum"];
  const nouns = ["Whisper", "Pulse", "Flux", "Nova", "Signal", "Wave", "Cipher", "Glow"];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${adjective}${noun}-${suffix}`;
}

function broadcast(state: ChatState, data: unknown) {
  const payload = JSON.stringify(data);
  for (const socket of state.clients.keys()) {
    if (socket.readyState === socket.OPEN) {
      socket.send(payload);
    }
  }
}

export async function GET(request: Request) {
  const upgradeHeader = request.headers.get("upgrade") || "";
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket", { status: 426 });
  }

  const { 0: client, 1: server } = new WebSocketPair();
  const state = getState();

  const alias = buildAlias();

  server.accept();

  state.clients.set(server, { alias });

  server.addEventListener("close", () => {
    state.clients.delete(server);
  });

  server.addEventListener("message", (event) => {
    try {
      const parsed = JSON.parse(event.data as string) as { type?: string; content?: string };
      if (parsed.type !== "message" || typeof parsed.content !== "string") {
        return;
      }
      const trimmed = parsed.content.trim();
      if (!trimmed) return;
      const clientState = state.clients.get(server);
      const senderAlias = clientState?.alias ?? alias;

      const record: ChatMessage = {
        id: crypto.randomUUID(),
        alias: senderAlias,
        content: trimmed.slice(0, 500),
        timestamp: Date.now()
      };

      state.history.push(record);
      if (state.history.length > MAX_HISTORY) {
        state.history.splice(0, state.history.length - MAX_HISTORY);
      }

      broadcast(state, { type: "message", message: record });
    } catch (error) {
      console.error("Failed to handle ws message", error);
    }
  });

  server.send(JSON.stringify({ type: "identity", alias }));
  server.send(JSON.stringify({ type: "history", messages: state.history }));

  return new Response(null, {
    status: 101,
    webSocket: client
  } as ResponseInit);
}
