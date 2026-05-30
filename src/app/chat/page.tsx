"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "¡Hola! Soy el recepcionista de PetDesk. ¿En qué puedo ayudarte? Puedes decirme cosas como: 'Quiero agendar un baño', 'Quiero cancelar mi cita', o '¿Cuánto cuesta el corte?'",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [clientId] = useState("cli-ana"); // Demo client
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input, clientId }),
      });

      if (!response.ok) throw new Error("Error en la respuesta");

      const data = await response.json();
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.reply,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta nuevamente.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickReplies = [
    "Quiero agendar un baño",
    "¿Cuánto cuesta el corte?",
    "Quiero cancelar mi cita",
    "Necesito un spa para mi mascota",
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-lg font-semibold tracking-tight hover:underline">
              🐾 PetDesk
            </Link>
            <span className="text-sm text-zinc-500">/ Chat de reservas</span>
          </div>
          <nav className="flex gap-4 text-sm font-medium">
            <Link href="/" className="rounded-md px-3 py-1.5 text-zinc-700 hover:bg-zinc-100">
              Inicio
            </Link>
            <Link href="/dashboard" className="rounded-md bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-800">
              Panel
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Chat de reservas</h1>
          <p className="mt-2 text-zinc-500">
            Conversa con el recepcionista IA para agendar, cancelar o consultar servicios.
          </p>
          <p className="mt-1 text-sm text-zinc-400">Cliente demo: Ana Pérez</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          {/* Chat messages */}
          <div className="h-[500px] overflow-y-auto p-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-4 flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.sender === "user" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-900"}`}
                >
                  <div className="text-sm">{msg.text}</div>
                  <div className={`mt-1 text-xs ${msg.sender === "user" ? "text-zinc-300" : "text-zinc-500"}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl bg-zinc-100 px-4 py-3 text-zinc-900">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-400"></div>
                    <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-400" style={{ animationDelay: "0.2s" }}></div>
                    <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-400" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies */}
          <div className="border-t border-zinc-200 p-4">
            <p className="mb-2 text-sm font-medium text-zinc-600">Respuestas rápidas:</p>
            <div className="flex flex-wrap gap-2">
              {quickReplies.map((text) => (
                <button
                  key={text}
                  onClick={() => setInput(text)}
                  className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>

          {/* Input area */}
          <div className="border-t border-zinc-200 p-4">
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu mensaje aquí..."
                className="flex-1 resize-none rounded-xl border border-zinc-300 px-4 py-3 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                rows={2}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="self-end rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Enviar
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Presiona <kbd className="rounded border border-zinc-300 px-1.5 py-0.5 font-mono">Enter</kbd> para enviar,{" "}
              <kbd className="rounded border border-zinc-300 px-1.5 py-0.5 font-mono">Shift+Enter</kbd> para nueva línea.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">¿Cómo funciona?</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-zinc-600">
            <li>Menciona <strong>baño, corte o spa</strong> para agendar ese servicio</li>
            <li>Di <strong>cancelar</strong> para anular una cita</li>
            <li>Pregunta por <strong>precios</strong> o <strong>horarios</strong></li>
            <li>El sistema buscará disponibilidad automáticamente</li>
            <li>Cuando cancelas, el hueco se ofrece al primer cliente en lista de espera</li>
          </ul>
        </div>
      </main>
    </div>
  );
}