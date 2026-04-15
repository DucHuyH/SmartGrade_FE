/**
 * Grading System - Defines grade scales and utilities
 * Scale (10-point): A+ (95-100), A (85-94), A- (80-84), B+ (75-79), B (70-74), B- (65-69), C+ (60-64), C (55-59), C- (45-54), D (40-44), F (0-39)
 */

export type GradeLetter = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';

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
        minPercentage: 85,
        maxPercentage: 94,
        description: 'Excellent',
    },
    'A-': {
        letter: 'A-',
        color: 'teal-600',
        bgColor: 'bg-teal-100',
        textColor: 'text-teal-700',
        hexColor: '#14B8A6',
        minPercentage: 80,
        maxPercentage: 84,
        description: 'Very Good',
    },
    'B+': {
        letter: 'B+',
        color: 'blue-600',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        hexColor: '#2563EB',
        minPercentage: 75,
        maxPercentage: 79,
        description: 'Good',
    },
    'B': {
        letter: 'B',
        color: 'blue-600',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        hexColor: '#3B82F6',
        minPercentage: 70,
        maxPercentage: 74,
        description: 'Good',
    },
    'B-': {
        letter: 'B-',
        color: 'sky-600',
        bgColor: 'bg-sky-100',
        textColor: 'text-sky-700',
        hexColor: '#0284C7',
        minPercentage: 65,
        maxPercentage: 69,
        description: 'Satisfactory',
    },
    'C+': {
        letter: 'C+',
        color: 'amber-600',
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-700',
        hexColor: '#D97706',
        minPercentage: 60,
        maxPercentage: 64,
        description: 'Average',
    },
    'C': {
        letter: 'C',
        color: 'amber-600',
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-700',
        hexColor: '#F59E0B',
        minPercentage: 55,
        maxPercentage: 59,
        description: 'Average',
    },
    'C-': {
        letter: 'C-',
        color: 'orange-600',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-700',
        hexColor: '#EA580C',
        minPercentage: 45,
        maxPercentage: 54,
        description: 'Below Average',
    },
    'D': {
        letter: 'D',
        color: 'red-600',
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
        hexColor: '#DC2626',
        minPercentage: 40,
        maxPercentage: 44,
        description: 'Poor',
    },
    'F': {
        letter: 'F',
        color: 'red-700',
        bgColor: 'bg-red-200',
        textColor: 'text-red-800',
        hexColor: '#7F1D1D',
        minPercentage: 0,
        maxPercentage: 39,
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
    if (percentage >= 85) return 'A';
    if (percentage >= 80) return 'A-';
    if (percentage >= 75) return 'B+';
    if (percentage >= 70) return 'B';
    if (percentage >= 65) return 'B-';
    if (percentage >= 60) return 'C+';
    if (percentage >= 55) return 'C';
    if (percentage >= 45) return 'C-';
    if (percentage >= 40) return 'D';
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
 * Check if grade is passing (C- or above)
 */
export const isPassing = (gradeLetter: GradeLetter): boolean => {
    const passingGrades: GradeLetter[] = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-'];
    return passingGrades.includes(gradeLetter);
};

/**
 * Get all grade letters in order
 */
export const getAllGradeLetters = (): GradeLetter[] => {
    return ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];
};

/**
 * Get grade color hex value
 */
export const getGradeColor = (score: number | null, maxScore: number | null): string => {
    const gradeInfo = getGradeInfoFromScore(score, maxScore);
    return gradeInfo.hexColor;
};
