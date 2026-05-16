import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { SearchBar } from '../../components/SearchBar';
import { AlertTriangle, BookOpen, CalendarClock, ChevronDown, Loader2, User } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Pagination } from '../../components/ui/pagination';
import { toast } from 'react-toastify';
import { getStudentCourses, StudentCourseApiItem } from '../../services/student/courseService';
import { getAssignmentsForCourse } from '../../services/student/assignmentService';
import { Assignment } from '../../../model/assignment';

type CourseAssignmentMeta = {
  totalAssignments: number;
  dueSoonPendingCount: number;
  overduePendingCount: number;
  quickSubmitAssignments: Assignment[];
};

const DUE_SOON_MS = 24 * 60 * 60 * 1000;
const ASSIGNMENT_FETCH_LIMIT = 100;

const isAssignmentCompleted = (assignment: Assignment) => {
  const root = assignment as Assignment & Record<string, unknown>;

  const booleanCompletionKeys = [
    'is_submitted',
    'submitted',
    'isSubmitted',
    'has_submitted',
    'is_completed',
    'completed',
    'is_done',
    'done',
  ];

  if (booleanCompletionKeys.some((key) => root[key] === true)) {
    return true;
  }

  const submissionTimestampKeys = ['submitted_at', 'submission_time', 'submittedAt'];
  if (submissionTimestampKeys.some((key) => typeof root[key] === 'string' && String(root[key]).trim())) {
    return true;
  }

  const statusKeys = ['status', 'submission_status', 'submissionStatus'];
  const completedStatuses = ['submitted', 'graded', 'completed', 'done', 'late_submitted'];
  const statusMatched = statusKeys.some((key) => {
    const value = root[key];
    if (typeof value !== 'string') {
      return false;
    }

    return completedStatuses.includes(value.trim().toLowerCase());
  });

  if (statusMatched) {
    return true;
  }

  const submission = root.submission;
  if (submission && typeof submission === 'object') {
    const submissionRecord = submission as Record<string, unknown>;
    const nestedStatus = submissionRecord.status;
    if (typeof nestedStatus === 'string' && completedStatuses.includes(nestedStatus.trim().toLowerCase())) {
      return true;
    }
  }

  return false;
};

const countDueSoonPendingAssignments = (assignments: Assignment[]) => {
  const now = Date.now();

  return assignments.reduce((count, assignment) => {
    const dueDate = new Date(assignment.due_date);
    if (Number.isNaN(dueDate.getTime())) {
      return count;
    }

    const diffMs = dueDate.getTime() - now;
    const isDueSoon = diffMs > 0 && diffMs <= DUE_SOON_MS;
    if (!isDueSoon) {
      return count;
    }

    return isAssignmentCompleted(assignment) ? count : count + 1;
  }, 0);
};

const countOverduePendingAssignments = (assignments: Assignment[]) => {
  const now = Date.now();

  return assignments.reduce((count, assignment) => {
    const dueDate = new Date(assignment.due_date);
    if (Number.isNaN(dueDate.getTime())) {
      return count;
    }

    if (dueDate.getTime() >= now) {
      return count;
    }

    return isAssignmentCompleted(assignment) ? count : count + 1;
  }, 0);
};

const selectQuickSubmitAssignments = (assignments: Assignment[]) => {
  const now = Date.now();

  const urgentPending = assignments
    .filter((assignment) => {
      const dueDate = new Date(assignment.due_date);
      if (Number.isNaN(dueDate.getTime())) {
        return false;
      }

      if (isAssignmentCompleted(assignment)) {
        return false;
      }

      const diffMs = dueDate.getTime() - now;
      return diffMs <= DUE_SOON_MS;
    })
    .sort((a, b) => {
      const timeA = new Date(a.due_date).getTime();
      const timeB = new Date(b.due_date).getTime();
      return timeA - timeB;
    });

  return urgentPending.slice(0, 3);
};

