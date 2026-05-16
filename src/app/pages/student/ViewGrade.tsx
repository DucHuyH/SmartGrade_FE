import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Breadcrumb } from '../../components/Breadcrumb';
import { Progress } from '../../components/ui/progress';
import { FeedbackRenderer } from '../../components/FeedbackRenderer';
import { Calendar, FileText, Loader2, Download, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { getSubmissionGrade, StudentSubmissionGradesDetail, StudentGradeCriterion } from '../../services/student/assignmentService';
import { getAssignmentDetails } from '../../services/student/assignmentService';
import { getGradeInfoFromScore, calculatePercentage } from '../../utils/gradingSystem';
import { Assignment } from '../../../model/assignment';
import { Rubric, Criteria } from '../../../model/rubric';

const formatDate = (value?: string | null) => {
    if (!value) {
        return 'N/A';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const downloadFile = (fileUrl: string | undefined, fileName: string) => {
    if (!fileUrl) {
        toast.error('File URL is not available');
        return;
    }

    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const getFileNameFromUrl = (url: string): string => {
    try {
        const urlObj = new URL(url);
        const fileName = urlObj.pathname.split('/').pop();
        return fileName || 'submission-file';
    } catch {
        return 'submission-file';
    }
};

/**
 * Enrich criteria scores with correct criteria_name and max_score from rubric
 */
const enrichCriteriaScoresWithRubric = (
    criteriaScores: StudentGradeCriterion[],
    rubric: Rubric | undefined | null
): StudentGradeCriterion[] => {
    if (!rubric?.criteria || rubric.criteria.length === 0) {
        return criteriaScores;
    }

    return criteriaScores.map((score) => {
        // Try to find matching rubric criteria by id
        const rubricCriteria = rubric.criteria.find(
            (c) => String(c.criteria_id) === String(score.criteria_id)
        );

        if (rubricCriteria) {
            return {
                ...score,
                criteria_name: rubricCriteria.criteria_name,
                max_score: rubricCriteria.max_score,
            };
        }

        return score;
    });
};

export function ViewGrade() {
    const { submission_id } = useParams();
    const location = useLocation();
    const navState = (location.state as { courseName?: string; courseCode?: string; course_id?: string; assignmentTitle?: string; maxScore?: number; assignmentId?: string } | null) ?? null;
    const [grade, setGrade] = useState<StudentSubmissionGradesDetail | null>(null);
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchGradeDetails = async () => {
            if (!submission_id) {
                toast.error('Submission ID is missing');
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const gradeData = await getSubmissionGrade(submission_id);
                setGrade(gradeData);

                console.log('Fetched grade details:', gradeData);


                // Determine assignment_id - prefer from navState, fallback to gradeData
                const assignmentId = navState?.assignmentId ?? gradeData.assignment_id;

                if (assignmentId) {
                    console.log('Fetching assignment details for assignment_id:', assignmentId);
                    try {
                        const assignmentData = await getAssignmentDetails(assignmentId);
                        console.log('Assignment data with rubric:', assignmentData);
                        console.log('Rubric criteria:', assignmentData.rubric?.criteria);
                        setAssignment(assignmentData);
                    } catch (error) {
                        console.error('Error fetching assignment details:', error);
                    }
                }
            } catch (error) {
                console.error('Error fetching grade details:', error);
                toast.error('Failed to load grade details');
            } finally {
                setIsLoading(false);
            }
        };

        fetchGradeDetails();
    }, [submission_id, navState?.assignmentId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-lg font-semibold text-gray-700">Loading grade details...</p>
                </div>
            </div>
        );
    }

    if (!grade) {
        return (
            <div className="space-y-6">
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-semibold text-red-900">Grade Not Available</p>
                        <p className="text-sm text-red-700">No grade information could be loaded for this submission.</p>
                    </div>
                </div>
            </div>
        );
    }

    const scorePercentage = calculatePercentage(grade.final_score, navState?.maxScore ?? grade.max_score);
    const gradeInfo = getGradeInfoFromScore(grade.final_score, navState?.maxScore ?? grade.max_score);
    const displayMaxScore = navState?.maxScore ?? grade.max_score;

    const courseId = assignment?.course_id ?? navState?.course_id;
    const courseName = assignment?.course_name ?? navState?.courseName ?? 'Course';
    const assignmentTitle = assignment?.title ?? navState?.assignmentTitle ?? 'Grade';

    const breadcrumbItems = [
        { label: 'My Courses', href: '/student/courses' },
        { label: courseName },
        { label: 'Assignments', href: courseId ? `/student/courses/${courseId}/assignments` : '#' },
        { label: assignmentTitle },
    ];

    return (
        <div className="space-y-6">
            <Breadcrumb items={breadcrumbItems} />

            <div>
                <h1 className="text-3xl font-bold">{assignmentTitle}</h1>
                <p className="text-sm text-gray-600 mt-1">{courseName}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Score Summary */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Score Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col items-center justify-center gap-4">
                                <div className="text-5xl font-semibold" style={{ color: gradeInfo.hexColor }}>
                                    {grade.final_score !== null ? grade.final_score : 'N/A'}
                                </div>
                                <p className="text-lg text-gray-600">
                                    out of {displayMaxScore !== null ? displayMaxScore : 'N/A'}
                                </p>
                                <div className={`text-2xl font-semibold ${gradeInfo.bgColor} ${gradeInfo.textColor} px-8 py-3 rounded-lg shadow-md`}>
                                    Grade: {gradeInfo.letter}
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                                {displayMaxScore && displayMaxScore > 0 ? (
                                    <>
                                        <div
                                            style={{
                                                '--progress-color': gradeInfo.hexColor,
                                            } as React.CSSProperties & { '--progress-color': string }}
                                        >
                                            <style>{`
                                                [style*="--progress-color"] [data-slot="progress-indicator"] {
                                                    background-color: var(--progress-color) !important;
                                                }
                                            `}</style>
                                            <Progress
                                                value={Math.min(scorePercentage, 100)}
                                                className="h-4"
                                                style={{
                                                    background: '#F3F4F6',
                                                }}
                                            />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm font-light text-gray-500">{scorePercentage.toFixed(1)}%</p>
                                            <p className={`text-sm font-light ${gradeInfo.textColor}`}>{gradeInfo.description}</p>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-center text-gray-500 text-sm">Progress unavailable</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detailed Scores */}
                    {grade.criteria_scores && grade.criteria_scores.length > 0 && assignment?.rubric && (
                        (() => {
                            // Enrich criteria scores with rubric data (criteria_name and max_score)
                            const enrichedCriteriaScores = enrichCriteriaScoresWithRubric(grade.criteria_scores, assignment.rubric);

                            return (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Detailed Scores</CardTitle>
                                        <CardDescription>Breakdown by grading criteria</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-0">
                                        {enrichedCriteriaScores.map((criterion: StudentGradeCriterion, index: number) => {
                                            const criteriaPercentage = criterion.max_score > 0
                                                ? (criterion.score / criterion.max_score) * 100
                                                : 0;

                                            return (
                                                <div key={criterion.criteria_id || index} className="space-y-3 py-6 border-b last:border-b-0">
                                                    {/* Criteria Header */}
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="text-base font-semibold text-gray-900">
                                                            {criterion.criteria_name}
                                                        </h3>
                                                        <div className="text-right">
                                                            <span className="text-sm text-gray-900">
                                                                {criterion.score}
                                                            </span>
                                                            <span className="text-sm text-gray-500"> / {criterion.max_score}</span>
                                                        </div>
                                                    </div>

                                                    {/* Progress Bar */}
                                                    <div>
                                                        <Progress
                                                            value={Math.min(criteriaPercentage, 100)}
                                                            className="h-1.5"
                                                        />
                                                    </div>

                                                    {/* Feedback */}
                                                    {criterion.feedback && (
                                                        <FeedbackRenderer
                                                            content={criterion.feedback}
                                                            className="text-sm"
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>
                            );
                        })()
                    )}

                    {/* General Feedback */}
                    {grade.feedback && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Lecturer Feedback</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <FeedbackRenderer content={grade.feedback} />
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Assignment Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Assignment Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {grade.lecturer_name && (
                                <div>
                                    <p className="text-sm text-gray-600">Graded By</p>
                                    <p className="font-medium text-gray-900">{grade.lecturer_name}</p>
                                </div>
                            )}

                            {grade.submitted_at && (
                                <div className="flex gap-3">
                                    <Calendar className="h-4 w-4 text-gray-500 mt-1" />
                                    <div>
                                        <p className="text-sm text-gray-600">Submitted</p>
                                        <p className="font-medium text-gray-900">{formatDate(grade.submitted_at)}</p>
                                    </div>
                                </div>
                            )}

                            {grade.graded_at && (
                                <div className="flex gap-3">
                                    <Calendar className="h-4 w-4 text-gray-500 mt-1" />
                                    <div>
                                        <p className="text-sm text-gray-600">Graded</p>
                                        <p className="font-medium text-gray-900">{formatDate(grade.graded_at)}</p>
                                    </div>
                                </div>
                            )}

                            {grade.status && (
                                <div>
                                    <p className="text-sm text-gray-600">Status</p>
                                    <Badge className="mt-1 capitalize">{grade.status}</Badge>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Your Submission */}
                    {grade.file_url && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Your Submission</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-start gap-3">
                                    <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {getFileNameFromUrl(grade.file_url || '')}
                                        </p>
                                        <button
                                            onClick={() => {
                                                if (grade.file_url) {
                                                    downloadFile(grade.file_url, getFileNameFromUrl(grade.file_url));
                                                }
                                            }}
                                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium mt-2"
                                        >
                                            <Download className="h-4 w-4" />
                                            Download
                                        </button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Performance */}
                    {(grade.final_score !== null || grade.class_average !== undefined) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Performance</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {grade.final_score !== null && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Your Score</span>
                                        <div className="text-right">

                                            <span className="text-sm text-gray-500 ml-2">
                                                {scorePercentage.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {grade.class_average !== undefined && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Class Average</span>
                                        <span className="font-semibold text-gray-900">
                                            {grade.class_average}%
                                        </span>
                                    </div>
                                )}

                                {grade.final_score !== null && grade.class_average !== undefined && (
                                    <div className="pt-2 border-t">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Difference</span>
                                            <span className={`font-semibold ${grade.final_score > grade.class_average ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {grade.final_score > grade.class_average ? '+' : ''}{(grade.final_score - grade.class_average).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
