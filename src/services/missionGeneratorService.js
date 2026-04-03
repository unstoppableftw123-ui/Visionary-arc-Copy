import { supabase } from './supabaseClient';

const STAT_TO_TRACK = {
  technical: 'tech',
  creativity: 'design',
  communication: 'content',
  leadership: 'business',
  impact: 'impact',
};

const RANK_TO_DIFFICULTIES = {
  E: ['E', 'D'],
  D: ['D', 'C'],
  C: ['C', 'B'],
  B: ['B', 'A'],
  A: ['A', 'S'],
  S: ['S'],
};

function pickDifficulty(rank) {
  const pool = RANK_TO_DIFFICULTIES[rank] ?? ['E', 'D'];
  return pool[Math.floor(Math.random() * pool.length)];
}

function weakestStat(statRadar) {
  if (!statRadar || typeof statRadar !== 'object') return 'technical';
  const entries = Object.entries(statRadar).filter(([k]) => k in STAT_TO_TRACK);
  if (entries.length === 0) return 'technical';
  return entries.reduce((min, cur) => (cur[1] < min[1] ? cur : min))[0];
}

async function generateMissionBrief(track, difficulty) {
  const prompt = `Generate a mission brief for a ${difficulty} rank ${track} challenge suitable for a student aged 13-18.\nReturn JSON only: { "title": "", "description": "", "type": "", "xp_reward": 0, "coin_reward": 0, "expiry_hours": 168 }\ndescription must be 2-3 sentences max. Make it feel like an anime quest board entry.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.REACT_APP_GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq call failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

export async function generateWeeklyMissions() {
  // 1. Delete expired missions
  await supabase
    .from('missions')
    .delete()
    .lt('expiry_at', new Date().toISOString());

  // 2. Get the Adventurers Guild id
  const { data: guild, error: guildError } = await supabase
    .from('guilds')
    .select('id')
    .eq('slug', 'adventurers-guild')
    .single();

  if (guildError || !guild) {
    throw new Error('Adventurers Guild not found');
  }

  // 3. Fetch all profiles with stat_radar and rank
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, stat_radar, rank');

  if (profilesError) throw profilesError;

  // 4. Group users by their weakest stat → track
  const trackCounts = {};
  for (const profile of profiles ?? []) {
    const stat = weakestStat(profile.stat_radar);
    const track = STAT_TO_TRACK[stat];
    if (!trackCounts[track]) trackCounts[track] = [];
    trackCounts[track].push(profile);
  }

  // 5. Generate 5 missions per track (25 total) and insert
  const tracks = Object.keys(STAT_TO_TRACK).map((s) => STAT_TO_TRACK[s]);
  const expiryAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const missionRows = [];
  for (const track of tracks) {
    const usersInTrack = trackCounts[track] ?? [];
    // Use a sample user rank to determine difficulty, or default to 'E'
    const sampleRank = usersInTrack[0]?.rank ?? 'E';
    const difficulty = pickDifficulty(sampleRank);

    for (let i = 0; i < 5; i++) {
      const brief = await generateMissionBrief(track, difficulty);
      missionRows.push({
        guild_id: guild.id,
        track,
        difficulty,
        title: brief.title,
        description: brief.description,
        type: brief.type ?? 'weekly',
        xp_reward: brief.xp_reward ?? 50,
        coins_reward: brief.coin_reward ?? 20,
        status: 'published',
        expiry_at: expiryAt,
      });
    }
  }

  const { error: insertError } = await supabase.from('missions').insert(missionRows);
  if (insertError) throw insertError;
}
