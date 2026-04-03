import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { Download, Loader2, Upload } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { toast } from 'react-toastify';
import { Course } from '../../../model';
import { Breadcrumb } from '../../components/Breadcrumb';
import { ImportExcelModal, ImportStudentRow } from '../../components/ImportExcelModal';
import { SearchBar } from '../../components/SearchBar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Pagination } from '../../components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { getCourseDetails, getCourseStudentGrades, importCourseStudents } from '../../services/lecturer/courseService';

type StudentAssignmentGrade = {
    courseId: string;
    courseName: string;
    assignmentId: string;
    assignmentTitle: string;
    maxScore: number | null;
    submissionId: string | null;
    submittedAt: string | null;
    attemptCount: number | null;
    submissionFileUrl: string | null;
    gradeId: string | null;
    score: number | null;
    gradeStatus: string;
    feedback: string | null;
    gradedAt: string | null;
};

type StudentListItem = {
    id: string;
    studentId: string;
    name: string;
    email: string;
    assignments: StudentAssignmentGrade[];
};

const PAGE_SIZE = 20;

const toNullableNumber = (value: unknown): number | null => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
};

const toNullableString = (value: unknown): string | null => {
    if (typeof value === 'string' && value.trim()) {
        return value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }

    return null;
};

const getStudentAverage = (student: StudentListItem, courseId?: string) => {
    const relevantAssignments = student.assignments.filter((assignment) => {
        return !courseId || !assignment.courseId || String(assignment.courseId) === String(courseId);
    });

    const gradedAssignments = relevantAssignments.filter((assignment) => {
        return typeof assignment.score === 'number' && typeof assignment.maxScore === 'number' && assignment.maxScore > 0;
    });

    if (gradedAssignments.length === 0) {
        return null;
    }

    const totalScore = gradedAssignments.reduce((sum, assignment) => sum + (assignment.score ?? 0), 0);
    const totalMaxScore = gradedAssignments.reduce((sum, assignment) => sum + (assignment.maxScore ?? 0), 0);

    if (totalMaxScore <= 0) {
        return null;
    }

    return (totalScore / totalMaxScore) * 100;
};

const getLetterGrade = (average: number | null) => {
    if (average === null) {
        return '-';
    }

    if (average >= 90) {
        return 'A';
    }

    if (average >= 80) {
        return 'B';
    }

    if (average >= 70) {
        return 'C';
    }

    if (average >= 60) {
        return 'D';
    }

    return 'F';
};

const sanitizeFileName = (value: string) => value.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();

const sanitizeWorksheetName = (value: string) => sanitizeFileName(value).slice(0, 31) || 'Student Grades';

const formatExportDateTime = (value: Date) =>
    value.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

const parseCoursePayload = (payload: unknown): Course | null => {
    const root = (payload as Record<string, unknown>)?.data ?? payload;
    const rootRecord = (root as Record<string, unknown>) ?? {};

    const course =
        (rootRecord.course as Course | undefined) ??
        ((rootRecord.data as Record<string, unknown> | undefined)?.course as Course | undefined) ??
        (root as Course);

    return course?.course_id ? course : null;
};

const isImportSuccess = (payload: unknown): boolean => {
    if (!payload || typeof payload !== 'object') {
        return false;
    }

    const root = payload as Record<string, unknown>;
    const nested = root.data as Record<string, unknown> | undefined;

    if (typeof root.success === 'boolean') {
        return root.success;
    }

    if (typeof nested?.success === 'boolean') {
        return nested.success;
    }

    return false;
};

