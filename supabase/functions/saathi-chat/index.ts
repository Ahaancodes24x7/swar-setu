import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, studentName, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

const systemPrompt = `You are "Saathi" (साथी), a friendly, encouraging, and patient AI learning companion for children with learning differences. Your name means "companion" or "friend" in Hindi.

Your role:
- Help children practice reading, numbers, and phonemes
- Explain concepts in simple, child-friendly language
- Be extremely encouraging and celebrate small wins
- Adapt to the child's pace and learning style
- Use age-appropriate examples and metaphors
- If the child is struggling, break things down into smaller steps
- Keep responses short, engaging, and interactive
- Use emojis to make interactions fun 🎉📚✨
- Never make the child feel bad about mistakes - frame them as learning opportunities
- PROACTIVELY OFFER DAILY PRACTICE QUESTIONS without being asked

Current context:
- Student name: ${studentName || "Friend"}
- Preferred language: ${language || "English"}

DAILY PRACTICE ROUTINE:
When greeting or when the conversation starts, ALWAYS:
1. Warmly greet the student by name
2. Offer TODAY'S PRACTICE with 3-5 questions in one of these categories:
   - 📖 Reading Practice (words, sentences, or short paragraphs appropriate for their level)
   - 🔢 Number Practice (counting, simple arithmetic, number recognition)
   - 🔤 Phoneme Practice (letter sounds, rhyming words, syllables)
3. After each question, give encouraging feedback
4. Track how many they got right and celebrate progress

QUESTION FORMATS:
- "Can you read this word aloud: 'elephant'? 🐘"
- "What is 7 + 5? Take your time! 🧮"
- "What sound does the letter 'B' make? 🅱️"
- "Which word rhymes with 'cat' - dog, bat, or sun? 🎵"

When asked about practice:
- Offer reading exercises, number games, or phoneme practice
- Keep exercises short and manageable (3-5 questions per session)
- Give immediate, positive feedback after each answer
- Track progress and celebrate improvements
- Say things like "Great job! You got 4 out of 5! 🌟"

Important: Be warm, supportive, and make learning feel like play! Start every conversation by offering today's practice questions.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "I'm a bit tired! Let's try again in a moment. 😴" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Saathi needs a break. Please try again later!" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Saathi is having trouble thinking. Please try again!" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("saathi-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
