import { ProcessedComment } from "@prisma/client";

export interface ComplexityWeights {
  linting: number;
  typeError: number;
  security: number;
  testFailure: number;
  unknown: number;
  stacktraceLinePenalty: number;
  maxStacktracePenalty: number;
  fileCountPenalty: number;
  maxFileCountPenalty: number;
  keywords: Record<string, number>;
}

export const defaultWeights: ComplexityWeights = {
  linting: 1,
  typeError: 3,
  security: 8,
  testFailure: 5,
  unknown: 2,
  stacktraceLinePenalty: 0.5,
  maxStacktracePenalty: 5,
  fileCountPenalty: 1,
  maxFileCountPenalty: 10,
  keywords: {
    "syntaxerror": 1,
    "type mismatch": 2,
    "memory leak": 10,
    "not found": 1,
    "undefined": 1,
    "null pointer": 4,
    "segmentation fault": 10,
    "timeout": 3,
    "dependency": 4
  }
};

export function calculateComplexity(
  comments: ProcessedComment[],
  customWeightsJson?: string | null
): { score: number; label: "EASY" | "MEDIUM" | "HARD" | "CRITICAL"; breakdown: any } {
  let weights = defaultWeights;
  if (customWeightsJson) {
    try {
      const custom = JSON.parse(customWeightsJson);
      weights = { ...defaultWeights, ...custom, keywords: { ...defaultWeights.keywords, ...(custom.keywords || {}) } };
    } catch (e) {
      console.warn("Invalid complexityWeights JSON, falling back to default", e);
    }
  }

  let totalScore = 0;
  let breakdown: any = { baseCategoryScore: 0, stacktraceScore: 0, fileCountScore: 0, keywordScore: 0 };
  const uniqueFiles = new Set<string>();

  for (const comment of comments) {
    // 1. Base category score
    switch (comment.category) {
      case "lint":
        breakdown.baseCategoryScore += weights.linting;
        totalScore += weights.linting;
        break;
      case "type_error":
        breakdown.baseCategoryScore += weights.typeError;
        totalScore += weights.typeError;
        break;
      case "security":
        breakdown.baseCategoryScore += weights.security;
        totalScore += weights.security;
        break;
      case "test_failure":
        breakdown.baseCategoryScore += weights.testFailure;
        totalScore += weights.testFailure;
        break;
      default:
        breakdown.baseCategoryScore += weights.unknown;
        totalScore += weights.unknown;
        break;
    }

    // 2. Stacktrace length
    const lines = comment.body.split('\n').length;
    let stackPenalty = lines * weights.stacktraceLinePenalty;
    if (stackPenalty > weights.maxStacktracePenalty) stackPenalty = weights.maxStacktracePenalty;
    breakdown.stacktraceScore += stackPenalty;
    totalScore += stackPenalty;

    // 3. Keywords
    const lowerBody = comment.body.toLowerCase();
    for (const [kw, score] of Object.entries(weights.keywords)) {
      if (lowerBody.includes(kw.toLowerCase())) {
        breakdown.keywordScore += score;
        totalScore += score;
      }
    }

    // Simple file detection heuristic (e.g., path/to/file.ts)
    const fileMatches = comment.body.match(/[a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+/g);
    if (fileMatches) {
        fileMatches.forEach(f => uniqueFiles.add(f));
    }
  }

  // 4. File count penalty
  let filePenalty = uniqueFiles.size * weights.fileCountPenalty;
  if (filePenalty > weights.maxFileCountPenalty) filePenalty = weights.maxFileCountPenalty;
  breakdown.fileCountScore = filePenalty;
  totalScore += filePenalty;


  let label: "EASY" | "MEDIUM" | "HARD" | "CRITICAL" = "EASY";
  if (totalScore >= 20) label = "CRITICAL";
  else if (totalScore >= 10) label = "HARD";
  else if (totalScore >= 5) label = "MEDIUM";

  return { score: Math.round(totalScore * 10) / 10, label, breakdown };
}
