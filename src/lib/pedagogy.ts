// src/lib/pedagogy.ts

/**
 * Counts syllables in a single word using heuristic vowel cluster analysis.
 */
export function countSyllablesInWord(word: string): number {
    const w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (w.length <= 3) return 1;

    // Remove silent 'e' at the end
    let cleanWord = w;
    if (w.endsWith('e')) {
        cleanWord = w.substring(0, w.length - 1);
    }

    // Count vowel runs
    const vowelRuns = cleanWord.match(/[aeiouy]+/g);
    let count = vowelRuns ? vowelRuns.length : 0;

    // Adjust for common silent endings or edge cases
    if (w.endsWith('es') || w.endsWith('ed')) {
        // e.g. "passed" (1), "classes" (2)
        // If it was just 1 syllable, don't drop to 0
        if (count > 1 && !w.endsWith('le')) {
            count--;
        }
    }

    return count || 1;
}

/**
 * Calculates readability scores for a given text.
 */
export function calculateReadability(text: string) {
    if (!text || text.trim().length === 0) {
        return {
            wordCount: 0,
            sentenceCount: 0,
            syllableCount: 0,
            readabilityScore: 100, // Easiest
            gradeLevel: 4,         // Base elementary grade
            complexityScore: 10,
        };
    }

    // Standardize whitespace
    const cleanText = text.trim();

    // Split sentences: match period, exclamation, question mark followed by space or end
    const sentences = cleanText.split(/[.!?]+(?:[ \s]|$)/).filter(s => s.trim().length > 0);
    const sentenceCount = Math.max(1, sentences.length);

    // Split words: match alphabet sequences
    const words = cleanText.split(/[\s,;:\(\)\[\]"'\-]+/).filter(w => /[a-zA-Z]/.test(w));
    const wordCount = Math.max(1, words.length);

    // Count total syllables
    let totalSyllables = 0;
    for (const word of words) {
        totalSyllables += countSyllablesInWord(word);
    }
    const syllableCount = Math.max(1, totalSyllables);

    // Flesch Reading Ease Score formula:
    // 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
    const wordsPerSentence = wordCount / sentenceCount;
    const syllablesPerWord = syllableCount / wordCount;

    let easeScore = 206.835 - (1.015 * wordsPerSentence) - (84.6 * syllablesPerWord);
    easeScore = Math.max(0, Math.min(100, Math.round(easeScore)));

    // Flesch-Kincaid Grade Level formula:
    // 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
    let gradeLevel = (0.39 * wordsPerSentence) + (11.8 * syllablesPerWord) - 15.59;
    gradeLevel = Math.max(1, Math.min(20, Math.round(gradeLevel))); // Clamp between grade 1 and 20

    // Complexity score normalized from 0 to 100
    // Higher grade levels map to higher complexity scores
    let complexityScore = Math.max(5, Math.min(95, Math.round(gradeLevel * 5 + (100 - easeScore) / 2)));

    return {
        wordCount,
        sentenceCount,
        syllableCount,
        readabilityScore: easeScore,
        gradeLevel,
        complexityScore,
    };
}

/**
 * Evaluates whether an explanation's readability level drifts from the classroom target.
 */
export function checkPedagogicalDrift(text: string, targetGradeLevel: number) {
    const metrics = calculateReadability(text);
    const actualGrade = metrics.gradeLevel;

    const dev = actualGrade - targetGradeLevel;
    let pedagogyDrifted = false;
    let driftExplanation = "Aligned: Explanation meets target pedagogical standard.";

    if (dev > 2) {
        pedagogyDrifted = true;
        driftExplanation = `Too Complex: Explanation is at grade ${actualGrade} (exceeds classroom target grade ${targetGradeLevel} by ${dev.toFixed(0)} levels).`;
    } else if (dev < -4) {
        pedagogyDrifted = true;
        driftExplanation = `Too Simple: Explanation is at grade ${actualGrade} (below classroom target grade ${targetGradeLevel} by ${Math.abs(dev).toFixed(0)} levels).`;
    }

    return {
        ...metrics,
        pedagogyDrifted,
        driftExplanation,
    };
}
