/**
 * Academic Year and Semester Management
 * 
 * Academic Year Structure:
 * - Year 2025-2026:
 *   - Semester 1: September 2025 - December 2025 (months 9-12)
 *   - Semester 2: January 2026 - May 2026 (months 1-5)
 *   - Summer: June 2026 - August 2026 (months 6-8)
 */

export type SemesterType = 'Semester 1' | 'Semester 2' | 'Summer';

export interface AcademicYearInfo {
    academicYear: string; // e.g., "2025-2026"
    semester: SemesterType;
}

/**
 * Get academic years for dropdown
 * Generates years from current year back to 5 years
 */
export const getAcademicYears = (): string[] => {
    const currentYear = new Date().getFullYear();
    const years: string[] = [];

    // Generate academic years: 2026-2027, 2025-2026, 2024-2025, etc.
    for (let i = currentYear; i >= currentYear - 5; i--) {
        years.push(`${i}-${i + 1}`);
    }

    return years;
};

/**
 * Get all semesters
 */
export const getSemesters = (): SemesterType[] => {
    return ['Semester 1', 'Semester 2', 'Summer'];
};

/**
 * Determine current academic year and semester based on current date
 * 
 * Logic:
 * - Month 9-12: Semester 1 of current academic year (e.g., Sep-Dec 2025 → 2025-2026, Semester 1)
 * - Month 1-5: Semester 2 of previous academic year (e.g., Jan-May 2026 → 2025-2026, Semester 2)
 * - Month 6-8: Summer of previous academic year (e.g., Jun-Aug 2026 → 2025-2026, Summer)
 */
export const getCurrentAcademicYearInfo = (): AcademicYearInfo => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11
    const currentYear = now.getFullYear();

    let academicStartYear: number;
    let semester: SemesterType;

    if (currentMonth >= 9) {
        // September - December: Semester 1
        academicStartYear = currentYear;
        semester = 'Semester 1';
    } else if (currentMonth >= 1 && currentMonth <= 5) {
        // January - May: Semester 2
        academicStartYear = currentYear - 1;
        semester = 'Semester 2';
    } else {
        // June - August: Summer
        academicStartYear = currentYear - 1;
        semester = 'Summer';
    }

    const academicYear = `${academicStartYear}-${academicStartYear + 1}`;

    return {
        academicYear,
        semester
    };
};

/**
 * Get semester details (start and end months)
 */
export const getSemesterDetails = (semester: SemesterType) => {
    switch (semester) {
        case 'Semester 1':
            return {
                name: 'Semester 1',
                startMonth: 9,
                endMonth: 12,
                monthRange: 'September - December'
            };
        case 'Semester 2':
            return {
                name: 'Semester 2',
                startMonth: 1,
                endMonth: 5,
                monthRange: 'January - May'
            };
        case 'Summer':
            return {
                name: 'Summer',
                startMonth: 6,
                endMonth: 8,
                monthRange: 'June - August'
            };
    }
};

/**
 * Validate if given date falls within the academic year and semester
 */
export const isDateInSemester = (
    date: Date,
    academicYear: string,
    semester: SemesterType
): boolean => {
    const [startYear] = academicYear.split('-').map(Number);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    switch (semester) {
        case 'Semester 1':
            return year === startYear && month >= 9 && month <= 12;
        case 'Semester 2':
            return year === startYear + 1 && month >= 1 && month <= 5;
        case 'Summer':
            return year === startYear + 1 && month >= 6 && month <= 8;
        default:
            return false;
    }
};
