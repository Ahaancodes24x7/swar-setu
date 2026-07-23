// Advanced Dysgraphia Stroke Analysis Engine
// Evaluates handwriting quality using multiple DSM-5 aligned metrics

export interface StrokePoint {
  x: number;
  y: number;
  time: number;
}

export interface StrokeData {
  points: StrokePoint[];
  width: number;
}

export interface DysgraphiaMetrics {
  // Core metrics
  strokeCount: number;
  totalTime: number;
  hesitationCount: number;
  avgStrokeSpeed: number;

  // Advanced metrics
  strokeSmoothness: number;       // 0-100: How smooth strokes are (no jitter/tremor)
  speedConsistency: number;       // 0-100: How consistent writing speed is
  spatialOrganization: number;    // 0-100: Canvas usage & spatial distribution
  strokePrecision: number;        // 0-100: Straightness and controlled curves
  microTremorCount: number;       // Count of rapid direction reversals (tremor indicator)
  avgPauseDuration: number;       // Average pause between strokes (ms)
  writingPressureVariance: number;// 0-100: How consistent stroke widths are
  letterSizeConsistency: number;  // 0-100: How consistent stroke bounding boxes are
}

export interface DysgraphiaAnalysisResult {
  overallScore: number;
  riskLevel: "low" | "moderate" | "high";
  metrics: DysgraphiaMetrics;
  domainScores: {
    motorControl: number;
    writingFluency: number;
    spatialAwareness: number;
    consistency: number;
  };
  flaggedConditions: string[];
  summary: string;
  recommendations: string[];
}

/**
 * Calculate the angle between three consecutive points
 */
function angleBetween(p1: StrokePoint, p2: StrokePoint, p3: StrokePoint): number {
  const v1x = p2.x - p1.x;
  const v1y = p2.y - p1.y;
  const v2x = p3.x - p2.x;
  const v2y = p3.y - p2.y;
  const dot = v1x * v2x + v1y * v2y;
  const cross = v1x * v2y - v1y * v2x;
  return Math.atan2(cross, dot);
}

/**
 * Calculate stroke smoothness — fewer sudden angle changes = smoother
 */
function calculateStrokeSmoothness(strokes: StrokeData[]): number {
  if (strokes.length === 0) return 50;

  let totalAngleChanges = 0;
  let totalSegments = 0;

  for (const stroke of strokes) {
    if (stroke.points.length < 3) continue;
    for (let i = 1; i < stroke.points.length - 1; i++) {
      const angle = Math.abs(angleBetween(
        stroke.points[i - 1],
        stroke.points[i],
        stroke.points[i + 1]
      ));
      totalAngleChanges += angle;
      totalSegments++;
    }
  }

  if (totalSegments === 0) return 50;
  const avgAngleChange = totalAngleChanges / totalSegments;
  // Convert radians to a 0-100 score. π = worst, 0 = perfect
  return Math.max(0, Math.min(100, 100 - (avgAngleChange / Math.PI) * 120));
}

/**
 * Speed consistency — coefficient of variation of segment speeds
 */
function calculateSpeedConsistency(strokes: StrokeData[]): number {
  const speeds: number[] = [];

  for (const stroke of strokes) {
    for (let i = 1; i < stroke.points.length; i++) {
      const dt = stroke.points[i].time - stroke.points[i - 1].time;
      if (dt <= 0) continue;
      const dist = Math.hypot(
        stroke.points[i].x - stroke.points[i - 1].x,
        stroke.points[i].y - stroke.points[i - 1].y
      );
      speeds.push(dist / dt);
    }
  }

  if (speeds.length < 2) return 50;

  const mean = speeds.reduce((s, v) => s + v, 0) / speeds.length;
  if (mean === 0) return 50;
  const variance = speeds.reduce((s, v) => s + (v - mean) ** 2, 0) / speeds.length;
  const cv = Math.sqrt(variance) / mean; // Coefficient of variation

  // CV of 0 = perfect, CV > 2 = very inconsistent
  return Math.max(0, Math.min(100, 100 - cv * 40));
}

/**
 * Spatial organization — how well the canvas space is utilized
 */
