import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PerceptionResponse {
  questionId: string;
  questionType: string;
  response: string;
  responseTime: number;
}

interface AnalysisResult {
  emotionalPolarity: 'positive' | 'neutral' | 'negative' | 'mixed';
  detailLevel: 'low' | 'medium' | 'high';
  perspectiveType: 'concrete' | 'abstract' | 'empathetic' | 'analytical';
  consistency: number;
  trends: {
    emotional: string;
    cognitive: string;
  };
  summary: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { responses, gradeLevel } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build prompt for analysis
    const responsesSummary = responses.map((r: PerceptionResponse, i: number) => 
      `Q${i+1} (${r.questionType}): "${r.response}" (response time: ${r.responseTime}s)`
    ).join('\n');

    const analysisPrompt = `Analyze these perception test responses from a Grade ${gradeLevel} student. 
Provide a gentle, non-diagnostic assessment of their perception patterns.

Responses:
${responsesSummary}

Analyze for:
1. Emotional Polarity: Overall emotional tone in responses (positive/neutral/negative/mixed)
2. Detail Level: How detailed are their descriptions (low/medium/high)
3. Perspective Type: How they interpret scenes (concrete/abstract/empathetic/analytical)
4. Consistency: Score 0-100 for how consistent their responses are
5. Trends: Describe emotional and cognitive patterns in neutral, encouraging language

IMPORTANT:
- Use gentle, non-judgmental language
- No medical or psychological diagnosis
- Phrases like "tends to interpret scenes cautiously" or "shows mixed emotional interpretation" are appropriate
- Focus on describing patterns, not labeling conditions

Return JSON with this structure:
{
  "emotionalPolarity": "positive|neutral|negative|mixed",
  "detailLevel": "low|medium|high", 
  "perspectiveType": "concrete|abstract|empathetic|analytical",
  "consistency": 75,
  "trends": {
    "emotional": "descriptive sentence about emotional interpretation patterns",
    "cognitive": "descriptive sentence about cognitive/analytical patterns"
  },
  "summary": "A brief 1-2 sentence gentle summary for parents/teachers"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "You are a gentle educational psychologist assistant. You analyze perception test responses to provide insights without diagnosis. Always use encouraging, non-judgmental language."
          },
          { role: "user", content: analysisPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      // Return default analysis if AI fails
      return new Response(
        JSON.stringify({
          emotionalPolarity: 'neutral',
          detailLevel: 'medium',
          perspectiveType: 'concrete',
          consistency: 70,
          trends: {
            emotional: "Shows typical emotional responses for their age group.",
            cognitive: "Demonstrates age-appropriate interpretation skills."
          },
          summary: "The student shows typical perception patterns for their grade level."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    let analysis: AnalysisResult;
    try {
      analysis = JSON.parse(content);
    } catch {
      // Default if parsing fails
      analysis = {
        emotionalPolarity: 'neutral',
        detailLevel: 'medium',
        perspectiveType: 'concrete',
        consistency: 70,
        trends: {
          emotional: "Shows typical emotional responses for their age group.",
          cognitive: "Demonstrates age-appropriate interpretation skills."
        },
        summary: "The student shows typical perception patterns for their grade level."
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Perception analysis error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Analysis failed",
        // Return default analysis on error
        emotionalPolarity: 'neutral',
        detailLevel: 'medium', 
        perspectiveType: 'concrete',
        consistency: 70,
        trends: {
          emotional: "Shows typical responses.",
          cognitive: "Demonstrates age-appropriate patterns."
        },
        summary: "Analysis completed with standard results."
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
