// Grade-Adaptive Difficulty System for Assessments
// Implements dynamic difficulty scaling based on grade level and student performance

export interface DifficultyConfig {
  baseTimeLimit: number;
  questionComplexity: 1 | 2 | 3 | 4 | 5;
  cognitiveLoad: 'low' | 'medium' | 'high';
  abstractionLevel: 'concrete' | 'semi-abstract' | 'abstract';
  responseExpectation: 'simple' | 'moderate' | 'detailed';
}

// Grade-specific difficulty configurations
export const gradeDifficultyConfigs: Record<string, DifficultyConfig> = {
  '1': {
    baseTimeLimit: 30,
    questionComplexity: 1,
    cognitiveLoad: 'low',
    abstractionLevel: 'concrete',
    responseExpectation: 'simple'
  },
  '2': {
    baseTimeLimit: 25,
    questionComplexity: 1,
    cognitiveLoad: 'low',
    abstractionLevel: 'concrete',
    responseExpectation: 'simple'
  },
  '3': {
    baseTimeLimit: 20,
    questionComplexity: 2,
    cognitiveLoad: 'medium',
    abstractionLevel: 'concrete',
    responseExpectation: 'moderate'
  },
  '4': {
    baseTimeLimit: 20,
    questionComplexity: 2,
    cognitiveLoad: 'medium',
    abstractionLevel: 'semi-abstract',
    responseExpectation: 'moderate'
  },
  '5': {
    baseTimeLimit: 15,
    questionComplexity: 3,
    cognitiveLoad: 'medium',
    abstractionLevel: 'semi-abstract',
    responseExpectation: 'detailed'
  },
  '6': {
    baseTimeLimit: 15,
    questionComplexity: 3,
    cognitiveLoad: 'high',
    abstractionLevel: 'semi-abstract',
    responseExpectation: 'detailed'
  },
  '7': {
    baseTimeLimit: 12,
    questionComplexity: 4,
    cognitiveLoad: 'high',
    abstractionLevel: 'abstract',
    responseExpectation: 'detailed'
  },
  '8': {
    baseTimeLimit: 10,
    questionComplexity: 5,
    cognitiveLoad: 'high',
    abstractionLevel: 'abstract',
    responseExpectation: 'detailed'
  }
};

// Adaptive difficulty adjuster based on real-time performance
export interface PerformanceTracker {
  correctStreak: number;
  incorrectStreak: number;
  averageResponseTime: number;
  questionsAnswered: number;
  currentDifficultyModifier: number; // -2 to +2
}

export function initializePerformanceTracker(): PerformanceTracker {
  return {
    correctStreak: 0,
    incorrectStreak: 0,
    averageResponseTime: 0,
    questionsAnswered: 0,
    currentDifficultyModifier: 0
  };
}

export function updatePerformanceTracker(
  tracker: PerformanceTracker,
  isCorrect: boolean,
  responseTime: number
): PerformanceTracker {
  const newTracker = { ...tracker };
  
  newTracker.questionsAnswered++;
  
  // Update response time average
  newTracker.averageResponseTime = 
    (tracker.averageResponseTime * (tracker.questionsAnswered - 1) + responseTime) / 
    tracker.questionsAnswered;
  
  if (isCorrect) {
    newTracker.correctStreak++;
    newTracker.incorrectStreak = 0;
    
    // Increase difficulty after 3 correct in a row
    if (newTracker.correctStreak >= 3 && newTracker.currentDifficultyModifier < 2) {
      newTracker.currentDifficultyModifier++;
      newTracker.correctStreak = 0;
    }
  } else {
    newTracker.incorrectStreak++;
    newTracker.correctStreak = 0;
    
    // Decrease difficulty after 2 incorrect in a row
    if (newTracker.incorrectStreak >= 2 && newTracker.currentDifficultyModifier > -2) {
      newTracker.currentDifficultyModifier--;
      newTracker.incorrectStreak = 0;
    }
  }
  
  return newTracker;
}

