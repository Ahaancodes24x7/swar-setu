// Perception-Based Cognitive Assessment Data
// Non-judgmental tests that evaluate how children perceive and interpret the world

export interface PerceptionQuestion {
  id: string;
  type: 'image-perception' | 'emotion-interpretation' | 'perspective-test';
  instruction: string;
  imagePrompt: string; // Description (kept for reference, not used for generation)
  imageUrl?: string; // Path to pre-generated image file (e.g., '/images/perception/ip-1-1.jpg')
  ageGroup: '1-2' | '3-4' | '5-6' | '7-8';
  gradeLevel: string;
  options?: string[];
  // No "correct" answer - these measure perception, not correctness
  responseType: 'multiple-choice' | 'voice' | 'text';
  analysisMetrics: ('emotional-polarity' | 'consistency' | 'detail-level' | 'perspective-type')[];
}

// Grade-appropriate prompts that scale with cognitive development
export const imagePerceptionTests: Record<string, PerceptionQuestion[]> = {
  en: [
    // Grade 1-2: Simple, concrete images
    {
      id: 'ip-1-1',
      type: 'image-perception',
      instruction: 'Look at this picture. What do you see?',
      imagePrompt: 'A child-friendly illustration of a park with swings, trees, and a path. Colorful and simple, cartoon style, no text.',
      imageUrl: '/images/perception/ip-1-1.jpg',
      ageGroup: '1-2',
      gradeLevel: '1-2',
      options: ['A happy place', 'A scary place', 'A quiet place', 'A busy place'],
      responseType: 'multiple-choice',
      analysisMetrics: ['emotional-polarity', 'perspective-type']
    },
    {
      id: 'ip-1-2',
      type: 'image-perception',
      instruction: 'How does this picture make you feel?',
      imagePrompt: 'A warm illustration of a cozy house with windows glowing orange, smoke from chimney, surrounded by gentle snow. Child-friendly, soft colors.',
      imageUrl: '/images/perception/ip-1-2.jpg',
      ageGroup: '1-2',
      gradeLevel: '1-2',
      options: ['Safe', 'Cold', 'Happy', 'Sleepy'],
      responseType: 'multiple-choice',
      analysisMetrics: ['emotional-polarity']
    },
    {
      id: 'ip-1-3',
      type: 'image-perception',
      instruction: 'What do you think is happening in this picture?',
      imagePrompt: 'A simple illustration of two cartoon children sharing an umbrella in the rain, both smiling. Bright colors, friendly style.',
      imageUrl: '/images/perception/ip-1-3.jpg',
      ageGroup: '1-2',
      gradeLevel: '1-2',
      options: ['Friends helping', 'Going to school', 'Playing a game', 'Waiting for someone'],
      responseType: 'multiple-choice',
      analysisMetrics: ['perspective-type', 'detail-level']
    },

    // Grade 3-4: More complex scenes with room for interpretation
    {
      id: 'ip-3-1',
      type: 'image-perception',
      instruction: 'Look carefully at this picture. Tell me what you notice.',
      imagePrompt: 'An illustrated scene of a classroom with empty desks, one window showing sunlight, papers scattered. Neutral mood, detailed illustration.',
      imageUrl: '/images/perception/ip-3-1.jpg',
      ageGroup: '3-4',
      gradeLevel: '3-4',
      responseType: 'voice',
      analysisMetrics: ['detail-level', 'emotional-polarity', 'perspective-type']
    },
    {
      id: 'ip-3-2',
      type: 'image-perception',
      instruction: 'What story do you think this picture is telling?',
      imagePrompt: 'An illustration of a winding path through a forest with dappled sunlight. Some areas bright, some shadowy. Magical but not scary.',
      imageUrl: '/images/perception/ip-3-2.jpg',
      ageGroup: '3-4',
      gradeLevel: '3-4',
      responseType: 'voice',
      analysisMetrics: ['detail-level', 'perspective-type', 'consistency']
    },
    {
      id: 'ip-3-3',
      type: 'image-perception',
      instruction: 'If you could step into this picture, how would you feel?',
      imagePrompt: 'A colorful illustration of a busy Indian marketplace with fruits, flowers, and people. Vibrant colors, cheerful atmosphere.',
      imageUrl: '/images/perception/ip-3-3.jpg',
      ageGroup: '3-4',
      gradeLevel: '3-4',
      options: ['Excited', 'Overwhelmed', 'Happy', 'Curious'],
      responseType: 'multiple-choice',
      analysisMetrics: ['emotional-polarity']
    },

    // Grade 5-6: Abstract and interpretive images
    {
      id: 'ip-5-1',
      type: 'image-perception',
      instruction: 'What mood does this abstract image convey to you? Explain why.',
      imagePrompt: 'An abstract art piece with flowing curves in blues and greens, suggesting water or movement. Peaceful but with dynamic elements.',
      imageUrl: '/images/perception/ip-5-1.jpg',
      ageGroup: '5-6',
      gradeLevel: '5-6',
      responseType: 'voice',
      analysisMetrics: ['emotional-polarity', 'detail-level', 'perspective-type']
    },
    {
      id: 'ip-5-2',
      type: 'image-perception',
      instruction: 'This image can be seen in different ways. What do you see, and what might someone else see differently?',
      imagePrompt: 'A simple optical illusion that could be seen as either a vase or two faces looking at each other. Clean black and white.',
      imageUrl: '/images/perception/ip-5-2.jpg',
      ageGroup: '5-6',
      gradeLevel: '5-6',
      responseType: 'voice',
      analysisMetrics: ['perspective-type', 'detail-level', 'consistency']
    },
    {
      id: 'ip-5-3',
      type: 'image-perception',
      instruction: 'Look at this scene. What do you think happened before this moment? What might happen next?',
      imagePrompt: 'An illustration of an open book on a desk near a window, with dried leaves nearby and soft afternoon light. Contemplative mood.',
      imageUrl: '/images/perception/ip-5-3.jpg',
      ageGroup: '5-6',
      gradeLevel: '5-6',
      responseType: 'voice',
      analysisMetrics: ['detail-level', 'perspective-type', 'consistency']
    },

// Grade 7-8: Complex interpretation
    {
      id: 'ip-7-1',
      type: 'image-perception',
      instruction: 'Describe what this image means to you. There is no right or wrong answer.',
      imagePrompt: 'An artistic illustration showing a single tree on a hill, half in bright daylight and half in moonlit night. Symbolic and contemplative.',
      imageUrl: '/images/perception/ip-7-1.jpg',
      ageGroup: '7-8',
      gradeLevel: '7-8',
      responseType: 'voice',
      analysisMetrics: ['emotional-polarity', 'detail-level', 'perspective-type', 'consistency']
    },
    {
      id: 'ip-7-2',
      type: 'image-perception',
      instruction: 'If this image represented a feeling or idea, what would it be?',
      imagePrompt: 'An abstract composition with interlocking geometric shapes in warm and cool colors, suggesting both harmony and tension.',
      imageUrl: '/images/perception/ip-7-2.jpg',
      ageGroup: '7-8',
      gradeLevel: '7-8',
      responseType: 'voice',
      analysisMetrics: ['emotional-polarity', 'perspective-type', 'detail-level']
    },

    // Grade 9-10: Abstract reasoning and meta-cognition
    {
      id: 'ip-9-1',
      type: 'image-perception',
      instruction: 'This image could represent multiple abstract concepts. Identify at least two interpretations and explain which resonates more with you and why.',
      imagePrompt: 'A surrealist illustration of an hourglass where the top half contains a bustling city and the bottom half contains a peaceful natural forest. Sand flows between them. Thought-provoking, artistic style.',
      imageUrl: '/images/perception/ip-9-1.jpg',
      ageGroup: '7-8',
      gradeLevel: '9-10',
      responseType: 'voice',
      analysisMetrics: ['emotional-polarity', 'detail-level', 'perspective-type', 'consistency']
    },
    {
      id: 'ip-9-2',
      type: 'image-perception',
      instruction: 'Analyze this image as if writing a critical review. What message is the artist trying to convey? Do you agree or disagree with that message?',
      imagePrompt: 'An illustration showing a person standing at a crossroads with one path leading to a bright modern city and the other to a quiet village with fields. The person casts two shadows going in different directions. Symbolic, detailed.',
      imageUrl: '/images/perception/ip-9-2.jpg',
      ageGroup: '7-8',
      gradeLevel: '9-10',
      responseType: 'voice',
      analysisMetrics: ['emotional-polarity', 'detail-level', 'perspective-type', 'consistency']
    },
    {
      id: 'ip-9-3',
      type: 'image-perception',
      instruction: 'Consider how a historian, a scientist, and a poet might each describe this image differently. Give their perspectives.',
      imagePrompt: 'An illustration of ancient ruins being overtaken by nature — vines growing through crumbling stone arches, a river flowing through a broken amphitheater, birds nesting in columns. Beautiful and melancholic.',
      imageUrl: '/images/perception/ip-9-3.jpg',
      ageGroup: '7-8',
      gradeLevel: '9-10',
      responseType: 'voice',
      analysisMetrics: ['perspective-type', 'detail-level', 'consistency']
    }
  ],
  hi: [
    {
      id: 'ip-hi-1-1',
      type: 'image-perception',
      instruction: 'इस तस्वीर को देखो। तुम्हें क्या दिखाई देता है?',
      imagePrompt: 'A child-friendly illustration of a park with swings, trees, and a path. Colorful and simple, cartoon style, no text.',
      imageUrl: '/images/perception/ip-1-1.jpg',
      ageGroup: '1-2',
      gradeLevel: '1-2',
      options: ['एक खुशी की जगह', 'एक डरावनी जगह', 'एक शांत जगह', 'एक व्यस्त जगह'],
      responseType: 'multiple-choice',
      analysisMetrics: ['emotional-polarity', 'perspective-type']
    },
    {
      id: 'ip-hi-3-1',
      type: 'image-perception',
      instruction: 'इस तस्वीर को ध्यान से देखो। बताओ तुम्हें क्या दिखाई देता है।',
      imagePrompt: 'An illustrated scene of a classroom with empty desks, one window showing sunlight, papers scattered. Neutral mood, detailed illustration.',
      imageUrl: '/images/perception/ip-3-1.jpg',
      ageGroup: '3-4',
      gradeLevel: '3-4',
      responseType: 'voice',
      analysisMetrics: ['detail-level', 'emotional-polarity', 'perspective-type']
    }
  ]
};

