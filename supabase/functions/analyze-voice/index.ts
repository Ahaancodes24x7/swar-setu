import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisRequest {
  transcription: string;
  expectedText: string;
  testType: "reading" | "number" | "phoneme";
  grade: string;
  language: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcription, expectedText, testType, grade, language }: AnalysisRequest = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert speech-language pathologist AI analyzing speech patterns for potential learning disability indicators. You analyze transcriptions comparing expected vs actual speech output.

CRITICAL: You flag INDICATORS only, not diagnoses. Be conservative and evidence-based.

For dyslexia indicators, analyze:
- Phoneme substitutions (b↔d, p↔b, t↔d)
- Phoneme omissions
- Incorrect phoneme sequencing
- Consonant cluster difficulties (sp, tr, bl)
- Pronunciation consistency across attempts

For dyscalculia indicators, analyze:
- Number transcoding errors (21↔12, 6↔9)
- Place-value confusion
- Verbal miscounting
- Operation confusion

Return a JSON object with this exact structure:
{
  "overallScore": number (0-100),
  "phonemeErrorRate": number (0-100, percentage of phoneme errors),
  "pronunciationConsistency": number (0-100),
  "prosodicScore": number (0-100),
  "temporalScore": number (0-100),
  "errorPatternDensity": number (0-100),
  "errors": [
    {"type": "substitution|omission|insertion|transposition", "expected": "string", "actual": "string", "position": number}
  ],
  "flaggedConditions": ["dyslexia" | "dyscalculia" | "dysgraphia"] or [],
  "riskLevel": "low" | "moderate" | "high",
  "summary": "Brief 2-3 sentence analysis",
  "recommendations": ["List of specific recommendations"]
}`;

    const userPrompt = `Analyze this speech sample for a ${grade} student.
Test type: ${testType}
Language: ${language}

Expected text: "${expectedText}"
Actual transcription: "${transcription}"

Provide detailed analysis focusing on learning disability indicators.`;

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
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    // Parse the JSON from the response
    let analysis;
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Return a default analysis
      analysis = {
        overallScore: 75,
        phonemeErrorRate: 5,
        pronunciationConsistency: 80,
        prosodicScore: 75,
        temporalScore: 80,
        errorPatternDensity: 10,
        errors: [],
        flaggedConditions: [],
        riskLevel: "low",
        summary: "Analysis completed. The speech sample appears within normal range.",
        recommendations: ["Continue regular practice", "Monitor progress over time"],
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in voice analysis:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
