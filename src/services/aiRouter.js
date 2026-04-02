import { supabase } from './supabaseClient';

const TIER_MAP = {
  fast: { tier: 1, cost: 1, model: 'meta-llama/llama-3.3-70b-instruct:free', provider: 'groq' },
  flashcards: { tier: 1, cost: 1, model: 'meta-llama/llama-3.3-70b-instruct:free', provider: 'groq' },
  grammar: { tier: 1, cost: 1, model: 'meta-llama/llama-3.3-70b-instruct:free', provider: 'groq' },
  short_summary: { tier: 1, cost: 1, model: 'meta-llama/llama-3.3-70b-instruct:free', provider: 'groq' },

  lesson_plan: { tier: 2, cost: 3, model: 'anthropic/claude-sonnet-4-5', provider: 'openrouter' },
  essay_feedback: { tier: 2, cost: 3, model: 'anthropic/claude-sonnet-4-5', provider: 'openrouter' },
  quiz: { tier: 2, cost: 3, model: 'anthropic/claude-sonnet-4-5', provider: 'openrouter' },
  document: { tier: 2, cost: 3, model: 'anthropic/claude-sonnet-4-5', provider: 'openrouter' },
  notes: { tier: 2, cost: 3, model: 'anthropic/claude-sonnet-4-5', provider: 'openrouter' },
  summarize: { tier: 2, cost: 3, model: 'anthropic/claude-sonnet-4-5', provider: 'openrouter' },

  slides: { tier: 3, cost: 8, model: 'moonshotai/kimi-k2.5', provider: 'openrouter' },
  visual: { tier: 3, cost: 8, model: 'moonshotai/kimi-k2.5', provider: 'openrouter' },
  screenshot_to_code: { tier: 3, cost: 8, model: 'moonshotai/kimi-k2.5', provider: 'openrouter' },
  deep_research: { tier: 3, cost: 8, model: 'moonshotai/kimi-k2.5', provider: 'openrouter' },
};

export async function callAI({ feature, prompt, systemPrompt, userId, imageBase64, onCoinsUpdated }) {
  const config = TIER_MAP[feature];
  if (!config) {
    throw new Error(`Unknown feature: ${feature}`);
  }

  const { cost, model, provider } = config;

  // Check coin balance
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('coins')
    .eq('id', userId)
    .single();

  if (userError) throw userError;
  if (userData.coins < cost) throw new Error('INSUFFICIENT_COINS');

  // Build messages
  const userContent = imageBase64
    ? [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      ]
    : prompt;

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userContent });

  // Make the API call
  let response;
  if (provider === 'groq') {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.REACT_APP_GROQ_API_KEY}`,
      },
      body: JSON.stringify({ model, messages }),
    });
  } else {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.REACT_APP_OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://visionary-arc.vercel.app',
        'X-Title': 'Visionary Academy',
      },
      body: JSON.stringify({ model, messages }),
    });
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI call failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  const tokensUsed = data.usage?.total_tokens ?? 0;
  const content = data.choices[0].message.content;

  // Deduct coins
  await supabase
    .from('users')
    .update({ coins: userData.coins - cost })
    .eq('id', userId);

  onCoinsUpdated?.();

  // Log usage
  await supabase.from('ai_usage_log').insert({
    user_id: userId,
    model,
    tokens_used: tokensUsed,
    coins_deducted: cost,
    feature,
  });

  return content;
}