export function MyCourses() {
  const [courses, setCourses] = useState<StudentCourseApiItem[]>([]);
  const [assignmentMetaByCourse, setAssignmentMetaByCourse] = useState<Record<string, CourseAssignmentMeta>>({});
  const [quickSubmitExpandedByCourse, setQuickSubmitExpandedByCourse] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const limit = 10;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      try {
        const result = await getStudentCourses({
          page: currentPage,
          limit,
          search: debouncedSearchQuery,
        });

        setCourses(result.courses);
        setTotalItems(result.pagination.totalItems);
        setTotalPages(result.pagination.totalPages);
      } catch (error) {
        console.error('Error fetching student courses:', error);
        setCourses([]);
        setTotalItems(0);
        setTotalPages(1);
        toast.error('Failed to load your courses.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, [currentPage, debouncedSearchQuery]);

  useEffect(() => {
    if (courses.length === 0) {
      setAssignmentMetaByCourse({});
      return;
    }

    let cancelled = false;

    const fetchAssignmentMetaForCourses = async () => {
      const entries = await Promise.all(
        courses.map(async (course) => {
          const courseId = String(course.course_id);

          try {
            const result = await getAssignmentsForCourse(courseId, 1, ASSIGNMENT_FETCH_LIMIT, '');
            const uniqueAssignments = Array.from(
              new Map(result.assignments.map((assignment) => [assignment.assignment_id, assignment])).values(),
            );

            const meta: CourseAssignmentMeta = {
              totalAssignments: result.pagination.totalItems || uniqueAssignments.length,
              dueSoonPendingCount: countDueSoonPendingAssignments(uniqueAssignments),
              overduePendingCount: countOverduePendingAssignments(uniqueAssignments),
              quickSubmitAssignments: selectQuickSubmitAssignments(uniqueAssignments),
            };

            return [courseId, meta] as const;
          } catch (error) {
            console.error(`Error fetching assignments for course ${courseId}:`, error);
            return [courseId, { totalAssignments: 0, dueSoonPendingCount: 0, overduePendingCount: 0, quickSubmitAssignments: [] }] as const;
          }
        }),
      );

      if (!cancelled) {
        setAssignmentMetaByCourse(Object.fromEntries(entries));
      }
    };

    fetchAssignmentMetaForCourses();

    return () => {
      cancelled = true;
    };
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses;
  }, [courses]);

  const toggleQuickSubmit = (courseId: string) => {
    setQuickSubmitExpandedByCourse((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2>My Courses</h2>
        <p className="text-sm text-gray-600">Courses enrolled for your account</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Search Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-blue-600">{totalItems}</div>
          </CardContent>
        </Card>
      </div>

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search courses by name, code, or lecturer..."
        className="max-w-md"
      />

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading courses...</span>
              </div>
            </CardContent>
          </Card>
        ) : filteredCourses.map((course) => (
          <Card key={String(course.course_id)} className="hover:shadow-md transition-shadow">
            <CardHeader className="space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-2">
                  <BookOpen className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <CardTitle>{course.name}</CardTitle>
                    <CardDescription>{course.course_code}</CardDescription>
                  </div>
                </div>

                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{course.semester} {course.academic_year}</span>
              </div>

            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                <div className="sm:col-span-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Lecturer: {course.lecturer?.name ?? 'N/A'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-600">Assignments</p>
                  <p className="text-xl font-semibold text-slate-900">{assignmentMetaByCourse[String(course.course_id)]?.totalAssignments ?? 0}</p>
                </div>
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-xs text-amber-700">Due &lt; 24h</p>
                  <p className="text-xl font-semibold text-amber-700">{assignmentMetaByCourse[String(course.course_id)]?.dueSoonPendingCount ?? 0}</p>
                </div>
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-xs text-red-700">Overdue</p>
                  <p className="text-xl font-semibold text-red-700">{assignmentMetaByCourse[String(course.course_id)]?.overduePendingCount ?? 0}</p>
                </div>
              </div>

              {(assignmentMetaByCourse[String(course.course_id)]?.quickSubmitAssignments.length ?? 0) > 0 && (
                <div className="rounded-md border border-red-200 bg-red-50/50 p-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => toggleQuickSubmit(String(course.course_id))}
                    className="flex w-full items-center justify-between rounded-md border border-red-200 bg-white px-3 py-2 text-left"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      <span>
                        Quick submit (urgent) - {assignmentMetaByCourse[String(course.course_id)]?.quickSubmitAssignments.length ?? 0}
                      </span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-red-700 transition-transform ${quickSubmitExpandedByCourse[String(course.course_id)] ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {quickSubmitExpandedByCourse[String(course.course_id)] && (
                    <div className="space-y-2">
                      {assignmentMetaByCourse[String(course.course_id)]?.quickSubmitAssignments.map((assignment) => {
                        const dueDate = new Date(assignment.due_date);
                        const isOverdue = !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now();

                        return (
                          <div
                            key={assignment.assignment_id}
                            className="flex flex-col gap-2 rounded-md border border-red-100 bg-white p-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900">{assignment.title}</p>
                              <p className="flex items-center gap-1 text-xs text-slate-600">
                                <CalendarClock className="h-3.5 w-3.5" />
                                {Number.isNaN(dueDate.getTime())
                                  ? 'Due: N/A'
                                  : `Due: ${dueDate.toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}`}
                              </p>
                            </div>

                            <Link
                              to={`/student/submit/${assignment.assignment_id}`}
                              state={{
                                assignment,
                                courseName: course.name,
                                courseCode: course.course_code,
                                backPath: '/student/courses',
                              }}
                              className="sm:w-auto"
                            >
                              <Button size="sm" className={isOverdue ? 'w-full bg-red-600 hover:bg-red-700 sm:w-auto' : 'w-full sm:w-auto'}>
                                {isOverdue ? 'Submit Now (Overdue)' : 'Submit Now'}
                              </Button>
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}



              <div className="flex gap-2">
                <Link
                  to={`/student/courses/${course.course_id}/assignments`}
                  state={{
                    courseName: course.name,
                    courseCode: course.course_code,
                  }}
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full">
                    View Assignments
                  </Button>
                </Link>
                {/* <Link to={`/student/courses/${course.course_id}/materials`} className="flex-1">
                  <Button className="w-full">
                    Course Materials
                  </Button>
                </Link> */}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoading && totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}

      {!isLoading && filteredCourses.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {debouncedSearchQuery
            ? `No courses found matching "${searchQuery}"`
            : 'No enrolled courses found.'}
        </div>
      )}
    </div>
  );
}