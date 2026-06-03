#!/usr/bin/env node
/**
 * Proxy IA local — contourne CORS pour Claude/OpenAI en développement
 * Usage : npm run ai-proxy  (port 8787)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.AI_PROXY_PORT) || 8787;

function readConfig() {
  const p = path.join(__dirname, '..', 'js', 'config.js');
  const raw = fs.readFileSync(p, 'utf8');
  const pick = (key) => raw.match(new RegExp(`${key}:\\s*['"]([^'"]*)['"]`))?.[1] || '';
  return {
    anthropicKey: process.env.ANTHROPIC_API_KEY || pick('ANTHROPIC_API_KEY'),
    anthropicModel: pick('ANTHROPIC_MODEL') || 'claude-3-5-haiku-latest',
    openaiKey: process.env.OPENAI_API_KEY || pick('OPENAI_API_KEY'),
    openaiModel: pick('OPENAI_MODEL') || 'gpt-4o-mini',
  };
}

const cfg = readConfig();

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');
}

async function anthropic(system, messages, model) {
  if (!cfg.anthropicKey) throw new Error('ANTHROPIC_API_KEY manquant dans js/config.js');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': cfg.anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || cfg.anthropicModel,
      max_tokens: 1200,
      system,
      messages: messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Anthropic ${res.status}`);
  return (data.content || []).map((b) => b.text || '').join('');
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'POST only' }));
    return;
  }

  let raw = '';
  for await (const chunk of req) raw += chunk;

  try {
    const body = JSON.parse(raw);
    const provider = (body.provider || 'anthropic').toLowerCase();
    let text = '';

    if (provider === 'anthropic') {
      text = await anthropic(body.system || '', body.messages || [], body.model);
    } else {
      throw new Error(`Provider ${provider} : utilisez Supabase Edge Function en prod`);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ text }));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, () => {
  console.log(`\n◉ PulseFit AI proxy → http://localhost:${PORT}`);
  console.log('  Ajoutez dans js/config.js : AI_PROXY_URL: \'http://localhost:' + PORT + '\'');
  console.log('  Puis rechargez /ai-coach/\n');
});