function calculateSpatialOrganization(strokes: StrokeData[], canvasWidth: number, canvasHeight: number): number {
  if (strokes.length === 0 || canvasWidth === 0 || canvasHeight === 0) return 50;

  const allPoints = strokes.flatMap(s => s.points);
  if (allPoints.length === 0) return 50;

  const minX = Math.min(...allPoints.map(p => p.x));
  const maxX = Math.max(...allPoints.map(p => p.x));
  const minY = Math.min(...allPoints.map(p => p.y));
  const maxY = Math.max(...allPoints.map(p => p.y));

  const usedWidth = maxX - minX;
  const usedHeight = maxY - minY;

  // Penalize both extremes: too little usage OR drawing in corner only
  const widthRatio = usedWidth / canvasWidth;
  const heightRatio = usedHeight / canvasHeight;

  // Ideal: 30-80% of canvas used
  const widthScore = widthRatio < 0.1 ? 20 : widthRatio < 0.3 ? 60 : widthRatio < 0.8 ? 100 : 80;
  const heightScore = heightRatio < 0.1 ? 20 : heightRatio < 0.3 ? 60 : heightRatio < 0.8 ? 100 : 80;

  // Check centering
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerDeviation = Math.hypot(
    centerX - canvasWidth / 2,
    centerY - canvasHeight / 2
  ) / Math.hypot(canvasWidth / 2, canvasHeight / 2);

  const centerScore = Math.max(0, 100 - centerDeviation * 80);

  return Math.round((widthScore + heightScore + centerScore) / 3);
}

/**
 * Stroke precision — how straight/controlled the strokes are
 */
function calculateStrokePrecision(strokes: StrokeData[]): number {
  if (strokes.length === 0) return 50;

  let totalRatio = 0;
  let count = 0;

  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;

    // Calculate actual path length vs direct distance
    let pathLength = 0;
    for (let i = 1; i < stroke.points.length; i++) {
      pathLength += Math.hypot(
        stroke.points[i].x - stroke.points[i - 1].x,
        stroke.points[i].y - stroke.points[i - 1].y
      );
    }

    const directDist = Math.hypot(
      stroke.points[stroke.points.length - 1].x - stroke.points[0].x,
      stroke.points[stroke.points.length - 1].y - stroke.points[0].y
    );

    if (pathLength > 0 && directDist > 5) {
      // Ratio of 1.0 = perfectly straight, higher = more wobbly
      totalRatio += directDist / pathLength;
      count++;
    }
  }

  if (count === 0) return 50;
  const avgRatio = totalRatio / count;
  // Map ratio: 1.0 = 100, 0.3 = 0
  return Math.max(0, Math.min(100, avgRatio * 100));
}

/**
 * Detect micro-tremors — rapid direction reversals indicating motor control issues
 */
function countMicroTremors(strokes: StrokeData[]): number {
  let tremorCount = 0;

  for (const stroke of strokes) {
    if (stroke.points.length < 4) continue;

    for (let i = 2; i < stroke.points.length - 1; i++) {
      const angle1 = angleBetween(stroke.points[i - 2], stroke.points[i - 1], stroke.points[i]);
      const angle2 = angleBetween(stroke.points[i - 1], stroke.points[i], stroke.points[i + 1]);

      // Direction reversal within a short time window
      const timeDiff = stroke.points[i + 1].time - stroke.points[i - 2].time;
      if (timeDiff < 200 && Math.abs(angle1) > 1.2 && Math.abs(angle2) > 1.2 && Math.sign(angle1) !== Math.sign(angle2)) {
        tremorCount++;
      }
    }
  }

  return tremorCount;
}

/**
 * Letter size consistency — variance in bounding boxes of individual strokes
 */
function calculateLetterSizeConsistency(strokes: StrokeData[]): number {
  if (strokes.length < 2) return 70;

  const sizes: number[] = [];
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;
    const xs = stroke.points.map(p => p.x);
    const ys = stroke.points.map(p => p.y);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    sizes.push(Math.max(w, h));
  }

  if (sizes.length < 2) return 70;

  const mean = sizes.reduce((s, v) => s + v, 0) / sizes.length;
  if (mean === 0) return 70;
  const variance = sizes.reduce((s, v) => s + (v - mean) ** 2, 0) / sizes.length;
  const cv = Math.sqrt(variance) / mean;

  return Math.max(0, Math.min(100, 100 - cv * 60));
}

