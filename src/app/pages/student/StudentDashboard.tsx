import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { BookOpen, FileText, Clock, CheckCircle, AlertCircle, CheckSquare } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { useState, useEffect } from 'react';
import {
  getDashboardStats,
  type StudentDashboardStats,
  getUpcomingAssignments,
  getDueSoonAssignments,
  getGradedAssignments,
  type GetDashboardAssignmentsResult,
  type GetGradedAssignmentsResult
} from '../../services/student/assignmentService';

const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  bgColor,
  textColor,
  hoverBgColor,
  tooltipText
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  hoverBgColor: string;
  tooltipText: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative group transition-all duration-200 rounded-lg p-6 ${bgColor} hover:${hoverBgColor} hover:shadow-lg`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-row items-center justify-between pb-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <div className={textColor}>{Icon}</div>
      </div>
      <div className={`text-3xl font-bold ${textColor}`}>{value}</div>
      <p className={`text-xs mt-2 ${textColor}`}>{description}</p>

      {/* Tooltip */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 z-10 pointer-events-none">
          <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap shadow-lg">
            {tooltipText}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export function StudentDashboard() {
  const [stats, setStats] = useState<StudentDashboardStats>({
    enrolled_courses: 0,
    due_soon_assignments: 0,
    upcoming_assignments: 0,
    overdue_assignments: 0,
    submitted_assignments: 0,
    graded_assignments: 0,
  });
  const [loading, setLoading] = useState(true);

  // Assignment list states
  const [mode, setMode] = useState<'upcoming' | 'duesoon'>('duesoon');
  const [assignmentData, setAssignmentData] = useState<GetDashboardAssignmentsResult>({
    assignments: [],
    pagination: {
      page: 1,
      limit: 10,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    },
  });
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  // Graded assignments states
  const [gradedData, setGradedData] = useState<GetGradedAssignmentsResult>({
    assignments: [],
    pagination: {
      page: 1,
      limit: 10,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    },
  });
  const [gradedLoading, setGradedLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const fetchAssignments = async () => {
      setAssignmentLoading(true);
      try {
        const data = mode === 'upcoming'
          ? await getUpcomingAssignments(1, 10)
          : await getDueSoonAssignments(1, 10);
        setAssignmentData(data);
      } catch (error) {
        console.error(`Error fetching ${mode} assignments:`, error);
      } finally {
        setAssignmentLoading(false);
      }
    };

    fetchAssignments();
  }, [mode]);

  const handlePageChange = async (newPage: number) => {
    setAssignmentLoading(true);
    try {
      const data = mode === 'upcoming'
        ? await getUpcomingAssignments(newPage, 10)
        : await getDueSoonAssignments(newPage, 10);
      setAssignmentData(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error(`Error fetching ${mode} assignments at page ${newPage}:`, error);
    } finally {
      setAssignmentLoading(false);
    }
  };

  // Fetch graded assignments
  useEffect(() => {
    const fetchGradedAssignments = async () => {
      setGradedLoading(true);
      try {
        const data = await getGradedAssignments(1, 10);
        setGradedData(data);
      } catch (error) {
        console.error('Error fetching graded assignments:', error);
      } finally {
        setGradedLoading(false);
      }
    };

    fetchGradedAssignments();
  }, []);

  const handleGradedPageChange = async (newPage: number) => {
    setGradedLoading(true);
    try {
      const data = await getGradedAssignments(newPage, 10);
      setGradedData(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error(`Error fetching graded assignments at page ${newPage}:`, error);
    } finally {
      setGradedLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2>My Dashboard</h2>
        <p className="text-sm text-gray-600">Track your progress and upcoming assignments</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Enrolled Courses"
          value={stats.enrolled_courses}
          description="Total courses"
          icon={<BookOpen className="h-5 w-5" />}
          bgColor="bg-blue-50"
          hoverBgColor="bg-blue-100"
          textColor="text-blue-600"
          tooltipText="Total number of courses you are currently enrolled in"
        />

        <StatCard
          title="Upcoming"
          value={stats.upcoming_assignments}
          description="Upcoming assignments"
          icon={<Clock className="h-5 w-5" />}
          bgColor="bg-purple-50"
          hoverBgColor="bg-purple-100"
          textColor="text-purple-600"
          tooltipText="Assignments that are not yet due and waiting to be started"
        />

        <StatCard
          title="Due Soon"
          value={stats.due_soon_assignments}
          description="Due soon"
          icon={<AlertCircle className="h-5 w-5" />}
          bgColor="bg-red-50"
          hoverBgColor="bg-red-100"
          textColor="text-red-600"
          tooltipText="Assignments due within the next few days - requires immediate attention"
        />

        <StatCard
          title="Submitted"
          value={stats.submitted_assignments}
          description="Submitted assignments"
          icon={<FileText className="h-5 w-5" />}
          bgColor="bg-orange-50"
          hoverBgColor="bg-orange-100"
          textColor="text-orange-600"
          tooltipText="Assignments you have already submitted for grading"
        />

        <StatCard
          title="Graded"
          value={stats.graded_assignments}
          description="Graded assignments"
          icon={<CheckSquare className="h-5 w-5" />}
          bgColor="bg-green-50"
          hoverBgColor="bg-green-100"
          textColor="text-green-600"
          tooltipText="Assignments that have been evaluated and graded by your instructor"
        />
      </div>

      {/* Assignments List with Tabs */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Assignments</CardTitle>
          </div>
          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <Button
              variant={mode === 'duesoon' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('duesoon')}
              className={mode === 'duesoon' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Due Soon
            </Button>
            <Button
              variant={mode === 'upcoming' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('upcoming')}
              className={mode === 'upcoming' ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              <Clock className="h-4 w-4 mr-2" />
              Upcoming
            </Button>

          </div>
        </CardHeader>
        <CardContent>
          {assignmentLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading assignments...</p>
            </div>
          ) : assignmentData.assignments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No assignments found</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {assignmentData.assignments.map((assignment) => (
                  <Link
                    key={assignment.assignment_id}
                    to={`/student/courses/${assignment.course.course_id}/assignments/${assignment.assignment_id}`}
                    state={{
                      courseName: assignment.course.name,
                      courseId: assignment.course.course_id,
                      maxScore: assignment.max_score,
                      assignmentTitle: assignment.title
                    }}
                  >
                    <div className="border mb-4 rounded-lg p-4 hover:bg-gray-50 hover:border-gray-400 transition-all cursor-pointer">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold">{assignment.title}</h4>
                          <p className="text-xs text-gray-600 mt-1">{assignment.course.name}</p>
                          <p className="text-xs text-gray-500 mt-2">Due: {new Date(assignment.due_date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-700">{assignment.max_score} points</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-3">
                        View Details
                      </Button>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {assignmentData.pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(assignmentData.pagination.page - 1)}
                    disabled={!assignmentData.pagination.hasPrevPage}
                  >
                    Previous
                  </Button>
                  <div className="text-sm text-gray-600">
                    Page {assignmentData.pagination.page} of {assignmentData.pagination.totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(assignmentData.pagination.page + 1)}
                    disabled={!assignmentData.pagination.hasNextPage}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Graded Assignments / Recent Grades */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Graded Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {gradedLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading graded assignments...</p>
            </div>
          ) : gradedData.assignments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No graded assignments yet</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {gradedData.assignments.map((item) => (
                  <Link
                    key={item.submission_id}
                    to={`/student/submissions/${item.submission_id}/grade`}
                    state={{
                      courseName: item.course.name,
                      course_id: item.course.course_id,
                      maxScore: item.max_score,
                      assignmentTitle: item.title,
                      finalScore: item.final_score,
                      feedback: item.feedback
                    }}
                  >
                    <div className="border mb-4 rounded-lg p-4 hover:bg-gray-50 hover:border-gray-400 transition-all cursor-pointer">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{item.title}</p>
                          <p className="text-xs text-gray-600">{item.course.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Graded: {new Date(item.graded_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-green-600">
                            {item.final_score !== null ? item.final_score : '-'} / {item.max_score}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.final_score !== null ? Math.round((item.final_score / item.max_score) * 100) : '--'}%
                          </p>
                        </div>
                      </div>
                      {item.final_score !== null && (
                        <Progress value={(item.final_score / item.max_score) * 100} className="h-2 mb-3" />
                      )}
                      {item.feedback && (
                        <p className="text-xs bg-blue-50 p-2 rounded text-gray-700 mt-2">
                          <span className="font-semibold">Feedback: </span>{item.feedback}
                        </p>
                      )}
                      <Button variant="outline" size="sm" className="w-full mt-3">
                        View Details
                      </Button>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {gradedData.pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGradedPageChange(gradedData.pagination.page - 1)}
                    disabled={!gradedData.pagination.hasPrevPage}
                  >
                    Previous
                  </Button>
                  <div className="text-sm text-gray-600">
                    Page {gradedData.pagination.page} of {gradedData.pagination.totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGradedPageChange(gradedData.pagination.page + 1)}
                    disabled={!gradedData.pagination.hasNextPage}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
