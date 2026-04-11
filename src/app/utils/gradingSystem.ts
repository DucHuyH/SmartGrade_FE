/**
 * Grading System - Defines grade scales and utilities
 * Scale: A+ (95-100), A (90-94), A- (87-89), B+ (84-86), B (80-83), B- (77-79), C+ (74-76), C (70-73), D (60-69), F (<60)
 */

export type GradeLetter = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'D' | 'F';

export interface GradeInfo {
    letter: GradeLetter;
    color: string; // Tailwind color class
    bgColor: string; // Background Tailwind color class
    textColor: string; // Text Tailwind color class
    hexColor: string; // Hex color code
    minPercentage: number;
    maxPercentage: number;
    description: string;
}

const GRADE_SCALE: Record<GradeLetter, GradeInfo> = {
    'A+': {
        letter: 'A+',
        color: 'emerald-600',
        bgColor: 'bg-emerald-100',
        textColor: 'text-emerald-700',
        hexColor: '#059669',
        minPercentage: 95,
        maxPercentage: 100,
        description: 'Excellent',
    },
    'A': {
        letter: 'A',
        color: 'emerald-600',
        bgColor: 'bg-emerald-100',
        textColor: 'text-emerald-700',
        hexColor: '#10B981',
        minPercentage: 90,
        maxPercentage: 94,
        description: 'Excellent',
    },
    'A-': {
        letter: 'A-',
        color: 'teal-600',
        bgColor: 'bg-teal-100',
        textColor: 'text-teal-700',
        hexColor: '#14B8A6',
        minPercentage: 87,
        maxPercentage: 89,
        description: 'Very Good',
    },
    'B+': {
        letter: 'B+',
        color: 'blue-600',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        hexColor: '#2563EB',
        minPercentage: 84,
        maxPercentage: 86,
        description: 'Good',
    },
    'B': {
        letter: 'B',
        color: 'blue-600',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        hexColor: '#3B82F6',
        minPercentage: 80,
        maxPercentage: 83,
        description: 'Good',
    },
    'B-': {
        letter: 'B-',
        color: 'sky-600',
        bgColor: 'bg-sky-100',
        textColor: 'text-sky-700',
        hexColor: '#0284C7',
        minPercentage: 77,
        maxPercentage: 79,
        description: 'Satisfactory',
    },
    'C+': {
        letter: 'C+',
        color: 'amber-600',
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-700',
        hexColor: '#D97706',
        minPercentage: 74,
        maxPercentage: 76,
        description: 'Average',
    },
    'C': {
        letter: 'C',
        color: 'amber-600',
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-700',
        hexColor: '#F59E0B',
        minPercentage: 70,
        maxPercentage: 73,
        description: 'Average',
    },
    'D': {
        letter: 'D',
        color: 'orange-600',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-700',
        hexColor: '#F97316',
        minPercentage: 60,
        maxPercentage: 69,
        description: 'Below Average',
    },
    'F': {
        letter: 'F',
        color: 'red-600',
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
        hexColor: '#EF4444',
        minPercentage: 0,
        maxPercentage: 59,
        description: 'Fail',
    },
};

/**
 * Get grade letter based on percentage or score
 */
export const getGradeLetter = (score: number | null, maxScore: number | null): GradeLetter => {
    if (score === null || maxScore === null || maxScore === 0) {
        return 'F';
    }

    const percentage = (score / maxScore) * 100;

    if (percentage >= 95) return 'A+';
    if (percentage >= 90) return 'A';
    if (percentage >= 87) return 'A-';
    if (percentage >= 84) return 'B+';
    if (percentage >= 80) return 'B';
    if (percentage >= 77) return 'B-';
    if (percentage >= 74) return 'C+';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
};

/**
 * Get grade info object based on grade letter
 */
export const getGradeInfo = (gradeLetter: GradeLetter): GradeInfo => {
    return GRADE_SCALE[gradeLetter];
};

/**
 * Get grade info based on score and max score
 */
export const getGradeInfoFromScore = (score: number | null, maxScore: number | null): GradeInfo => {
    const gradeLetter = getGradeLetter(score, maxScore);
    return GRADE_SCALE[gradeLetter];
};

/**
 * Calculate percentage from score and max score
 */
export const calculatePercentage = (score: number | null, maxScore: number | null): number => {
    if (score === null || maxScore === null || maxScore === 0) {
        return 0;
    }
    return (score / maxScore) * 100;
};

/**
 * Check if grade is passing (C or above)
 */
export const isPassing = (gradeLetter: GradeLetter): boolean => {
    const passingGrades: GradeLetter[] = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C'];
    return passingGrades.includes(gradeLetter);
};

/**
 * Get all grade letters in order
 */
export const getAllGradeLetters = (): GradeLetter[] => {
    return ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'];
};

/**
 * Get grade color hex value
 */
export const getGradeColor = (score: number | null, maxScore: number | null): string => {
    const gradeInfo = getGradeInfoFromScore(score, maxScore);
    return gradeInfo.hexColor;
};