const parseStudentListPayload = (payload: unknown): StudentListItem[] => {
    const root = (payload as Record<string, unknown>) ?? {};
    const nested = (root.data as Record<string, unknown> | undefined) ?? {};

    const studentList =
        (root.students as unknown[] | undefined) ??
        (nested.students as unknown[] | undefined) ??
        (Array.isArray(payload) ? payload : []);

    if (!Array.isArray(studentList)) {
        return [];
    }

    return studentList
        .map((student) => {
            const item = (student as Record<string, unknown>) ?? {};
            const assignmentList = Array.isArray(item.assignments) ? item.assignments : [];

            const assignments = assignmentList
                .map((assignment) => {
                    const assignmentRecord = (assignment as Record<string, unknown>) ?? {};

                    const assignmentId = toNullableString(assignmentRecord.assignmentId ?? assignmentRecord.assignment_id);

                    return {
                        courseId: toNullableString(assignmentRecord.courseId ?? assignmentRecord.course_id) ?? '',
                        courseName: toNullableString(assignmentRecord.courseName ?? assignmentRecord.course_name) ?? '',
                        assignmentId: assignmentId ?? '',
                        assignmentTitle: toNullableString(assignmentRecord.assignmentTitle ?? assignmentRecord.assignment_title) ?? '',
                        maxScore: toNullableNumber(assignmentRecord.maxScore ?? assignmentRecord.max_score),
                        submissionId: toNullableString(assignmentRecord.submissionId ?? assignmentRecord.submission_id),
                        submittedAt: toNullableString(assignmentRecord.submittedAt ?? assignmentRecord.submitted_at),
                        attemptCount: toNullableNumber(assignmentRecord.attemptCount ?? assignmentRecord.attempt_count),
                        submissionFileUrl: toNullableString(assignmentRecord.submissionFileUrl ?? assignmentRecord.submission_file_url),
                        gradeId: toNullableString(assignmentRecord.gradeId ?? assignmentRecord.grade_id),
                        score: toNullableNumber(assignmentRecord.score),
                        gradeStatus: toNullableString(assignmentRecord.gradeStatus ?? assignmentRecord.grade_status) ?? '',
                        feedback: toNullableString(assignmentRecord.feedback),
                        gradedAt: toNullableString(assignmentRecord.gradedAt ?? assignmentRecord.graded_at),
                    } satisfies StudentAssignmentGrade;
                })
                .filter((assignment) => assignment.assignmentId && assignment.assignmentTitle);

            const userId = item.userId ?? item.user_id ?? item.studentId ?? item.student_id ?? item.id;
            const studentCode = item.userCode ?? item.user_code ?? item.studentCode ?? item.student_code ?? userId;
            const name = item.name;
            const email = item.email;

            return {
                id: String(userId ?? ''),
                studentId: String(studentCode ?? ''),
                name: String(name ?? ''),
                email: String(email ?? ''),
                assignments,
            } satisfies StudentListItem;
        })
        .filter((student) => student.id && student.studentId && student.name && student.email);
};

