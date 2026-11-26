"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

export default function GuestMessageForm() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanMessage = message.trim();

    if (!cleanName || !cleanMessage) {
      setStatus("Please enter your name and message.");
      return;
    }

    if (cleanName.length > 60 || cleanMessage.length > 1000) {
      setStatus("Your name or message is too long.");
      return;
    }

    setSending(true);
    setStatus("");

    const { error } = await supabase
      .from("guest_messages")
      .insert({
        guest_name: cleanName,
        message: cleanMessage,
      });

    setSending(false);

    if (error) {
      console.error("Guest message error:", error.message);
      setStatus("Your message could not be sent. Please try again.");
      return;
    }

    setName("");
    setMessage("");
    setStatus("Your wishes have been sent. Thank you!");
  }

  return (
    <section id="message" className="px-5 py-20 md:px-10">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[28px] bg-[#304936] px-6 py-14 text-white md:px-14">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-[#e5d6b5]">A little note from you</p>

          <h2 className="font-display mt-4 text-4xl font-medium leading-tight md:text-5xl">
            Send the couple your wishes
          </h2>

          <p className="mt-5 text-sm leading-7 text-white/70">
            A blessing, a few kind words, or a message they can
            keep and remember long after the celebration.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-9 max-w-xl space-y-4"
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            required
            placeholder="Your name"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/50 focus:border-[#e5d6b5]"
          />

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={1000}
            required
            rows={4}
            placeholder="Write your wishes for Charles and Wanjiku..."
            className="w-full resize-y rounded-xl border border-white/20 bg-white/10 px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/50 focus:border-[#e5d6b5]"
          />

          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-full bg-[#e5d6b5] px-6 py-4 text-sm font-semibold text-[#26382c] transition hover:bg-white disabled:opacity-60"
          >
            {sending ? "Sending your message..." : "Send your wishes"}
          </button>

          {status && (
            <p aria-live="polite" className="text-center text-sm text-[#e5d6b5]">
              {status}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
