"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const MAX_SECONDS = 60;

function pickRecordingFormat() {
  if (typeof MediaRecorder === "undefined") return null;
  if (MediaRecorder.isTypeSupported("audio/webm"))
    return { mime: "audio/webm", ext: "webm" };
  if (MediaRecorder.isTypeSupported("audio/mp4"))
    return { mime: "audio/mp4", ext: "m4a" };
  return null;
}

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [memo, setMemo] = useState(null); // { blob, mime, ext, seconds }
  const [note, setNote] = useState("");
  const listRef = useRef(null);
  const recRef = useRef(null); // { recorder, chunks, stream, timer, seconds }

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
      stopTracks();
    };
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function stopTracks() {
    const rec = recRef.current;
    if (!rec) return;
    clearInterval(rec.timer);
    rec.stream?.getTracks().forEach((t) => t.stop());
  }

  async function toggleRecord() {
    if (recording) {
      recRef.current?.recorder?.stop();
      return;
    }

    const format = pickRecordingFormat();
    if (!format || !navigator.mediaDevices?.getUserMedia) {
      setNote("Voice memos aren't supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: format.mime });
      const rec = { recorder, stream, chunks: [], seconds: 0, timer: null };
      recRef.current = rec;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) rec.chunks.push(e.data);
      };
      recorder.onstop = () => {
        clearInterval(rec.timer);
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(rec.chunks, { type: format.mime });
        if (blob.size > 0) {
          setMemo({ blob, ...format, seconds: rec.seconds });
        }
      };

      rec.timer = setInterval(() => {
        rec.seconds += 1;
        setRecordSecs(rec.seconds);
        if (rec.seconds >= MAX_SECONDS) recorder.stop();
      }, 1000);

      setNote("");
      setMemo(null);
      setRecordSecs(0);
      setRecording(true);
      recorder.start();
    } catch {
      setNote("Microphone access was blocked — allow it and try again.");
    }
  }

  async function send(e) {
    e.preventDefault();
    const who = name.trim().slice(0, 30);
    const what = text.trim().slice(0, 500);
    if (!who || (!what && !memo) || sending || recording) return;

    setSending(true);
    setNote("");
    localStorage.setItem("chat-name", who);

    try {
      let audioUrl = null;
      if (memo) {
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${memo.ext}`;
        const { error: upErr } = await supabase.storage
          .from("voice-memos")
          .upload(path, memo.blob, { contentType: memo.mime });
        if (upErr) throw upErr;
        audioUrl = supabase.storage.from("voice-memos").getPublicUrl(path).data.publicUrl;
      }

      // Only mention audio_url when there's a memo, so plain text messages
      // still work before the voice-memo migration has been run.
      const row = { name: who, text: what || null };
      if (audioUrl) row.audio_url = audioUrl;
      const { error } = await supabase.from("messages").insert(row);
      if (error) throw error;

      setText("");
      setMemo(null);
    } catch (err) {
      setNote(`Couldn't send: ${err.message ?? err}`);
    }
    setSending(false);
  }

  if (!supabase) {
    return (
      <div className="chat">
        <h2>💬 League Chat</h2>
        <p className="chat-note">Chat isn't set up yet — check back soon.</p>
      </div>
    );
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
            {m.text && <p className="chat-text">{m.text}</p>}
            {m.audio_url && (
              <audio className="chat-audio" controls preload="none" src={m.audio_url} />
            )}
          </div>
        ))}
      </div>
      <form className="chat-form" onSubmit={send}>
        {note && <p className="chat-error">{note}</p>}
        {memo && !recording && (
          <div className="chat-memo">
            🎙️ Voice memo ready ({memo.seconds}s)
            <button type="button" onClick={() => setMemo(null)} aria-label="Discard voice memo">
              ✕
            </button>
          </div>
        )}
        <input
          type="text"
          placeholder="Your name"
          value={name}
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="chat-send-row">
          <button
            type="button"
            className={`chat-mic${recording ? " rec" : ""}`}
            onClick={toggleRecord}
            title={recording ? "Stop recording" : "Record a voice memo"}
          >
            {recording ? `⏹ ${recordSecs}s` : "🎤"}
          </button>
          <input
            type="text"
            placeholder="Message the league..."
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="submit"
            disabled={sending || recording || !name.trim() || (!text.trim() && !memo)}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
