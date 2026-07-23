import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LearningResource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  skill_targeted: string;
  grade_min: number;
  grade_max: number;
  language: string;
  url: string | null;
  duration_minutes: number | null;
  difficulty: string | null;
  conditions: string[] | null;
  thumbnail_url: string | null;
  created_at: string;
  category?: 'assessment' | 'test' | 'learning' | 'worksheet';
  content?: {
    overview?: string;
    instructions?: string[];
    checklist?: { item: string; description: string }[];
    practiceItems?: { prompt: string; options?: string[]; answer?: string; tip?: string }[];
    guides?: { heading: string; detail: string }[];
  };
}

export const DEFAULT_SLD_RESOURCES: LearningResource[] = [
  {
    id: "res-1",
    title: "NCERT Dyslexia Parent Screening Checklist",
    description: "Observation checklist to identify phonological processing, reading speed, and letter recognition challenges at home.",
    resource_type: "reading",
    category: "assessment",
    skill_targeted: "Phonological & Reading Diagnostic",
    grade_min: 1,
    grade_max: 12,
    language: "en",
    url: null,
    duration_minutes: 15,
    difficulty: "easy",
    conditions: ["dyslexia", "general"],
    thumbnail_url: null,
    created_at: new Date().toISOString(),
    content: {
      overview: "This checklist is aligned with NCERT and DSM-5 guidelines to help parents observe reading and phonological patterns during daily activities.",
      instructions: [
        "Observe your child during reading time over 2-3 days.",
        "Check any behaviors that occur frequently.",
        "Share the results with your child's teacher or special educator."
      ],
      checklist: [
        { item: "Hesitates or pauses frequently on high-frequency sight words", description: "Takes 5+ seconds to recognize words like 'the', 'said', 'where'." },
        { item: "Confuses visually similar letters (b/d, p/q, m/w)", description: "Reads 'dog' as 'bog' or writes letters inverted." },
        { item: "Substitutes or skips small connecting words", description: "Omits words like 'and', 'in', 'on' while reading aloud." },
        { item: "Difficulty blending sounds into words", description: "Can sound out /c/-/a/-/t/ but struggles to blend into 'cat'." },
        { item: "Avoids reading aloud or expresses anxiety", description: "Shows stress or physical tension during reading tasks." }
      ]
    }
  },
  {
    id: "res-2",
    title: "NCERT Dyscalculia Math Diagnostic Sheet",
    description: "Assessment tool to observe number sense, subitizing, spatial math organization, and formula understanding.",
    resource_type: "number_sense",
    category: "assessment",
    skill_targeted: "Number Sense & Arithmetic Diagnostic",
    grade_min: 1,
    grade_max: 12,
    language: "en",
    url: null,
    duration_minutes: 15,
    difficulty: "easy",
    conditions: ["dyscalculia", "general"],
    thumbnail_url: null,
    created_at: new Date().toISOString(),
    content: {
      overview: "Designed for parents to assess foundational numeracy, quantity estimation, and mathematical reasoning.",
      instructions: [
        "Sit with your child in a quiet room with pencil and paper.",
        "Ask each task naturally without giving hints.",
        "Note down where hesitations or errors occur."
      ],
      checklist: [
        { item: "Struggles to estimate quantities without manual counting", description: "Cannot quickly tell if 8 dots are more than 4 dots." },
        { item: "Confuses mathematical operation symbols (+, -, ×, ÷)", description: "Performs addition when subtraction sign is present." },
        { item: "Difficulty remembering skip counting sequences", description: "Struggles with counting by 2s, 5s, or 10s." },
        { item: "Aligns columns incorrectly during multi-digit math", description: "Places ones under tens column when adding on paper." },
        { item: "Anxiety or freeze response during math problem solving", description: "Avoids math homework or feels overwhelmed by numbers." }
      ]
    }
  },
  {
    id: "res-3",
    title: "Visual-Motor & Fine Motor Control Assessment",
    description: "Diagnostic checklist to evaluate handwriting ergonomics, line alignment, letter sizing, and spatial drawing.",
    resource_type: "visual",
    category: "assessment",
    skill_targeted: "Handwriting & Fine Motor Diagnostic",
    grade_min: 1,
    grade_max: 12,
    language: "en",
    url: null,
    duration_minutes: 10,
    difficulty: "easy",
    conditions: ["dysgraphia", "general"],
    thumbnail_url: null,
    created_at: new Date().toISOString(),
    content: {
      overview: "Helpful diagnostic sheet to track physical pencil grip, motor fatigue, spatial margins, and line control.",
      instructions: [
        "Provide ruled paper and an HB pencil.",
        "Ask child to write 3 short sentences and copy a geometric shape.",
        "Check grip tightness and fatigue."
      ],
      checklist: [
        { item: "Overly tight or awkward pencil grip (white knuckles)", description: "Causes hand cramps or thumb fatigue within 5 minutes." },
        { item: "Inconsistent letter sizing within the same word", description: "Letters fluctuate between giant and tiny sizes." },
        { item: "Writing strays above or below ruled line boundaries", description: "Cannot align words on ruled paper guides." },
        { item: "Irregular spacing between words and letters", description: "Words run together without spaces or letters are spread far apart." },
        { item: "Extreme slowness when copying text from a board or book", description: "Takes significantly longer than peers to copy 1-2 lines." }
      ]
    }
  },
  {
    id: "res-4",
    title: "Phoneme & Pseudoword Decoding Practice",
    description: "Interactive practice test with nonsense words to evaluate phonetic decoding without relying on memorized sight words.",
    resource_type: "phonics",
    category: "test",
    skill_targeted: "Letter-Sound Mapping & Blending",
    grade_min: 1,
    grade_max: 8,
    language: "en",
    url: null,
    duration_minutes: 10,
    difficulty: "medium",
    conditions: ["dyslexia"],
    thumbnail_url: null,
    created_at: new Date().toISOString(),
    content: {
      overview: "Pseudoword practice tests clean phonetic decoding skills by presenting pronounceable non-words.",
      practiceItems: [
        { prompt: "Read aloud: 'B-L-I-M'", options: ["blim", "bilm", "limb", "balm"], answer: "blim", tip: "Sound out each letter individually: /b/ /l/ /i/ /m/" },
        { prompt: "Read aloud: 'S-T-R-O-N-K'", options: ["stronk", "stork", "strong", "strenk"], answer: "stronk", tip: "Blend /str/ + /onk/" },
        { prompt: "Read aloud: 'F-L-A-P-T'", options: ["flapt", "flat", "flop", "fleet"], answer: "flapt", tip: "Pay close attention to ending consonant blend /pt/" },
        { prompt: "Read aloud: 'G-R-I-P-H'", options: ["griph", "grip", "graph", "grief"], answer: "griph", tip: "The digraph 'ph' makes the /f/ sound" }
      ]
    }
  },
  {
    id: "res-5",
    title: "Letter Reversal (b/d/p/q) Discrimination Practice",
    description: "Visual discrimination worksheets and drills to build muscle memory and visual recognition for mirror letters.",
    resource_type: "visual",
    category: "test",
    skill_targeted: "Visual Confusion & Orientation",
    grade_min: 1,
    grade_max: 6,
    language: "en",
    url: null,
    duration_minutes: 10,
    difficulty: "easy",
    conditions: ["dyslexia", "dysgraphia"],
    thumbnail_url: null,
    created_at: new Date().toISOString(),
    content: {
      overview: "Targeted exercises using tactile cues ('bat before ball' for b; 'donut before door' for d).",
      practiceItems: [
        { prompt: "Which word starts with a 'b' (bat first)?", options: ["dog", "bat", "pig", "queen"], answer: "bat", tip: "Remember: 'b' has the tall line (bat) before the loop (ball)." },
        { prompt: "Identify the correct word:", options: ["bog", "dog", "pog", "qog"], answer: "dog", tip: "'d' starts with a circle (donut) then goes up to the stick (door)." },
        { prompt: "Which letter is pointing DOWN and to the LEFT?", options: ["b", "d", "p", "q"], answer: "q", tip: "'q' points down with tail to the right/left." }
      ]
    }
  },
  {
    id: "res-6",
    title: "Subitizing & Dot Pattern Quantity Test",
    description: "Rapid non-symbolic quantity test to sharpen immediate dot cluster recognition without 1-by-1 counting.",
    resource_type: "number_sense",
    category: "test",
    skill_targeted: "Rapid Non-Symbolic Quantity Recognition",
    grade_min: 1,
    grade_max: 8,
    language: "en",
    url: null,
    duration_minutes: 8,
    difficulty: "medium",
    conditions: ["dyscalculia"],
    thumbnail_url: null,
    created_at: new Date().toISOString(),
    content: {
      overview: "Subitizing is the ability to instantly perceive the count of a small group of items. Practicing builds internal number sense.",
      practiceItems: [
        { prompt: "Group A: ●●●●●  vs  Group B: ●●●. Which group is larger?", options: ["Group A (5 dots)", "Group B (3 dots)"], answer: "Group A (5 dots)", tip: "Notice the shape of 5 dots vs 3 dots." },
        { prompt: "Group A: ●●●●  vs  Group B: ●●●●●●. Which group is larger?", options: ["Group A (4 dots)", "Group B (6 dots)"], answer: "Group B (6 dots)", tip: "Look at density without counting one by one." }
      ]
    }
  },
  {
    id: "res-7",
    title: "Sequential Logic & Missing Pattern Practice",
    description: "Pattern completion drills for skip counting, prime numbers, and arithmetic logic sequences.",
    resource_type: "number_sense",
    category: "test",
    skill_targeted: "Skip Counting & Pattern Recognition",
    grade_min: 1,
    grade_max: 12,
    language: "en",
    url: null,
    duration_minutes: 10,
    difficulty: "medium",
    conditions: ["dyscalculia"],
    thumbnail_url: null,
    created_at: new Date().toISOString(),
    content: {
      overview: "Sequential logic practice strengthens working memory and numerical progression awareness.",
      practiceItems: [
        { prompt: "What comes next in the sequence: 4, 8, 12, 16, ?", options: ["18", "20", "22", "24"], answer: "20", tip: "Each step adds 4 (+4 rule)." },
        { prompt: "What is the missing number: 2, 3, 5, 7, 11, ?", options: ["12", "13", "14", "15"], answer: "13", tip: "This is the sequence of prime numbers." },
        { prompt: "What comes next: 3, 9, 27, 81, ?", options: ["162", "243", "324", "108"], answer: "243", tip: "Each number is multiplied by 3 (×3 progression)." }
      ]
    }
  },
  {
    id: "res-8",
    title: "Multisensory Orton-Gillingham Phonics Guide",
    description: "Step-by-step parent manual for teaching reading using visual, auditory, kinesthetic, and tactile (VAKT) techniques.",
    resource_type: "reading",
    category: "learning",
    skill_targeted: "Multisensory Reading Strategy",
    grade_min: 1,
    grade_max: 12,
    language: "en",
    url: null,
    duration_minutes: 20,
    difficulty: "medium",
    conditions: ["dyslexia"],
    thumbnail_url: null,
    created_at: new Date().toISOString(),
    content: {
      overview: "The Orton-Gillingham approach uses simultaneously visual, auditory, and kinesthetic pathways to reinforce phonics learning.",
      guides: [
        { heading: "1. Sand Tray Letter Tracing (Visual + Kinesthetic)", detail: "Pour salt or sand in a shallow tray. Have your child say the letter sound aloud while tracing the letter shape with index finger." },
        { heading: "2. Arm Tapping for Syllables (Auditory + Kinesthetic)", detail: "Tap shoulder for onset sound, elbow for vowel, and wrist for ending sound before sliding down arm to say the full word." },
        { heading: "3. Color-Coded Vowels and Consonants", detail: "Use red magnetic letters for vowels and blue for consonants to visually highlight syllable structures." }
      ]
    }
  },
  {
    id: "res-9",
    title: "CPA (Concrete-Pictorial-Abstract) Math Method Guide",
    description: "Parent guide to teaching math concepts starting with physical objects before moving to numbers and formulas.",
    resource_type: "number_sense",
    category: "learning",
    skill_targeted: "Conceptual Math Understanding",
    grade_min: 1,
    grade_max: 12,
    language: "en",
    url: null,
    duration_minutes: 15,
    difficulty: "easy",
    conditions: ["dyscalculia"],
    thumbnail_url: null,
    created_at: new Date().toISOString(),
    content: {
      overview: "Concrete-Pictorial-Abstract (CPA) is an effective 3-step learning approach recommended by NCERT for children with math difficulties.",
      guides: [
        { heading: "Step 1: Concrete (Physical Objects)", detail: "Use beads, rajma seeds, or coins for counting, addition, and grouping. Allow the child to move objects physically." },
        { heading: "Step 2: Pictorial (Diagrams & Tally Marks)", detail: "Draw dots, bar models, or tally lines on paper representing the physical objects." },
        { heading: "Step 3: Abstract (Numbers & Symbols)", detail: "Introduce written numerical equations (e.g. 5 + 3 = 8) only after concrete and pictorial stages are mastered." }
      ]
    }
  },
  {
    id: "res-10",
    title: "Parent Handbook: Supporting Children with SLD at Home",
    description: "Practical strategies for emotional support, homework routines, multi-sensory tools, and CBSE/NCERT accommodations.",
    resource_type: "reading",
    category: "learning",
    skill_targeted: "Parent Emotional & Academic Support",
    grade_min: 1,
    grade_max: 12,
    language: "en",
    url: null,
    duration_minutes: 25,
    difficulty: "easy",
    conditions: ["general", "dyslexia", "dyscalculia"],
    thumbnail_url: null,
    created_at: new Date().toISOString(),
    content: {
      overview: "Comprehensive guide empowering parents with actionable tips, encouragement techniques, and institutional rights under RPwD Act 2016.",
      guides: [
        { heading: "1. Create a Distraction-Free Study Nook", detail: "Keep homework area quiet, well-lit, and equipped with visual timers and fidget items." },
        { heading: "2. Chunk Homework into 15-Minute Sprints", detail: "Break large assignments into micro-tasks with 5-minute movement breaks between sprints." },
        { heading: "3. Utilize Assistive Technology", detail: "Leverage text-to-speech, audiobooks, and speech-to-text dictation tools to relieve reading/writing pressure." },
        { heading: "4. CBSE & School Accommodations", detail: "Children with SLD are eligible for extra exam time, scribe assistance, calculator use, and language waivers under CBSE guidelines." }
      ]
    }
  },
  {
    id: "res-11",
    title: "Hindi Varnamala & Matra Phonics Practice (हिंदी अक्षरज्ञान)",
    description: "Phonics practice for Hindi letter-sounds, matra recognition, and sound blending for bi-lingual students.",
    resource_type: "phonics",
    category: "test",
    skill_targeted: "Hindi Reading & Phoneme Awareness",
    grade_min: 1,
    grade_max: 8,
    language: "hi",
    url: null,
    duration_minutes: 12,
    difficulty: "medium",
    conditions: ["dyslexia"],
    thumbnail_url: null,
    created_at: new Date().toISOString(),
    content: {
      overview: "हिंदी वर्णमाला, स्वर-मात्रा तथा संयुक्त व्यंजनों का अभ्यासात्मक ज्ञान।",
      practiceItems: [
        { prompt: "'क' + 'म' + 'ल' जोड़कर क्या बनेगा?", options: ["कमल", "कलम", "मकल", "लकन"], answer: "कमल", tip: "अक्षरों की ध्वनि को एक साथ मिलाकर बोलें।" },
        { prompt: "'कि' तथा 'की' में छोटी 'इ' की मात्रा कौन सी है?", options: ["कि (छोटी इ)", "की (बड़ी इ)"], answer: "कि (छोटी इ)", tip: "छोटी 'इ' की मात्रा बाएं तरफ से लगती है।" }
      ]
    }
  },
  {
    id: "res-12",
    title: "Spatial Orientation & Pencil Grip Guide for Dysgraphia",
    description: "Visual guide and daily hand exercises to improve grip comfort, finger strength, and letter alignment.",
    resource_type: "visual",
    category: "learning",
    skill_targeted: "Graphomotor Control & Ergonomics",
    grade_min: 1,
    grade_max: 12,
    language: "en",
    url: null,
    duration_minutes: 15,
    difficulty: "easy",
    conditions: ["dysgraphia"],
    thumbnail_url: null,
    created_at: new Date().toISOString(),
    content: {
      overview: "Ergonomic practices and fun hand exercises to prevent cramps and improve handwriting neatness.",
      guides: [
        { heading: "1. The Dynamic Tripod Grip", detail: "Pinch pencil between index finger and thumb, resting pencil on middle finger. Use rubber grips if finger pressure is too strong." },
        { heading: "2. Daily Warm-up Finger Exercises", detail: "Squish play-dough or squeeze a stress ball for 2 minutes before writing to build intrinsic hand muscles." },
        { heading: "3. Highlighted Baseline Paper", detail: "Use a yellow highlighter over the bottom line of ruled paper to visually mark where letters must sit." }
      ]
    }
  }
];