// Get adjusted time limit based on grade and performance
export function getAdjustedTimeLimit(
  baseTimeLimit: number,
  grade: string,
  difficultyModifier: number
): number {
  const config = gradeDifficultyConfigs[grade] || gradeDifficultyConfigs['4'];
  
  // Start with base time for the grade
  let adjustedTime = config.baseTimeLimit;
  
  // Apply question-specific base time if provided
  if (baseTimeLimit) {
    adjustedTime = baseTimeLimit;
  }
  
  // Apply difficulty modifier (each level adds/removes 3 seconds)
  adjustedTime += difficultyModifier * -3; // Harder = less time
  
  // Ensure reasonable bounds
  return Math.max(5, Math.min(60, adjustedTime));
}

// Select questions based on grade and current difficulty
export function selectQuestionsForDifficulty<T extends { difficulty: number; gradeLevel: string }>(
  questions: T[],
  grade: string,
  difficultyModifier: number,
  count: number
): T[] {
  const gradeLevel = getGradeLevel(parseInt(grade));
  
  // Filter to grade-appropriate questions
  let eligibleQuestions = questions.filter(q => q.gradeLevel === gradeLevel);
  
  // Adjust target difficulty based on modifier
  const baseDifficulty = parseInt(grade) <= 2 ? 1 : parseInt(grade) <= 4 ? 2 : 3;
  const targetDifficulty = Math.max(1, Math.min(3, baseDifficulty + difficultyModifier));
  
  // Sort by closeness to target difficulty
  eligibleQuestions.sort((a, b) => {
    const aDist = Math.abs(a.difficulty - targetDifficulty);
    const bDist = Math.abs(b.difficulty - targetDifficulty);
    return aDist - bDist;
  });
  
  // If not enough grade-level questions, include adjacent grades
  if (eligibleQuestions.length < count) {
    const adjacentQuestions = questions.filter(q => 
      q.gradeLevel !== gradeLevel &&
      isAdjacentGradeLevel(q.gradeLevel, gradeLevel)
    );
    eligibleQuestions = [...eligibleQuestions, ...adjacentQuestions];
  }
  
  // Shuffle and select
  return shuffleArray(eligibleQuestions).slice(0, count);
}

function getGradeLevel(grade: number): string {
  if (grade <= 2) return '1-2';
  if (grade <= 4) return '3-4';
  if (grade <= 6) return '5-6';
  return '7-8';
}

function isAdjacentGradeLevel(a: string, b: string): boolean {
  const levels = ['1-2', '3-4', '5-6', '7-8'];
  const indexA = levels.indexOf(a);
  const indexB = levels.indexOf(b);
  return Math.abs(indexA - indexB) === 1;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Difficulty feedback messages (gentle, encouraging)
export function getDifficultyFeedback(
  modifier: number,
  isIncrease: boolean
): string {
  if (isIncrease) {
    return "Great job! Let's try something a bit more challenging! 🌟";
  } else {
    return "Let's practice with some easier ones to build your confidence! 💪";
  }
}

// Grade-appropriate instruction language
export function getGradeAppropriateInstruction(
  baseInstruction: string,
  grade: number
): string {
  if (grade <= 2) {
    // Simpler language for younger children
    return baseInstruction
      .replace(/identify/gi, 'find')
      .replace(/determine/gi, 'figure out')
      .replace(/calculate/gi, 'count')
      .replace(/analyze/gi, 'look at')
      .replace(/comprehension/gi, 'understanding');
  }
  
  if (grade <= 4) {
    return baseInstruction
      .replace(/analyze/gi, 'think about')
      .replace(/comprehension/gi, 'understanding');
  }
  
  return baseInstruction;
}

// Calculate final score with difficulty adjustment
export function calculateAdjustedScore(
  rawScore: number,
  difficultyModifier: number
): number {
  // Bonus for answering harder questions correctly
  const difficultyBonus = difficultyModifier > 0 ? difficultyModifier * 2 : 0;
  
  // Slight penalty reduction for easier questions (to encourage growth)
  const easyPenalty = difficultyModifier < 0 ? difficultyModifier * 1 : 0;
  
  return Math.max(0, Math.min(100, rawScore + difficultyBonus + easyPenalty));
}