export function CourseStudentList() {
    const { course_id } = useParams();

    const [course, setCourse] = useState<Course | null>(null);
    const [students, setStudents] = useState<StudentListItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoadingCourse, setIsLoadingCourse] = useState(false);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isExportingTemplate, setIsExportingTemplate] = useState(false);

    const fetchStudentGrades = async (silent = false) => {
        if (!course_id) {
            setStudents([]);
            return;
        }

        if (!silent) {
            setIsLoadingStudents(true);
        }

        try {
            const response = await getCourseStudentGrades(course_id);
            const parsedStudents = parseStudentListPayload(response);
            setStudents(parsedStudents);
        } catch (error) {
            console.error('Error fetching student grades for course:', error);
            setStudents([]);
            if (!silent) {
                toast.error('Failed to load student grades.');
            }
        } finally {
            if (!silent) {
                setIsLoadingStudents(false);
            }
        }
    };

    useEffect(() => {
        if (!course_id) {
            return;
        }

        const fetchCourse = async () => {
            setIsLoadingCourse(true);
            try {
                const response = await getCourseDetails(course_id);
                const parsedCourse = parseCoursePayload(response);
                setCourse(parsedCourse);
            } catch (error) {
                console.error('Error fetching course details:', error);
                setCourse(null);
                toast.error('Failed to load course details.');
            } finally {
                setIsLoadingCourse(false);
            }
        };

        fetchCourse();
    }, [course_id]);

    useEffect(() => {
        if (!course_id) {
            return;
        }

        fetchStudentGrades();
    }, [course_id]);

    const filteredStudents = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        return students.filter((student) => {
            const matchesCourse = !course_id || student.assignments.length === 0 || student.assignments.some((assignment) => String(assignment.courseId) === String(course_id));

            if (!normalizedQuery) {
                return matchesCourse;
            }

            return matchesCourse && (
                student.name.toLowerCase().includes(normalizedQuery) ||
                student.studentId.toLowerCase().includes(normalizedQuery) ||
                student.email.toLowerCase().includes(normalizedQuery)
            );
        });
    }, [students, searchQuery, course_id]);

    const visibleAssignments = useMemo(() => {
        const assignmentMap = new Map<string, StudentAssignmentGrade>();

        students.forEach((student) => {
            student.assignments.forEach((assignment) => {
                if (course_id && assignment.courseId && String(assignment.courseId) !== String(course_id)) {
                    return;
                }

                if (!assignmentMap.has(assignment.assignmentId)) {
                    assignmentMap.set(assignment.assignmentId, assignment);
                }
            });
        });

        return Array.from(assignmentMap.values());
    }, [students, course_id]);

    const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const pagedStudents = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return filteredStudents.slice(startIndex, startIndex + PAGE_SIZE);
    }, [currentPage, filteredStudents]);

    const studentAverages = useMemo(() => {
        return new Map(
            students.map((student) => [student.id, getStudentAverage(student, course_id)])
        );
    }, [students, course_id]);

    const getAssignmentGradeForStudent = (student: StudentListItem, assignmentId: string) => {
        return student.assignments.find((item) => item.assignmentId === assignmentId && (!course_id || !item.courseId || String(item.courseId) === String(course_id))) ?? null;
    };

    const handleDownloadTemplate = async () => {
        if (isExportingTemplate) {
            return;
        }

        try {
            setIsExportingTemplate(true);

            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'SmartGrade';
            workbook.created = new Date();
            workbook.modified = new Date();

            const worksheet = workbook.addWorksheet(sanitizeWorksheetName(course?.course_code || course?.name || 'Student Grades'), {
                views: [{ state: 'frozen', ySplit: 9 }],
                properties: {
                    tabColor: { argb: 'FF1D4ED8' },
                },
            });

            const exportAssignments = visibleAssignments;
            const totalColumns = 5 + exportAssignments.length;
            const title = course?.name || 'Student Grade Report';
            const subtitle = 'Course grade export generated from SmartGrade';
            const exportDate = formatExportDateTime(new Date());
            const lecturerName = course?.lecturer?.name || '-';

            worksheet.mergeCells(1, 1, 1, totalColumns);
            worksheet.mergeCells(2, 1, 2, totalColumns);
            worksheet.getCell(1, 1).value = title;
            worksheet.getCell(2, 1).value = subtitle;

            worksheet.getCell(4, 1).value = 'Course Name';
            worksheet.getCell(4, 2).value = course?.name || '-';
            worksheet.getCell(4, 4).value = 'Course Code';
            worksheet.getCell(4, 5).value = course?.course_code || '-';

            worksheet.getCell(5, 1).value = 'Semester';
            worksheet.getCell(5, 2).value = course?.semester || '-';
            worksheet.getCell(5, 4).value = 'Academic Year';
            worksheet.getCell(5, 5).value = course?.academic_year || '-';

            worksheet.getCell(6, 1).value = 'Lecturer';
            worksheet.getCell(6, 2).value = lecturerName;
            worksheet.getCell(6, 4).value = 'Total Students';
            worksheet.getCell(6, 5).value = students.length;

            worksheet.getCell(7, 1).value = 'Total Assignments';
            worksheet.getCell(7, 2).value = exportAssignments.length;
            worksheet.getCell(7, 4).value = 'Exported At';
            worksheet.getCell(7, 5).value = exportDate;

            worksheet.getCell(9, 1).value = 'Student ID';
            worksheet.getCell(9, 2).value = 'Name';
            worksheet.getCell(9, 3).value = 'Email';
            worksheet.getCell(9, 4).value = 'Average';
            worksheet.getCell(9, 5).value = 'Grade';

            exportAssignments.forEach((assignment, index) => {
                worksheet.getCell(9, 6 + index).value = assignment.assignmentTitle;
            });

            const headerFill: ExcelJS.Fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1D4ED8' },
            };

            const titleFill: ExcelJS.Fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF0F172A' },
            };

            const metaLabelFill: ExcelJS.Fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF1F5F9' },
            };

            const metaValueFill: ExcelJS.Fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFFFFF' },
            };

            const titleRow = worksheet.getRow(1);
            titleRow.height = 26;
            titleRow.eachCell({ includeEmpty: true }, (cell) => {
                cell.fill = titleFill;
                cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 16 };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            const subtitleRow = worksheet.getRow(2);
            subtitleRow.height = 20;
            subtitleRow.eachCell({ includeEmpty: true }, (cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE2E8F0' },
                };
                cell.font = { italic: true, color: { argb: 'FF475569' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            [4, 5, 6, 7].forEach((rowNumber) => {
                const row = worksheet.getRow(rowNumber);
                row.height = 20;
                [1, 4].forEach((labelColumn) => {
                    const labelCell = row.getCell(labelColumn);
                    labelCell.fill = metaLabelFill;
                    labelCell.font = { bold: true, color: { argb: 'FF334155' } };
                    labelCell.alignment = { horizontal: 'left', vertical: 'middle' };
                    labelCell.border = {
                        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    };
                });

                [2, 5].forEach((valueColumn) => {
                    const valueCell = row.getCell(valueColumn);
                    valueCell.fill = metaValueFill;
                    valueCell.font = { color: { argb: 'FF0F172A' } };
                    valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
                    valueCell.border = {
                        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    };
                });
            });

            const headerRow = worksheet.getRow(9);
            headerRow.height = 22;
            headerRow.eachCell({ includeEmpty: true }, (cell) => {
                cell.fill = headerFill;
                cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF1E3A8A' } },
                    left: { style: 'thin', color: { argb: 'FF1E3A8A' } },
                    bottom: { style: 'thin', color: { argb: 'FF1E3A8A' } },
                    right: { style: 'thin', color: { argb: 'FF1E3A8A' } },
                };
            });

            const baseColumnWidths = [18, 24, 30, 12, 12];
            baseColumnWidths.forEach((width, index) => {
                worksheet.getColumn(index + 1).width = width;
            });

            exportAssignments.forEach((assignment, index) => {
                worksheet.getColumn(6 + index).width = Math.max(18, Math.min(30, assignment.assignmentTitle.length + 4));
            });

            students.forEach((student, studentIndex) => {
                const average = getStudentAverage(student, course_id);
                const rowValues = [
                    student.studentId,
                    student.name,
                    student.email,
                    average === null ? '-' : `${average.toFixed(1)}%`,
                    getLetterGrade(average),
                    ...exportAssignments.map((assignment) => {
                        const studentAssignment = getAssignmentGradeForStudent(student, assignment.assignmentId);

                        if (typeof studentAssignment?.score === 'number') {
                            return typeof studentAssignment.maxScore === 'number'
                                ? `${studentAssignment.score}/${studentAssignment.maxScore}`
                                : `${studentAssignment.score}`;
                        }

                        return studentAssignment?.submissionFileUrl ? 'Pending' : '-';
                    }),
                ];

                const row = worksheet.addRow(rowValues);
                row.height = 20;
                const rowFill: ExcelJS.Fill = studentIndex % 2 === 0
                    ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
                    : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };

                row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
                    cell.fill = rowFill;
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    };
                    cell.alignment = {
                        horizontal: columnNumber <= 3 ? 'left' : 'center',
                        vertical: 'middle',
                        wrapText: true,
                    };

                    if (columnNumber === 4 && typeof average === 'number') {
                        cell.font = { bold: true, color: { argb: 'FF15803D' } };
                    }

                    if (columnNumber === 5) {
                        cell.font = { bold: true, color: { argb: 'FF334155' } };
                    }
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });

            const downloadUrl = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = downloadUrl;
            anchor.download = `${sanitizeFileName(course?.course_code || course?.name || 'student-grades')}_template.xlsx`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.URL.revokeObjectURL(downloadUrl);

            toast.success('Excel template downloaded successfully.');
        } catch (error) {
            console.error('Error generating Excel template:', error);
            toast.error('Failed to generate Excel template.');
        } finally {
            setIsExportingTemplate(false);
        }
    };

    const handleImportStudents = async ({ file, rows }: { file: File; rows: ImportStudentRow[] }) => {
        if (!course_id) {
            toast.error('Course is not selected.');
            throw new Error('Missing course id');
        }

        try {
            const importResult = await importCourseStudents(course_id, file);

            if (!isImportSuccess(importResult)) {
                throw new Error('Import API returned unsuccessful status.');
            }

            await fetchStudentGrades(true);
            setCurrentPage(1);
            toast.success(`Imported ${rows.length} students successfully.`);
        } catch (error) {
            console.error('Import students failed:', error);
            toast.error('Import failed. Please check data and try again.');
            throw error;
        }
    };

    const breadcrumbItems = [
        { label: 'Courses', href: '/lecturer/courses' },
        { label: course?.name || 'Course', href: course ? `/lecturer/courses/${course.course_id}/assignments` : '#' },
        { label: 'Student List' },
    ];

    return (
        <div className="space-y-6">
            <Breadcrumb items={breadcrumbItems} />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2>Student List</h2>
                    <p className="text-sm text-gray-600">
                        {course?.course_code}
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleDownloadTemplate} disabled={isExportingTemplate}>
                        <Download className="h-4 w-4 mr-2" />
                        {isExportingTemplate ? 'Preparing...' : 'Template'}
                    </Button>
                    <Button onClick={() => setIsImportOpen(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Import Students
                    </Button>
                </div>
            </div>

            <ImportExcelModal open={isImportOpen} onOpenChange={setIsImportOpen} onImport={handleImportStudents} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Total Students</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl">{students.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Total Assignment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl text-blue-600">{visibleAssignments.length}</div>
                    </CardContent>
                </Card>
            </div>

            <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search students by name, ID, or email..."
                className="max-w-md"
            />

            <Card>
                <CardHeader>
                    <CardTitle>Student List</CardTitle>
                    <CardDescription>
                        {isLoadingCourse
                            ? 'Loading course information...'
                            : isLoadingStudents
                                ? 'Loading students...'
                                : 'Loaded student grades for this course'}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="overflow-x-auto pb-2">
                        <Table style={{ minWidth: '1400px' }}>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-48">Student ID</TableHead>
                                    <TableHead className="w-64">Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="text-center w-28">Average</TableHead>
                                    <TableHead className="text-center w-28">Grade</TableHead>
                                    {visibleAssignments.map((assignment) => (
                                        <TableHead key={assignment.assignmentId} className="text-center min-w-35">
                                            {assignment.assignmentTitle}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingStudents ? (
                                    <TableRow>
                                        <TableCell colSpan={5 + visibleAssignments.length} className="py-8">
                                            <div className="flex items-center justify-center gap-2 text-gray-500">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Loading student list...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : pagedStudents.length > 0 ? (
                                    pagedStudents.map((student) => (
                                        <TableRow key={student.id}>
                                            <TableCell className="text-gray-600">{student.studentId}</TableCell>
                                            <TableCell>{student.name}</TableCell>
                                            <TableCell className="text-gray-600 text-sm">{student.email}</TableCell>
                                            <TableCell className="text-center">
                                                {typeof studentAverages.get(student.id) === 'number' ? (
                                                    <span className="font-medium text-green-700">
                                                        {studentAverages.get(student.id)!.toFixed(1)}%
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {getLetterGrade(studentAverages.get(student.id) ?? null)}
                                            </TableCell>
                                            {visibleAssignments.map((assignment) => {
                                                const studentAssignment = getAssignmentGradeForStudent(student, assignment.assignmentId);
                                                return (
                                                    <TableCell key={assignment.assignmentId} className="text-center">
                                                        {typeof studentAssignment?.score === 'number' ? (
                                                            <span className="font-medium">
                                                                {studentAssignment.score}
                                                                {typeof studentAssignment.maxScore === 'number' ? `/${studentAssignment.maxScore}` : ''}
                                                            </span>
                                                        ) : studentAssignment?.submissionFileUrl ? (
                                                            <span className="text-amber-600">Pending</span>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5 + visibleAssignments.length} className="text-center text-gray-500 py-8">
                                            {searchQuery.trim()
                                                ? `No students found matching "${searchQuery}".`
                                                : 'No student data yet. Please import the list to get started.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </CardContent>
            </Card>
        </div>
    );
}
