import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Breadcrumb } from '../../components/Breadcrumb';
import { Calendar, Clock, FileText, AlertCircle, Loader2, Download } from 'lucide-react';
import { toast } from 'react-toastify';
import type { Assignment } from '../../../model/assignment';
import { getAssignmentDetails } from '../../services/student/assignmentService';

type RubricItem = {
  criteria: string;
  points: number;
};

const formatDate = (value?: string) => {
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

const getDaysLeft = (dueDate?: string) => {
  if (!dueDate) {
    return null;
  }

  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) {
    return null;
  }

  const diffMs = due.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

const resolveFileUrl = (value?: string) => {
  if (!value) {
    return '';
  }

  const normalized = value.trim().replace(/\\/g, '/');
  if (!normalized) {
    return '';
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (normalized.startsWith('//')) {
    return `${window.location.protocol}${normalized}`;
  }

  if (normalized.startsWith('/')) {
    return `${window.location.origin}${normalized}`;
  }

  return `${window.location.origin}/${normalized}`;
};

const getFileNameFromUrl = (url: string) => {
  try {
    const urlObj = new URL(url);
    const fileName = urlObj.pathname.split('/').pop();
    return fileName || 'question-file';
  } catch {
    return 'question-file';
  }
};

const normalizeAllowedFileTypes = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmedValue.replace(/'/g, '"'));
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
        }
      } catch {
        // Fallback to CSV-like parsing below.
      }
    }

    return trimmedValue
      .split(',')
      .map((item) => item.trim().replace(/^[\[\]'"\s]+|[\[\]'"\s]+$/g, ''))
      .filter(Boolean);
  }

  return [];
};

const normalizeRequirements = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (typeof value === 'string') {
    const lines = value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .map((line) => line.replace(/^[-*\u2022]\s*/, ''))
      .filter(Boolean);

    if (lines.length > 1) {
      return lines;
    }

    return value
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeRubricItems = (assignment: Assignment | null): RubricItem[] => {
  const criteria = assignment?.rubric?.criteria ?? [];

  if (!Array.isArray(criteria)) {
    return [];
  }

  return criteria
    .map((item) => ({
      criteria: item.criteria_name,
      points: Number(item.max_score) || 0,
    }))
    .filter((item) => item.criteria.trim().length > 0);
};

export function AssignmentDetail() {
  const { course_id, assignment_id, classId, id } = useParams();
  const location = useLocation();
  const navState = (location.state as { courseName?: string; courseCode?: string } | null) ?? null;
  const resolvedCourseId = course_id ?? classId;
  const resolvedAssignmentId = assignment_id ?? id;
  const courseName = navState?.courseName ?? '';

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!resolvedAssignmentId) {
      return;
    }

    const fetchAssignmentDetail = async () => {
      setIsLoading(true);
      try {
        const detail = await getAssignmentDetails(resolvedAssignmentId);
        setAssignment(detail);
      } catch (error) {
        console.error('Failed to load assignment detail:', error);
        toast.error('Failed to load assignment details.');
        setAssignment(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignmentDetail();
  }, [resolvedAssignmentId]);

  const daysLeft = getDaysLeft(assignment?.due_date);

  const requirements = useMemo(() => normalizeRequirements(assignment?.requirements), [assignment?.requirements]);
  const rubricItems = useMemo(() => normalizeRubricItems(assignment), [assignment]);
  const allowedFileTypes = useMemo(
    () => normalizeAllowedFileTypes(assignment?.allowed_file_types),
    [assignment?.allowed_file_types]
  );
  const questionFileUrl = useMemo(
    () => resolveFileUrl(assignment?.question_file_url ?? assignment?.question_file),
    [assignment?.question_file_url, assignment?.question_file]
  );
  const resolvedCourseName = courseName || assignment?.courseName || assignment?.course_name || '';
  const isAlreadySubmitted = Boolean(assignment?.has_submitted);

  // Build breadcrumb items
  const breadcrumbItems = [];
  if (resolvedCourseId) {
    breadcrumbItems.push(
      { label: 'My Courses', href: '/student/courses' },
      { label: resolvedCourseName || `Course ${resolvedCourseId}`, href: `/student/courses/${resolvedCourseId}/assignments` },
      { label: assignment?.title ?? 'Assignment Detail' }
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {breadcrumbItems.length > 0 && <Breadcrumb items={breadcrumbItems} />}
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-black font-semibold text-lg">Loading assignment detail...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="space-y-6">
        {breadcrumbItems.length > 0 && <Breadcrumb items={breadcrumbItems} />}
        <Card>
          <CardContent className="pt-6 text-sm text-gray-600">
            Assignment detail is unavailable.
          </CardContent>
        </Card>
        <div className="space-y-3 max-w-sm">
          <Link to={resolvedCourseId ? `/student/courses/${resolvedCourseId}/assignments` : '/student/assignments'}>
            <Button variant="outline" className="w-full">
              Back to Assignments
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {breadcrumbItems.length > 0 && <Breadcrumb items={breadcrumbItems} />}

      <div className="flex justify-between items-start">
        <div>
          <h2>{assignment.title}</h2>
          <p className="text-sm text-gray-600">{resolvedCourseName || `Course ${resolvedCourseId ?? assignment.course_id}`}</p>
        </div>
        {/* {typeof daysLeft === 'number' && (
          <Badge className={daysLeft <= 3 ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}>
            {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
          </Badge>
        )} */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="whitespace-pre-line text-sm text-gray-700">{assignment.description || 'No description provided.'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {requirements.length > 0 ? (
                  requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-gray-700">{req}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-600">No requirements provided.</li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card className={questionFileUrl ? 'border-emerald-300 bg-emerald-50/50 shadow-sm' : undefined}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Question File</CardTitle>
                {questionFileUrl ? (
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">File Available</Badge>
                ) : null}
              </div>
              <CardDescription>
                {questionFileUrl ? 'Please review and download before submission.' : 'Download file attached by lecturer.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {questionFileUrl ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-md border p-3">
                  <div className="text-sm text-gray-700 break-all">{getFileNameFromUrl(questionFileUrl)}</div>
                  <Button asChild variant="outline" className="w-full sm:w-auto">
                    <a href={questionFileUrl} target="_blank" rel="noopener noreferrer" download>
                      <Download className="h-4 w-4" />
                      Download File
                    </a>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-gray-600">No question file attached.</p>
              )}
            </CardContent>
          </Card>

          {/* <Card>
            <CardHeader>
              <CardTitle>Grading Rubric</CardTitle>
              <CardDescription>Total: {assignment.max_score ?? 0} points</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rubricItems.length > 0 ? (
                  rubricItems.map((rubric, index) => (
                    <div key={`${rubric.criteria}-${index}`}>
                      {index > 0 && <Separator className="mb-3" />}
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{rubric.criteria}</span>
                        <span className="text-sm">{rubric.points} points</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">No rubric configured.</p>
                )}
              </div>
            </CardContent>
          </Card> */}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">

                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5 text-gray-500" />
                  <div>
                    <div className="text-gray-600">Posted</div>
                    <div>{formatDate(assignment.created_at)}</div>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 text-gray-500" />
                  <div>
                    <div className="text-gray-600">Due Date</div>
                    <div className="text-orange-600">{formatDate(assignment.due_date)}</div>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 text-gray-500" />
                  <div>
                    <div className="text-gray-600">Total Points</div>
                    <div>{assignment.max_score ?? 0}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Submission Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-gray-600 mb-1">Allowed File Types</div>
                <div className="flex flex-wrap gap-2">
                  {allowedFileTypes.length > 0 ? (
                    allowedFileTypes.map((type) => (
                      <Badge key={type} variant="outline">
                        {type}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-gray-600">N/A</span>
                  )}
                </div>
              </div>
              <Separator />
              <div>
                <div className="text-gray-600">Max File Size</div>
                <div>{assignment.max_file_size_mb ? `${assignment.max_file_size_mb} MB` : 'N/A'}</div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3 flex flex-col">
            {isAlreadySubmitted ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                You have already submitted this assignment.
              </div>
            ) : null}

            {isAlreadySubmitted ? (
              <Button className="w-full" disabled>
                Submitted
              </Button>
            ) : (
              <Link
                to={`/student/submit/${assignment.assignment_id}`}
                state={{
                  assignment,
                  courseName: resolvedCourseName || courseName,
                  backPath: resolvedCourseId
                    ? `/student/courses/${resolvedCourseId}/assignments/${assignment.assignment_id}`
                    : '/student/assignments',
                }}
              >
                <Button className="w-full">Submit Assignment</Button>
              </Link>
            )}
            <Link to={resolvedCourseId ? `/student/courses/${resolvedCourseId}/assignments` : '/student/assignments'}>
              <Button variant="outline" className="w-full">
                Back to Assignments
              </Button>
            </Link>
          </div>

          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="text-sm text-orange-700">
                  <p>Make sure to submit before the deadline. Late submissions may receive a penalty.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}