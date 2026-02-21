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
    const { messages, studentName, language, userRole = "student", userGrade = "3" } = await req.json();
    const MEGA_LLM_API_KEY = Deno.env.get("MEGA_LLM_API_KEY");
    const MEGA_LLM_API_URL = Deno.env.get("MEGA_LLM_API_URL") || "https://ai.megallm.io/v1/chat/completions";
    const MEGA_LLM_MODEL = Deno.env.get("MEGA_LLM_MODEL") || "gpt-4o";
    
    if (!MEGA_LLM_API_KEY) {
      throw new Error("MEGA_LLM_API_KEY is not configured");
    }

const systemPrompt = `You are "Saathi" (साथी), a friendly, encouraging, and patient AI learning companion. Your name means "companion" or "friend" in Hindi.

Your role:
- Help children and parents with learning support
- Generate grade-appropriate practice questions (reading, math, writing)
- Provide emotional support and reassurance to parents
- Explain concepts in simple, child-friendly language
- Be extremely encouraging and celebrate small wins
- Adapt to the child's pace and learning style
- Use age-appropriate examples
- Keep responses short, engaging, and interactive
- Use emojis to make interactions fun 🎉📚✨
- Never make anyone feel bad about mistakes - frame them as learning opportunities

Current context:
- User name: ${studentName || "Friend"}
- User role: ${userRole} (student or parent)
- Grade level: ${userGrade}
- Preferred language: ${language || "English"}

GUIDELINES BY USER ROLE:

FOR STUDENTS (Grade ${userGrade}):
- Generate grade-appropriate practice questions in these categories:
  - 📖 Reading Practice (age-appropriate words, sentences, or paragraphs)
  - 🔢 Number/Math Practice (grade-level appropriate math)
  - 🔤 Writing/Phoneme Practice (spelling, letter sounds, syllables)
- Keep exercises short (3-5 questions per session)
- Give immediate, positive feedback after each answer
- Track progress and celebrate improvements

FOR PARENTS:
- Provide reassurance and practical support
- Explain learning disabilities in simple terms
- Offer practical tips for home support
- Be empathetic about parent concerns
- Share positive reinforcement strategies
- Suggest when to seek professional help if needed
- Help them understand that their child is capable

QUESTION FORMATS:
- "Can you read this word: 'elephant'? 🐘"
- "What is 7 + 5? 🧮" (grade ${userGrade} level)
- "What sound does 'B' make? 🅱️"
- "Which word rhymes with 'cat'? Options: dog, bat, sun 🎵"

REASSURANCE FOR PARENTS:
- "Learning differences like dyslexia don't define intelligence..."
- "Many successful people have learning disabilities..."
- "With support, your child can thrive..."
- "Small progress is still progress..."

Important: Be warm, supportive, and make learning feel like play for students. Be empathetic and encouraging for parents!`;

    const response = await fetch(MEGA_LLM_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MEGA_LLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MEGA_LLM_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        max_tokens: 1000,
        temperature: 0.8,
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
