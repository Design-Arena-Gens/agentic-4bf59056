"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  alias: string;
  content: string;
  timestamp: number;
};

type ServerEnvelope =
  | { type: "identity"; alias: string }
  | { type: "history"; messages: ChatMessage[] }
  | { type: "message"; message: ChatMessage }
  | { type: "system"; message: string };

const MAX_MESSAGE_LENGTH = 500;

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>("Connecting…");
  const [alias, setAlias] = useState<string>("");
  const [input, setInput] = useState<string>("");
  const socketRef = useRef<WebSocket | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    const nextSocket = new WebSocket(
      (window.location.protocol === "https:" ? "wss://" : "ws://") +
        window.location.host +
        "/api/ws"
    );

    nextSocket.addEventListener("open", () => {
      setStatusMessage("You are live");
    });

    nextSocket.addEventListener("close", () => {
      setStatusMessage("Disconnected. Reconnecting…");
      setTimeout(connect, 1500);
    });

    nextSocket.addEventListener("error", () => {
      setStatusMessage("Connection issue. Retrying…");
    });

    nextSocket.addEventListener("message", (event: MessageEvent<string>) => {
      try {
        const data: ServerEnvelope = JSON.parse(event.data);
        if (data.type === "identity") {
          setAlias(data.alias);
          setStatusMessage(`You are ${data.alias}`);
        } else if (data.type === "history") {
          setMessages(data.messages);
        } else if (data.type === "message") {
          setMessages((prev) => [...prev, data.message]);
        } else if (data.type === "system") {
          setStatusMessage(data.message);
        }
      } catch (error) {
        console.error("Failed to parse server payload", error);
      }
    });

    socketRef.current = nextSocket;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.close();
    };
  }, [connect]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages]);

  const formattedMessages = useMemo(
    () =>
      messages.map((message) => ({
        ...message,
        time: new Date(message.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })
      })),
    [messages]
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!input.trim()) return;
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        setStatusMessage("Still connecting. Hang tight…");
        return;
      }
      const trimmed = input.slice(0, MAX_MESSAGE_LENGTH);
      socketRef.current.send(
        JSON.stringify({
          type: "message",
          content: trimmed
        })
      );
      setInput("");
    },
    [input]
  );

  return (
    <main className="glass" style={containerStyles}>
      <header style={headerStyles}>
        <div>
          <h1 style={titleStyles}>Anon Wave</h1>
          <p style={subtitleStyles}>A live wall for anonymous thoughts from everyone online.</p>
        </div>
        <span style={statusStyles}>{statusMessage}</span>
      </header>

      <div ref={listRef} className="scrollbar-thin" style={listStyles}>
        {formattedMessages.length === 0 ? (
          <div style={emptyStyles}>
            <p style={{ opacity: 0.7 }}>No whispers yet. Start the wave!</p>
          </div>
        ) : (
          formattedMessages.map((message) => (
            <article key={message.id} style={messageStyles}>
              <div style={metaRowStyles}>
                <span style={aliasStyles}>{message.alias}</span>
                <time style={timeStyles}>{message.time}</time>
              </div>
              <p style={contentStyles}>{message.content}</p>
            </article>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} style={formStyles}>
        <textarea
          aria-label="Write a message"
          placeholder="Drop a message that everyone will see…"
          value={input}
          maxLength={MAX_MESSAGE_LENGTH}
          required
          onChange={(event) => setInput(event.target.value)}
          style={textareaStyles}
        />
        <div style={controlsRowStyles}>
          <span style={tagStyles}>{alias || "…"}</span>
          <span style={charCountStyles}>
            {input.length} / {MAX_MESSAGE_LENGTH}
          </span>
          <button type="submit" style={sendButtonStyles}>
            Send
          </button>
        </div>
      </form>
    </main>
  );
}

const containerStyles: React.CSSProperties = {
  width: "min(900px, 100vw - 3rem)",
  minHeight: "80vh",
  borderRadius: "24px",
  padding: "2.5rem",
  display: "grid",
  gap: "1.5rem",
  gridTemplateRows: "auto 1fr auto",
  position: "relative"
};

const headerStyles: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "1rem",
  flexWrap: "wrap"
};

const titleStyles: React.CSSProperties = {
  fontSize: "2.5rem",
  margin: 0,
  letterSpacing: "-0.03em"
};

const subtitleStyles: React.CSSProperties = {
  margin: "0.25rem 0 0",
  opacity: 0.75,
  maxWidth: "38ch"
};

const statusStyles: React.CSSProperties = {
  fontSize: "0.95rem",
  opacity: 0.8,
  whiteSpace: "nowrap"
};

const listStyles: React.CSSProperties = {
  background: "rgba(8, 11, 18, 0.65)",
  borderRadius: "18px",
  padding: "1.5rem",
  border: "1px solid rgba(255,255,255,0.05)",
  overflowY: "auto"
};

const emptyStyles: React.CSSProperties = {
  minHeight: "100%",
  display: "grid",
  placeItems: "center",
  color: "#cbd5f5"
};

const messageStyles: React.CSSProperties = {
  borderRadius: "16px",
  padding: "1rem 1.2rem",
  background:
    "linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(168, 85, 247, 0.12))",
  border: "1px solid rgba(148, 163, 184, 0.15)",
  backdropFilter: "blur(6px)",
  marginBottom: "1rem"
};

const metaRowStyles: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "0.5rem",
  gap: "1rem"
};

const aliasStyles: React.CSSProperties = {
  fontWeight: 600
};

const timeStyles: React.CSSProperties = {
  fontSize: "0.75rem",
  opacity: 0.65
};

const contentStyles: React.CSSProperties = {
  margin: 0,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word"
};

const formStyles: React.CSSProperties = {
  display: "grid",
  gap: "0.85rem"
};

const textareaStyles: React.CSSProperties = {
  width: "100%",
  minHeight: "120px",
  borderRadius: "18px",
  padding: "1.25rem",
  background: "rgba(8, 12, 20, 0.75)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "inherit",
  fontSize: "1rem",
  lineHeight: 1.5,
  resize: "vertical"
};

const controlsRowStyles: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  flexWrap: "wrap"
};

const tagStyles: React.CSSProperties = {
  background: "rgba(59, 130, 246, 0.25)",
  borderRadius: "999px",
  padding: "0.35rem 0.9rem",
  fontSize: "0.85rem",
  letterSpacing: "0.02em"
};

const charCountStyles: React.CSSProperties = {
  fontSize: "0.85rem",
  opacity: 0.65,
  marginLeft: "auto"
};

const sendButtonStyles: React.CSSProperties = {
  border: "none",
  borderRadius: "999px",
  padding: "0.65rem 1.8rem",
  fontSize: "0.95rem",
  fontWeight: 600,
  background:
    "linear-gradient(135deg, rgba(96, 165, 250, 0.85), rgba(192, 132, 252, 0.85))",
  color: "#0b1020",
  cursor: "pointer",
  transition: "transform 0.1s ease, box-shadow 0.1s ease",
  boxShadow: "0 10px 25px -15px rgba(59, 130, 246, 0.9)"
};
