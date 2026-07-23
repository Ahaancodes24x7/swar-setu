import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Calculate Levenshtein distance for word accuracy
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

// Calculate word-level accuracy
function calculateAccuracy(expected: string, actual: string): number {
  const expectedWords = expected.toLowerCase().split(/\s+/).filter(Boolean);
  const actualWords = actual.toLowerCase().split(/\s+/).filter(Boolean);

  if (expectedWords.length === 0) return 0;

  let matches = 0;
  for (const expected of expectedWords) {
    const bestMatch = actualWords.reduce((best, actual) => {
      const distance = levenshteinDistance(expected, actual);
      const similarity = 1 - distance / Math.max(expected.length, actual.length);
      return similarity > best ? similarity : best;
    }, 0);
    matches += bestMatch;
  }

  return Math.round((matches / expectedWords.length) * 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const promptText = formData.get("prompt_text") as string;
    const language = (formData.get("language") as string) || "en";

    if (!audioFile) {
      throw new Error("No audio file provided");
    }

    // Transcribe using ElevenLabs Scribe
    const transcribeFormData = new FormData();
    transcribeFormData.append("file", audioFile);
    transcribeFormData.append("model_id", "scribe_v2");
    transcribeFormData.append("language_code", language === "hi" ? "hin" : "eng");

    const transcribeResponse = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: transcribeFormData,
    });

    if (!transcribeResponse.ok) {
      const errorText = await transcribeResponse.text();
      console.error("ElevenLabs transcription error:", errorText);
      throw new Error("Failed to transcribe audio");
    }

    const transcription = await transcribeResponse.json();
    const spokenText = transcription.text || "";
    const words = transcription.words || [];

    // Calculate pronunciation and fluency metrics
    const accuracy = calculateAccuracy(promptText, spokenText);

    // Analyze pauses and hesitations
    let hesitationCount = 0;
    let totalPauseDuration = 0;
    let previousEnd = 0;

    for (const word of words) {
      const start = word.start || 0;
      const end = word.end || 0;

      if (previousEnd > 0) {
        const pause = start - previousEnd;
        if (pause > 0.5) {
          // Pause longer than 500ms
          hesitationCount++;
          totalPauseDuration += pause * 1000;
        }
      }
      previousEnd = end;
    }

    // Calculate fluency based on hesitations and word count
    const wordCount = words.length;
    const expectedWordCount = promptText.split(/\s+/).filter(Boolean).length;
    
    let fluencyScore = 100;
    if (hesitationCount > 0) {
      fluencyScore -= hesitationCount * 5;
    }
    if (wordCount < expectedWordCount * 0.8) {
      fluencyScore -= 15; // Penalty for missing words
    }
    fluencyScore = Math.max(0, Math.min(100, fluencyScore));

    // Pronunciation score (simplified - based on word match accuracy)
    const pronunciationScore = accuracy;

    // Generate feedback using AI
    let feedback = "";
    if (LOVABLE_API_KEY) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `You are Saathi, a friendly learning assistant for children. Provide brief, encouraging feedback (2-3 sentences max) on their reading practice. Be positive and give one helpful tip if needed. Use simple language and an emoji.`,
              },
              {
                role: "user",
                content: `The child was asked to read: "${promptText}"
They said: "${spokenText}"
Accuracy: ${accuracy}%
Fluency: ${fluencyScore}%
Hesitations: ${hesitationCount}

Provide brief feedback.`,
              },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          feedback = aiData.choices?.[0]?.message?.content || "";
        }
      } catch (e) {
        console.error("AI feedback error:", e);
      }
    }

    // Fallback feedback if AI fails
    if (!feedback) {
      if (accuracy >= 90) {
        feedback = "Excellent reading! You pronounced the words really well! 🌟";
      } else if (accuracy >= 70) {
        feedback = "Good effort! Keep practicing and you'll get even better! 📚";
      } else if (accuracy >= 50) {
        feedback = "Nice try! Let's practice a bit more together. You're improving! 💪";
      } else {
        feedback = "That's okay! Reading takes practice. Let's try again slowly. 🤗";
      }
    }

    return new Response(
      JSON.stringify({
        transcription: spokenText,
        pronunciation_score: pronunciationScore,
        fluency_score: fluencyScore,
        hesitation_count: hesitationCount,
        pause_duration_ms: Math.round(totalPauseDuration),
        accuracy_score: accuracy,
        feedback,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("analyze-voice-practice error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
