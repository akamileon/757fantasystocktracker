"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    setName(localStorage.getItem("chat-name") ?? "");

    if (!supabase) return;
    let active = true;

    supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (active && data) setMessages(data);
      });

    const channel = supabase
      .channel("league-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) =>
          setMessages((prev) =>
            prev.some((m) => m.id === payload.new.id)
              ? prev
              : [...prev, payload.new]
          )
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  if (!supabase) {
    return (
      <div className="chat">
        <h2>💬 League Chat</h2>
        <p className="chat-note">Chat isn't set up yet — check back soon.</p>
      </div>
    );
  }

  async function send(e) {
    e.preventDefault();
    const who = name.trim().slice(0, 30);
    const what = text.trim().slice(0, 500);
    if (!who || !what || sending) return;

    setSending(true);
    localStorage.setItem("chat-name", who);
    const { error } = await supabase
      .from("messages")
      .insert({ name: who, text: what });
    if (!error) setText("");
    setSending(false);
  }

  return (
    <div className="chat">
      <h2>💬 League Chat</h2>
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 && (
          <p className="chat-note">No messages yet — talk your trash.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="chat-msg">
            <span className="chat-author">{m.name}</span>
            <span className="chat-time">
              {new Date(m.created_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            <p className="chat-text">{m.text}</p>
          </div>
        ))}
      </div>
      <form className="chat-form" onSubmit={send}>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="chat-send-row">
          <input
            type="text"
            placeholder="Message the league..."
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" disabled={sending || !name.trim() || !text.trim()}>
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
