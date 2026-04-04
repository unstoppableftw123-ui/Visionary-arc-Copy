import { supabase } from './supabaseClient';
import { callAI } from './aiRouter';
import { awardXP, awardCoins } from './db';

// ── Track → allowed file types (§13) ─────────────────────────────────────────

const TRACK_FILE_TYPES = {
  builder:  ['py', 'js', 'html', 'sql'],
  analyst:  ['xlsx', 'csv', 'ipynb'],
  creator:  ['docx', 'md', 'txt'],
  designer: ['pdf', 'docx', 'md'],
  founder:  ['pptx', 'docx', 'xlsx'],
};

// ── XP + coin rewards per difficulty (§13) ───────────────────────────────────

const DIFFICULTY_XP    = { patch: 100, finish: 250, rebuild: 600 };
const DIFFICULTY_COINS = { patch: 25,  finish: 60,  rebuild: 150 };
const REVIEWER_BONUS_XP    = 150;
const REVIEWER_BONUS_COINS = 30;

// ── JSON parse helper ─────────────────────────────────────────────────────────

function parseJson(raw) {
  const stripped = (raw ?? '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(stripped);
  } catch (_) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// generateArtifactChallenge
// Generates a broken artifact via AI, stores the challenge row, and returns
// a client-side download URL so the student can work on the file.
// ─────────────────────────────────────────────────────────────────────────────

export async function generateArtifactChallenge(userId, track, difficulty) {
  if (!userId) throw new Error('userId required');

  const fileTypes = TRACK_FILE_TYPES[track];
  if (!fileTypes) throw new Error(`Unknown track: ${track}`);

  // Pick a random file type for this track
  const fileType = fileTypes[Math.floor(Math.random() * fileTypes.length)];

  // Build prompts from §13
  const systemPrompt =
    `You are generating a broken ${fileType} artifact for a student challenge. ` +
    `Track: ${track}. Difficulty: ${difficulty}. ` +
    `Generate: (1) a realistic broken artifact as raw file content, ` +
    `(2) a one-paragraph context brief explaining what it was supposed to be, ` +
    `(3) a hidden rubric of exactly what's wrong (3-5 specific issues). ` +
    `Calibrate errors to difficulty: Patch=1 obvious bug, Finish=partial work, ` +
    `Rebuild=fundamentally flawed approach. ` +
    `Return JSON: { artifact_content, context_brief, hidden_rubric, file_type }`;

  const userPrompt =
    `Generate a ${difficulty} difficulty ${track} track challenge artifact using .${fileType} file type.`;

  // Call AI — uses brief_generation tier (Claude Haiku, 3 coins)
  const raw = await callAI({
    feature: 'brief_generation',
    prompt: userPrompt,
    systemPrompt,
    userId,
  });

  let parsed = parseJson(raw);

  // Retry once with stricter instruction if parse failed
  if (!parsed) {
    const raw2 = await callAI({
      feature: 'brief_generation',
      prompt: userPrompt + ' Return ONLY valid JSON, no surrounding text.',
      systemPrompt,
      userId,
    });
    parsed = parseJson(raw2);
  }

  if (!parsed || !parsed.artifact_content || !parsed.context_brief) {
    throw new Error('AI failed to generate a valid artifact. Please try again.');
  }

  const resolvedFileType = parsed.file_type ?? fileType;

  // Persist the challenge row
  const { data: challenge, error: insertError } = await supabase
    .from('artifact_challenges')
    .insert({
      user_id:          userId,
      track,
      difficulty,
      context_brief:    parsed.context_brief,
      hidden_rubric:    parsed.hidden_rubric ?? '',
      file_type:        resolvedFileType,
      artifact_content: parsed.artifact_content,
      artifact_prompt:  systemPrompt,
      status:           'pending',
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // Create a client-side Blob URL for immediate download
  // (valid for this browser session only)
  const blob = new Blob([parsed.artifact_content], { type: 'text/plain' });
  const downloadUrl = URL.createObjectURL(blob);

  return {
    challengeId:  challenge.id,
    contextBrief: challenge.context_brief,
    fileType:     challenge.file_type,
    downloadUrl,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// submitArtifact
// Uploads the student's fixed file, runs a diff review via AI, awards XP,
// and auto-creates a portfolio entry.
// ─────────────────────────────────────────────────────────────────────────────

export async function submitArtifact(challengeId, userId, fileBlob) {
  if (!challengeId || !userId || !fileBlob) throw new Error('Missing required arguments');

  // Fetch the original challenge (need artifact_content + hidden_rubric for diff)
  const { data: challenge, error: fetchError } = await supabase
    .from('artifact_challenges')
    .select('*')
    .eq('id', challengeId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !challenge) throw new Error('Challenge not found');
  if (challenge.status === 'reviewed') throw new Error('Challenge already reviewed');

  // Mark as submitted immediately
  await supabase
    .from('artifact_challenges')
    .update({ status: 'submitted' })
    .eq('id', challengeId);

  // ── Upload to Supabase Storage ──
  const filePath = `${userId}/${challengeId}.${challenge.file_type}`;
  const { error: uploadError } = await supabase.storage
    .from('artifact-submissions')
    .upload(filePath, fileBlob, { upsert: true });

  if (uploadError) throw uploadError;

  // ── Read submission text for diff ──
  let submissionText = '';
  try {
    submissionText = await fileBlob.text();
  } catch (_) {
    submissionText = '[binary file — text diff not available]';
  }

  // ── AI diff review (§13 prompt) ──
  const diffSystemPrompt =
    `You reviewed the original broken artifact and the student's submission. ` +
    `Compare them. Return JSON: ` +
    `{ what_changed, what_still_off, what_they_missed, ` +
    `reviewer_bonus: bool (true if student caught something not in the hidden rubric), ` +
    `summary_two_sentences }`;

  const diffUserPrompt =
    `ORIGINAL BROKEN ARTIFACT (.${challenge.file_type}):\n${challenge.artifact_content}\n\n` +
    `STUDENT SUBMISSION:\n${submissionText}\n\n` +
    `HIDDEN RUBRIC (what was actually wrong):\n${challenge.hidden_rubric}`;

  const diffRaw = await callAI({
    feature: 'brief_generation',
    prompt: diffUserPrompt,
    systemPrompt: diffSystemPrompt,
    userId,
  });

  const diffReview = parseJson(diffRaw) ?? {
    what_changed:         'Unable to parse diff.',
    what_still_off:       '',
    what_they_missed:     '',
    reviewer_bonus:       false,
    summary_two_sentences: 'Submission received.',
  };

  const reviewerBonus = diffReview.reviewer_bonus === true;

  // ── Compute XP and coins ──
  const baseXp     = DIFFICULTY_XP[challenge.difficulty]    ?? 100;
  const baseCoins  = DIFFICULTY_COINS[challenge.difficulty] ?? 25;
  const xpAwarded    = baseXp    + (reviewerBonus ? REVIEWER_BONUS_XP    : 0);
  const coinsAwarded = baseCoins + (reviewerBonus ? REVIEWER_BONUS_COINS : 0);

  // ── Persist submission row ──
  await supabase.from('artifact_submissions').insert({
    challenge_id:     challengeId,
    user_id:          userId,
    file_url:         filePath,
    diff_review:      diffRaw,
    what_changed:     diffReview.what_changed ?? '',
    what_still_off:   diffReview.what_still_off ?? '',
    what_they_missed: diffReview.what_they_missed ?? '',
    reviewer_bonus:   reviewerBonus,
  });

  // ── Update challenge status + XP record ──
  await supabase.from('artifact_challenges').update({
    status:                 'reviewed',
    xp_awarded:             xpAwarded,
    reviewer_bonus_awarded: reviewerBonus,
  }).eq('id', challengeId);

  // ── Award XP and coins (db helpers, same pattern as xpService) ──
  await awardXP(userId, xpAwarded);
  await awardCoins(userId, coinsAwarded, `artifact_${challenge.difficulty}_completion`);

  // ── Auto-create portfolio entry ──
  const trackLabel = challenge.track.charAt(0).toUpperCase() + challenge.track.slice(1);
  const diffLabel  = challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1);

  await supabase.from('portfolio_entries').insert({
    user_id:      userId,
    challenge_id: challengeId,
    track:        challenge.track,
    title:        `${trackLabel} Artifact — ${diffLabel} Fix`,
    role:         `${diffLabel} Engineer`,
    description:  diffReview.summary_two_sentences ?? '',
    diff_summary: diffReview.summary_two_sentences ?? '',
    file_type:    challenge.file_type,
    submission_url: filePath,
    is_public:    true,
  });

  return {
    diffReview: {
      whatChanged:          diffReview.what_changed,
      whatStillOff:         diffReview.what_still_off,
      whatTheyMissed:       diffReview.what_they_missed,
      summaryTwoSentences:  diffReview.summary_two_sentences,
    },
    xpAwarded,
    coinsAwarded,
    reviewerBonus,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getChallengeHistory
// Returns the user's challenges newest-first, with their submission joined.
// ─────────────────────────────────────────────────────────────────────────────

export async function getChallengeHistory(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('artifact_challenges')
    .select(`
      id,
      track,
      difficulty,
      file_type,
      context_brief,
      hidden_rubric,
      status,
      xp_awarded,
      reviewer_bonus_awarded,
      created_at,
      artifact_submissions (
        id,
        what_changed,
        what_still_off,
        what_they_missed,
        reviewer_bonus,
        file_url,
        submitted_at
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