// Emotion Interpretation Tests
export const emotionInterpretationTests: Record<string, PerceptionQuestion[]> = {
  en: [
    // Grade 1-2: Simple facial expressions
    {
      id: 'ei-1-1',
      type: 'emotion-interpretation',
      instruction: 'How is this person feeling?',
      imagePrompt: 'A simple cartoon illustration of a child with a surprised expression, wide eyes and open mouth. Friendly style.',
      imageUrl: '/images/perception/ei-1-1.jpg',
      ageGroup: '1-2',
      gradeLevel: '1-2',
      options: ['Surprised', 'Angry', 'Sad', 'Happy'],
      responseType: 'multiple-choice',
      analysisMetrics: ['emotional-polarity']
    },
    {
      id: 'ei-1-2',
      type: 'emotion-interpretation',
      instruction: 'Look at this face. What might have happened to make them feel this way?',
      imagePrompt: 'A cartoon child with a proud, happy expression holding up something like artwork or a certificate. Simple, colorful.',
      imageUrl: '/images/perception/ei-1-2.jpg',
      ageGroup: '1-2',
      gradeLevel: '1-2',
      options: ['They won a prize', 'They lost something', 'They are hungry', 'They are sleepy'],
      responseType: 'multiple-choice',
      analysisMetrics: ['perspective-type']
    },

    // Grade 3-4: Context-based emotion
    {
      id: 'ei-3-1',
      type: 'emotion-interpretation',
      instruction: 'Look at this scene. How do you think the child is feeling and why?',
      imagePrompt: 'An illustration of a child looking out a window at rain, with toys scattered around. The expression is ambiguous - could be contemplative or sad.',
      imageUrl: '/images/perception/ei-3-1.jpg',
      ageGroup: '3-4',
      gradeLevel: '3-4',
      responseType: 'voice',
      analysisMetrics: ['emotional-polarity', 'perspective-type', 'detail-level']
    },
    {
      id: 'ei-3-2',
      type: 'emotion-interpretation',
      instruction: 'What do you think these two friends are feeling?',
      imagePrompt: 'Two cartoon children, one with a slightly downcast expression and one looking concerned and reaching out. Supportive scene.',
      imageUrl: '/images/perception/ei-3-2.jpg',
      ageGroup: '3-4',
      gradeLevel: '3-4',
      options: ['One is sad, one is helping', 'Both are happy', 'Both are angry', 'They are playing'],
      responseType: 'multiple-choice',
      analysisMetrics: ['emotional-polarity', 'perspective-type']
    },

    // Grade 5-6: Complex emotions
    {
      id: 'ei-5-1',
      type: 'emotion-interpretation',
      instruction: 'People can feel more than one emotion at a time. What different feelings might this person be experiencing?',
      imagePrompt: 'An illustration of a student looking at a report card with a complex expression - perhaps relief mixed with disappointment or hope.',
      imageUrl: '/images/perception/ei-5-1.jpg',
      ageGroup: '5-6',
      gradeLevel: '5-6',
      responseType: 'voice',
      analysisMetrics: ['emotional-polarity', 'detail-level', 'perspective-type']
    },

// Grade 7-8: Nuanced interpretation
    {
      id: 'ei-7-1',
      type: 'emotion-interpretation',
      instruction: 'Sometimes people hide how they really feel. What emotion is being shown, and what might they really be feeling inside?',
      imagePrompt: 'An illustration of a person at a farewell party, smiling but with eyes that suggest deeper emotion. Realistic cartoon style.',
      imageUrl: '/images/perception/ei-7-1.jpg',
      ageGroup: '7-8',
      gradeLevel: '7-8',
      responseType: 'voice',
      analysisMetrics: ['emotional-polarity', 'perspective-type', 'detail-level', 'consistency']
    },

    // Grade 9-10: Layered emotional analysis
    {
      id: 'ei-9-1',
      type: 'emotion-interpretation',
      instruction: 'This scene shows a complex social situation. Analyze what each person might be feeling, and explain how their different perspectives could lead to misunderstanding.',
      imagePrompt: 'An illustration of three students in a school hallway: one leaning against a wall looking at their phone with a slight frown, another approaching with a concerned expression, and a third watching from a distance with crossed arms. Realistic cartoon, detailed expressions.',
      imageUrl: '/images/perception/ei-9-1.jpg',
      ageGroup: '7-8',
      gradeLevel: '9-10',
      responseType: 'voice',
      analysisMetrics: ['emotional-polarity', 'perspective-type', 'detail-level', 'consistency']
    },
    {
      id: 'ei-9-2',
      type: 'emotion-interpretation',
      instruction: 'This image shows someone experiencing conflicting emotions. Describe the emotional conflict, and suggest what life experience might lead to feeling this way.',
      imagePrompt: 'An artistic illustration of a graduate holding their diploma, standing at the school gate looking back at the building. Their expression is a mix of pride, nostalgia, and uncertainty about the future. Warm lighting, detailed.',
      imageUrl: '/images/perception/ei-9-2.jpg',
      ageGroup: '7-8',
      gradeLevel: '9-10',
      responseType: 'voice',
      analysisMetrics: ['emotional-polarity', 'perspective-type', 'detail-level', 'consistency']
    }
  ],
  hi: [
    {
      id: 'ei-hi-1-1',
      type: 'emotion-interpretation',
      instruction: 'यह व्यक्ति कैसा महसूस कर रहा है?',
      imagePrompt: 'A simple cartoon illustration of a child with a surprised expression, wide eyes and open mouth. Friendly style.',
      imageUrl: '/images/perception/ei-1-1.jpg',
      ageGroup: '1-2',
      gradeLevel: '1-2',
      options: ['हैरान', 'गुस्सा', 'दुखी', 'खुश'],
      responseType: 'multiple-choice',
      analysisMetrics: ['emotional-polarity']
    }
  ]
};

