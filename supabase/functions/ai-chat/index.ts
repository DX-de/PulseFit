/**
 * PulseFit — Proxy IA (évite CORS navigateur)
 * Secrets Supabase : ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const provider = (body.provider || "anthropic").toLowerCase();
    const system = body.system || "";
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (provider === "anthropic") {
      return await anthropic(system, messages, body.model);
    }
    if (provider === "openai") {
      return await openai(system, messages, body.model);
    }
    if (provider === "gemini") {
      return await gemini(system, messages, body.model);
    }
    return json({ error: `Provider inconnu: ${provider}` }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function anthropic(system: string, messages: { role: string; content: string }[], model?: string) {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) {
    return json({ error: "ANTHROPIC_API_KEY manquant dans les secrets Supabase" }, 500);
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || Deno.env.get("ANTHROPIC_MODEL") || "claude-3-5-haiku-latest",
      max_tokens: 1200,
      system,
      messages: messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return json({ error: data.error?.message || `Anthropic ${res.status}` }, res.status);
  }
  const text = (data.content || []).map((b: { text?: string }) => b.text || "").join("");
  return json({ text });
}

async function openai(system: string, messages: { role: string; content: string }[], model?: string) {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return json({ error: "OPENAI_API_KEY manquant dans les secrets Supabase" }, 500);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: model || Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini",
      messages: [{ role: "system", content: system }, ...messages],
      temperature: 0.7,
      max_tokens: 1200,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return json({ error: data.error?.message || `OpenAI ${res.status}` }, res.status);
  }
  return json({ text: data.choices?.[0]?.message?.content || "" });
}

async function gemini(system: string, messages: { role: string; content: string }[], model?: string) {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return json({ error: "GEMINI_API_KEY manquant dans les secrets Supabase" }, 500);

  const modelId = model || Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key}`;
  const contents = [
    { role: "user", parts: [{ text: system }] },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1200 },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return json({ error: data.error?.message || `Gemini ${res.status}` }, res.status);
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
  return json({ text });
}
