import { ProcessedComment } from "@prisma/client";

export interface ComplexityBreakdown {
  baseCategoryScore: number;
  stacktraceScore: number;
  fileCountScore: number;
  keywordScore: number;
}

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
  maxKeywordPenalty: number;
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
  maxKeywordPenalty: 15,
  keywords: {
    "syntaxerror": 1,
    "type mismatch": 2,
    "memory leak": 10,
    "not found": 0.5,
    "undefined": 0.5,
    "null pointer": 4,
    "segmentation fault": 10,
    "timeout": 3,
    "dependency": 4
  }
};

export function calculateComplexity(
  comments: ProcessedComment[],
  customWeightsJson?: string | null
): { score: number; label: "EASY" | "MEDIUM" | "HARD" | "CRITICAL"; breakdown: ComplexityBreakdown } {
  let weights = defaultWeights;
  if (customWeightsJson) {
    try {
      const custom = JSON.parse(customWeightsJson);
      if (custom && typeof custom === 'object' && !Array.isArray(custom)) {
        // Deep validate numeric fields
        for (const key of Object.keys(defaultWeights)) {
          if (key !== 'keywords' && custom[key] !== undefined) {
             if (typeof custom[key] === 'number' && Number.isFinite(custom[key])) {
                weights[key as keyof ComplexityWeights] = custom[key] as never;
             } else {
                console.warn(`complexityWeights field '${key}' is not a finite number, using default.`);
             }
          }
        }

        if (custom.keywords && typeof custom.keywords === 'object' && !Array.isArray(custom.keywords)) {
            for (const [kw, val] of Object.entries(custom.keywords)) {
               if (typeof val === 'number' && Number.isFinite(val)) {
                   weights.keywords[kw] = val;
               } else {
                   console.warn(`complexityWeights.keywords field '${kw}' is not a finite number, using default if it exists.`);
               }
            }
        } else if (custom.keywords !== undefined) {
             console.warn("complexityWeights.keywords must be an object, using defaults.");
        }

      } else {
        console.warn("complexityWeights JSON must be an object, falling back to default");
      }
    } catch (e) {
      console.warn("Invalid complexityWeights JSON, falling back to default", e);
    }
  }

  let totalScore = 0;
  let breakdown: ComplexityBreakdown = { baseCategoryScore: 0, stacktraceScore: 0, fileCountScore: 0, keywordScore: 0 };
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
    const bodyLines = comment.body.split('\n');
    let kwScoreForComment = 0;

    for (const line of bodyLines) {
      const lowerLine = line.toLowerCase();
      // Only match keywords on lines that look like errors/exceptions
      if (lowerLine.includes('error') || lowerLine.includes('exception') || lowerLine.includes('traceback') || lowerLine.includes('warning') || lowerLine.includes('fail')) {
        for (const [kw, score] of Object.entries(weights.keywords)) {
          if (lowerLine.includes(kw.toLowerCase())) {
             kwScoreForComment += score;
          }
        }
      }
    }
    breakdown.keywordScore += kwScoreForComment;

    // Simple file detection heuristic (e.g., path/to/file.ts)
    // Require either a directory separator or a known source-file extension
    const fileMatches = comment.body.match(
      /\b[a-zA-Z0-9_\-./]*\/[a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]{1,6}\b|\b[a-zA-Z0-9_\-.]+\.(?:ts|tsx|js|jsx|py|go|rs|java|rb|php|cs|cpp|c|h|hpp|md|json|yml|yaml|sql|sh)\b/g
    );
    if (fileMatches) {
        fileMatches.forEach(f => uniqueFiles.add(f));
    }
  }

  // Cap keyword score
  if (breakdown.keywordScore > weights.maxKeywordPenalty) {
    breakdown.keywordScore = weights.maxKeywordPenalty;
  }
  totalScore += breakdown.keywordScore;

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