// Perspective Tests
export const perspectiveTests: Record<string, PerceptionQuestion[]> = {
  en: [
    // Grade 3-4
    {
      id: 'pt-3-1',
      type: 'perspective-test',
      instruction: 'Two people are looking at this picture. One says it looks peaceful, another says it looks lonely. Which view is closer to yours?',
      imagePrompt: 'An illustration of a single boat on a calm lake with mountains in the background. Serene but could feel isolated.',
      imageUrl: '/images/perception/pt-3-1.jpg',
      ageGroup: '3-4',
      gradeLevel: '3-4',
      options: ['Peaceful', 'Lonely', 'Both', 'Neither'],
      responseType: 'multiple-choice',
      analysisMetrics: ['emotional-polarity', 'perspective-type']
    },

    // Grade 5-6
    {
      id: 'pt-5-1',
      type: 'perspective-test',
      instruction: 'Look at this image from two different viewpoints. Describe what someone who is happy might see, and what someone who is worried might see.',
      imagePrompt: 'An illustration of a road stretching into the horizon with a partly cloudy sky. Could represent adventure or uncertainty.',
      imageUrl: '/images/perception/pt-5-1.jpg',
      ageGroup: '5-6',
      gradeLevel: '5-6',
      responseType: 'voice',
      analysisMetrics: ['perspective-type', 'detail-level', 'emotional-polarity']
    },

    // Grade 7-8
    {
      id: 'pt-7-1',
      type: 'perspective-test',
      instruction: 'This is the same scene shown from different angles. How does changing the viewpoint change the meaning or feeling of the scene?',
      imagePrompt: 'A split illustration showing the same city street from above (organized, geometric) and from street level (busy, personal). Urban scene.',
      imageUrl: '/images/perception/pt-7-1.jpg',
      ageGroup: '7-8',
      gradeLevel: '7-8',
      responseType: 'voice',
      analysisMetrics: ['perspective-type', 'detail-level', 'consistency']
    },

    // Grade 9-10: Meta-cognitive perspective analysis
    {
      id: 'pt-9-1',
      type: 'perspective-test',
      instruction: 'This image can be interpreted as representing progress or destruction depending on your worldview. Argue both sides and state which perspective you find more compelling.',
      imagePrompt: 'An illustration showing a landscape being transformed: on the left, pristine forest; in the middle, construction and development in progress; on the right, a modern sustainable city with green rooftops. Panoramic, detailed.',
      imageUrl: '/images/perception/pt-9-1.jpg',
      ageGroup: '7-8',
      gradeLevel: '9-10',
      responseType: 'voice',
      analysisMetrics: ['perspective-type', 'detail-level', 'emotional-polarity', 'consistency']
    },
    {
      id: 'pt-9-2',
      type: 'perspective-test',
      instruction: 'Imagine you are showing this image to a 5-year-old child, a teenager, and a grandparent. How would each person describe what they see? What does this tell us about how perspective shapes understanding?',
      imagePrompt: 'An illustration of a large banyan tree in an Indian village with children playing under it, elders sitting on a bench, and a teenager reading a book while leaning against it. Golden hour lighting, nostalgic.',
      imageUrl: '/images/perception/pt-9-2.jpg',
      ageGroup: '7-8',
      gradeLevel: '9-10',
      responseType: 'voice',
      analysisMetrics: ['perspective-type', 'detail-level', 'consistency']
    }
  ],
  hi: [
    {
      id: 'pt-hi-3-1',
      type: 'perspective-test',
      instruction: 'दो लोग इस तस्वीर को देख रहे हैं। एक कहता है यह शांत है, दूसरा कहता है यह अकेला है। तुम्हारी राय किससे मिलती है?',
      imagePrompt: 'An illustration of a single boat on a calm lake with mountains in the background. Serene but could feel isolated.',
      imageUrl: '/images/perception/pt-3-1.jpg',
      ageGroup: '3-4',
      gradeLevel: '3-4',
      options: ['शांत', 'अकेला', 'दोनों', 'कोई नहीं'],
      responseType: 'multiple-choice',
      analysisMetrics: ['emotional-polarity', 'perspective-type']
    }
  ]
};