interface ResourceInteraction {
  id: string;
  resource_id: string;
  student_id: string;
  parent_id: string;
  opened_at: string;
  completed: boolean;
  time_spent_minutes: number;
}

interface StudentProfile {
  id: string;
  name: string;
  grade: string;
  flaggedConditions: string[];
}

export function useLearningResources(studentId?: string) {
  const { user } = useAuth();
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [interactions, setInteractions] = useState<ResourceInteraction[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch student profile and their flagged conditions from test sessions
  const fetchStudentProfile = useCallback(async () => {
    if (!user || !studentId) return;

    const { data: student } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .maybeSingle();

    if (student) {
      // Get flagged conditions from test sessions
      const { data: sessions } = await supabase
        .from("test_sessions")
        .select("flagged_conditions")
        .eq("student_id", studentId)
        .eq("status", "completed");

      const allConditions = new Set<string>();
      sessions?.forEach((session) => {
        session.flagged_conditions?.forEach((condition: string) => {
          allConditions.add(condition.toLowerCase());
        });
      });

      // Map conditions to resource conditions
      const flaggedConditions: string[] = [];
      allConditions.forEach((condition) => {
        if (condition.includes("dyslexia") || condition.includes("reading") || condition.includes("phonological")) {
          flaggedConditions.push("dyslexia");
        }
        if (condition.includes("dyscalculia") || condition.includes("number") || condition.includes("math")) {
          flaggedConditions.push("dyscalculia");
        }
      });

      setStudentProfile({
        id: student.id,
        name: student.name,
        grade: student.grade,
        flaggedConditions: [...new Set(flaggedConditions)],
      });
    }
  }, [user, studentId]);

  // Fetch all resources
  const fetchResources = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("learning_resources")
        .select("*")
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        // Merge DB resources with default SLD resources (avoiding ID duplicates)
        const dbIds = new Set(data.map((r: any) => r.id));
        const mergedDefaults = DEFAULT_SLD_RESOURCES.filter((r) => !dbIds.has(r.id));
        setResources([...(data as LearningResource[]), ...mergedDefaults]);
      } else {
        setResources(DEFAULT_SLD_RESOURCES);
      }
    } catch (e) {
      console.warn("Error loading remote learning resources, using fallback:", e);
      setResources(DEFAULT_SLD_RESOURCES);
    }
  }, []);

  // Fetch user's interactions
  const fetchInteractions = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from("resource_interactions")
      .select("*")
      .eq("parent_id", user.id);

    if (data) {
      setInteractions(data as ResourceInteraction[]);
    }
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchStudentProfile(),
        fetchResources(),
        fetchInteractions(),
      ]);
      setLoading(false);
    };

    loadData();
  }, [fetchStudentProfile, fetchResources, fetchInteractions]);

  // Filter resources based on student profile
  const personalizedResources = useMemo(() => {
    if (!studentProfile) return resources;

    const gradeNum = parseInt(studentProfile.grade) || 1;
    const conditions = studentProfile.flaggedConditions;

    return resources.filter((resource) => {
      // Filter by grade range
      if (gradeNum < resource.grade_min || gradeNum > resource.grade_max) {
        return false;
      }

      // If student has flagged conditions, prioritize those resources
      // Also include 'general' resources
      if (conditions.length > 0) {
        const resourceConditions = resource.conditions || [];
        return (
          resourceConditions.some((c) => conditions.includes(c)) ||
          resourceConditions.includes("general")
        );
      }

      // If no flagged conditions, show general resources
      return resource.conditions?.includes("general") || resource.conditions?.length === 0;
    });
  }, [resources, studentProfile]);

  // Sort resources by relevance
  const sortedResources = useMemo(() => {
    if (!studentProfile) return personalizedResources;

    const conditions = studentProfile.flaggedConditions;

    return [...personalizedResources].sort((a, b) => {
      // Prioritize resources matching flagged conditions
      const aMatch = a.conditions?.some((c) => conditions.includes(c)) ? 1 : 0;
      const bMatch = b.conditions?.some((c) => conditions.includes(c)) ? 1 : 0;
      if (bMatch !== aMatch) return bMatch - aMatch;

      // Then sort by difficulty (easy first for struggling students)
      const difficultyOrder = { easy: 0, medium: 1, hard: 2 };
      const aDiff = difficultyOrder[a.difficulty as keyof typeof difficultyOrder] ?? 1;
      const bDiff = difficultyOrder[b.difficulty as keyof typeof difficultyOrder] ?? 1;
      return aDiff - bDiff;
    });
  }, [personalizedResources, studentProfile]);

  // Track resource interaction
  const trackInteraction = useCallback(
    async (resourceId: string) => {
      if (!user || !studentId) return;

      // Check if interaction already exists
      const existing = interactions.find(
        (i) => i.resource_id === resourceId && i.student_id === studentId
      );

      if (existing) {
        // Update existing interaction
        await supabase
          .from("resource_interactions")
          .update({ opened_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        // Create new interaction
        await supabase.from("resource_interactions").insert({
          resource_id: resourceId,
          student_id: studentId,
          parent_id: user.id,
        });
      }

      // Refresh interactions
      fetchInteractions();
    },
    [user, studentId, interactions, fetchInteractions]
  );

  // Mark resource as completed
  const markCompleted = useCallback(
    async (resourceId: string, timeSpent: number) => {
      if (!user || !studentId) return;

      const existing = interactions.find(
        (i) => i.resource_id === resourceId && i.student_id === studentId
      );

      if (existing) {
        await supabase
          .from("resource_interactions")
          .update({
            completed: true,
            time_spent_minutes: timeSpent,
          })
          .eq("id", existing.id);

        fetchInteractions();
      }
    },
    [user, studentId, interactions, fetchInteractions]
  );

  // Get interaction status for a resource
  const getInteractionStatus = useCallback(
    (resourceId: string) => {
      return interactions.find(
        (i) => i.resource_id === resourceId && i.student_id === studentId
      );
    },
    [interactions, studentId]
  );

  // Group resources by type
  const resourcesByType = useMemo(() => {
    const grouped: Record<string, LearningResource[]> = {};
    sortedResources.forEach((resource) => {
      if (!grouped[resource.resource_type]) {
        grouped[resource.resource_type] = [];
      }
      grouped[resource.resource_type].push(resource);
    });
    return grouped;
  }, [sortedResources]);

  return {
    loading,
    resources: sortedResources,
    resourcesByType,
    studentProfile,
    interactions,
    trackInteraction,
    markCompleted,
    getInteractionStatus,
    refetch: async () => {
      await Promise.all([fetchResources(), fetchInteractions()]);
    },
  };
}
