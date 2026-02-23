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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-1.5-pro";
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${systemPrompt}\n\n---\n\nConversation:\n${messages.map(m => `${m.role === "user" ? "Student/Parent" : "Saathi"}: ${m.content}`).join('\n')}`
                }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.8,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE",
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "I'm a bit tired! Let's try again in a moment. 😴" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: "Saathi needs a break. Please try again later!" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("Gemini API error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Saathi is having trouble thinking. Please try again!" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform Gemini's stream format to SSE format
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    const transformedStream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim()) continue;

              try {
                const json = JSON.parse(line);
                const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  const sseData = JSON.stringify({
                    choices: [{ delta: { content: text } }]
                  });
                  controller.enqueue(`data: ${sseData}\n\n`);
                }
              } catch (e) {
                console.error("Error parsing Gemini response:", e);
              }
            }
          }

          // Send completion marker
          controller.enqueue("data: [DONE]\n\n");
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      }
    });

    return new Response(transformedStream, {
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