/**
 * Calculate hesitation count (pauses > threshold ms between strokes)
 */
function calculateHesitations(strokes: StrokeData[]): { count: number; avgPause: number } {
  const pauseThreshold = 400; // ms
  let hesitationCount = 0;
  let totalPause = 0;
  let pauseCount = 0;

  // Between strokes
  for (let i = 1; i < strokes.length; i++) {
    const prevEnd = strokes[i - 1].points[strokes[i - 1].points.length - 1]?.time || 0;
    const nextStart = strokes[i].points[0]?.time || 0;
    const pause = nextStart - prevEnd;
    if (pause > 0) {
      totalPause += pause;
      pauseCount++;
      if (pause > pauseThreshold) hesitationCount++;
    }
  }

  // Within strokes (long pauses mid-stroke)
  for (const stroke of strokes) {
    for (let i = 1; i < stroke.points.length; i++) {
      const dt = stroke.points[i].time - stroke.points[i - 1].time;
      if (dt > pauseThreshold * 1.5) hesitationCount++;
    }
  }

  return {
    count: hesitationCount,
    avgPause: pauseCount > 0 ? totalPause / pauseCount : 0,
  };
}

/**
 * Main analysis function — takes all strokes and produces a comprehensive report
 */
export function analyzeDysgraphia(
  strokes: StrokeData[],
  totalTimeMs: number,
  canvasWidth: number,
  canvasHeight: number,
  promptType: string,
  studentName: string,
  gradeNum: number
): DysgraphiaAnalysisResult {
  // Calculate all metrics
  const strokeSmoothness = calculateStrokeSmoothness(strokes);
  const speedConsistency = calculateSpeedConsistency(strokes);
  const spatialOrganization = calculateSpatialOrganization(strokes, canvasWidth, canvasHeight);
  const strokePrecision = calculateStrokePrecision(strokes);
  const microTremorCount = countMicroTremors(strokes);
  const letterSizeConsistency = calculateLetterSizeConsistency(strokes);
  const { count: hesitationCount, avgPause } = calculateHesitations(strokes);

  // Average speed
  let totalSpeed = 0;
  let speedCount = 0;
  for (const stroke of strokes) {
    for (let i = 1; i < stroke.points.length; i++) {
      const dt = stroke.points[i].time - stroke.points[i - 1].time;
      const dist = Math.hypot(
        stroke.points[i].x - stroke.points[i - 1].x,
        stroke.points[i].y - stroke.points[i - 1].y
      );
      if (dt > 0) {
        totalSpeed += dist / dt;
        speedCount++;
      }
    }
  }
  const avgStrokeSpeed = speedCount > 0 ? totalSpeed / speedCount : 0;

  const metrics: DysgraphiaMetrics = {
    strokeCount: strokes.length,
    totalTime: totalTimeMs,
    hesitationCount,
    avgStrokeSpeed: Math.round(avgStrokeSpeed * 100) / 100,
    strokeSmoothness: Math.round(strokeSmoothness),
    speedConsistency: Math.round(speedConsistency),
    spatialOrganization: Math.round(spatialOrganization),
    strokePrecision: Math.round(strokePrecision),
    microTremorCount,
    avgPauseDuration: Math.round(avgPause),
    writingPressureVariance: 70, // Placeholder — canvas API doesn't expose pressure
    letterSizeConsistency: Math.round(letterSizeConsistency),
  };

  // Domain scores
  const motorControl = Math.round(
    strokeSmoothness * 0.4 +
    strokePrecision * 0.3 +
    (100 - Math.min(microTremorCount * 8, 100)) * 0.3
  );

  const writingFluency = Math.round(
    speedConsistency * 0.4 +
    (100 - Math.min(hesitationCount * 10, 100)) * 0.35 +
    (100 - Math.min(avgPause / 20, 100)) * 0.25
  );

  const spatialAwareness = Math.round(
    spatialOrganization * 0.6 +
    letterSizeConsistency * 0.4
  );

  const consistency = Math.round(
    speedConsistency * 0.3 +
    letterSizeConsistency * 0.4 +
    strokeSmoothness * 0.3
  );

  const domainScores = { motorControl, writingFluency, spatialAwareness, consistency };

  // Overall score (weighted average of domain scores)
  const overallScore = Math.round(
    motorControl * 0.30 +
    writingFluency * 0.25 +
    spatialAwareness * 0.20 +
    consistency * 0.25
  );

  // Risk assessment with DSM-5 aligned criteria
  const flaggedConditions: string[] = [];
  let riskLevel: "low" | "moderate" | "high" = "low";

  if (motorControl < 50) {
    flaggedConditions.push("Fine Motor Control Deficit");
    riskLevel = "moderate";
  }
  if (microTremorCount > 8) {
    flaggedConditions.push("Micro-Tremor Pattern Detected");
    if (riskLevel === "moderate") riskLevel = "high";
    else riskLevel = "moderate";
  }
  if (writingFluency < 45) {
    flaggedConditions.push("Writing Fluency Difficulty");
    if (riskLevel !== "low") riskLevel = "high";
    else riskLevel = "moderate";
  }
  if (hesitationCount > 6) {
    flaggedConditions.push("Excessive Hesitations/Pauses");
    if (riskLevel === "low") riskLevel = "moderate";
  }
  if (spatialAwareness < 40) {
    flaggedConditions.push("Spatial Organization Difficulty");
    if (riskLevel === "low") riskLevel = "moderate";
  }
  if (consistency < 40) {
    flaggedConditions.push("Inconsistent Letter/Stroke Formation");
    if (riskLevel !== "high") riskLevel = "moderate";
  }
  if (strokePrecision < 35) {
    flaggedConditions.push("Poor Stroke Precision");
    if (riskLevel === "low") riskLevel = "moderate";
  }

  // Generate summary
  const summary = riskLevel === "low"
    ? `${studentName} demonstrated adequate writing motor skills with ${overallScore}% overall fluency. Stroke smoothness (${strokeSmoothness}%), speed consistency (${speedConsistency}%), and spatial organization (${spatialOrganization}%) are within expected range for Grade ${gradeNum}.`
    : riskLevel === "moderate"
    ? `${studentName} showed some difficulties in writing tasks (${overallScore}% fluency). ${flaggedConditions.slice(0, 2).join(" and ")} were noted. Motor control scored ${motorControl}% and writing fluency ${writingFluency}%. Additional fine motor practice is recommended.`
    : `${studentName} displayed significant challenges in writing (${overallScore}% fluency). Multiple indicators were flagged: ${flaggedConditions.join(", ")}. Motor control (${motorControl}%), fluency (${writingFluency}%), and spatial awareness (${spatialAwareness}%) suggest further evaluation by an occupational therapist is recommended.`;

  // Generate recommendations
  const recommendations: string[] = [];
  if (flaggedConditions.includes("Fine Motor Control Deficit")) {
    recommendations.push("Practice fine motor activities: clay modeling, bead threading, scissor cutting");
    recommendations.push("Use pencil grips or thicker writing instruments");
  }
  if (flaggedConditions.includes("Micro-Tremor Pattern Detected")) {
    recommendations.push("Consult an occupational therapist for motor assessment");
    recommendations.push("Practice tracing exercises on large paper before reducing size");
  }
  if (flaggedConditions.includes("Writing Fluency Difficulty")) {
    recommendations.push("Allow extra time for writing tasks");
    recommendations.push("Practice rhythmic writing exercises (loops, zigzags)");
  }
  if (flaggedConditions.includes("Excessive Hesitations/Pauses")) {
    recommendations.push("Build writing automaticity through daily short practice sessions");
    recommendations.push("Reduce cognitive load by separating spelling from writing practice");
  }
  if (flaggedConditions.includes("Spatial Organization Difficulty")) {
    recommendations.push("Use lined/graph paper to guide letter size and spacing");
    recommendations.push("Practice spatial awareness activities (puzzles, mazes)");
  }
  if (flaggedConditions.includes("Inconsistent Letter/Stroke Formation")) {
    recommendations.push("Practice letter formation with guided worksheets");
    recommendations.push("Use visual models for consistent sizing");
  }
  if (recommendations.length === 0) {
    recommendations.push("Continue regular writing practice", "Monitor progress over time");
  }

  return {
    overallScore,
    riskLevel,
    metrics,
    domainScores,
    flaggedConditions,
    summary,
    recommendations,
  };
}