// Helper to get grade-appropriate questions
export function getPerceptionQuestionsByGrade(
  gradeNum: number,
  language: string = 'en'
): PerceptionQuestion[] {
  const gradeLevel = gradeNum <= 2 ? '1-2' : gradeNum <= 4 ? '3-4' : gradeNum <= 6 ? '5-6' : gradeNum <= 8 ? '7-8' : '9-10';
  
  const allQuestions = [
    ...(imagePerceptionTests[language] || imagePerceptionTests.en),
    ...(emotionInterpretationTests[language] || emotionInterpretationTests.en),
    ...(perspectiveTests[language] || perspectiveTests.en)
  ];
  
  return allQuestions.filter(q => q.gradeLevel === gradeLevel);
}

// Perception response analysis structure
export interface PerceptionResponse {
  questionId: string;
  responseType: 'multiple-choice' | 'voice' | 'text';
  response: string;
  responseTime: number;
  timestamp: string;
}

export interface PerceptionAnalysis {
  emotionalPolarity: 'positive' | 'neutral' | 'negative' | 'mixed';
  detailLevel: 'low' | 'medium' | 'high';
  perspectiveType: 'concrete' | 'abstract' | 'empathetic' | 'analytical';
  consistency: number; // 0-100
  trends: {
    emotional: string;
    cognitive: string;
  };
}
