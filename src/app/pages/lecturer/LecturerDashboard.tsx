import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Users, BookOpen, FileText, CheckCircle, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { getDashboardStats, DashboardStats, getDashboardChart, DashboardChartData, getDashboardSubmissions, Submission, SubmissionsData } from '../../services/lecturer/dashboardService';
import { getAcademicYears, getSemesters, getCurrentAcademicYearInfo, SemesterType } from '../../utils/academicYearUtils';

// Generate academic years from current year
const academicYears = getAcademicYears();
const semesters = getSemesters();

// Colors for pie chart
const submissionColors = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6'];

export function LecturerDashboard() {
  const navigate = useNavigate();

  // Get current academic year and semester
  const { academicYear: currentAcademicYear, semester: currentSemester } = getCurrentAcademicYearInfo();

  const [academicYear, setAcademicYear] = useState(currentAcademicYear);
  const [semester, setSemester] = useState<SemesterType>(currentSemester);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<DashboardChartData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [gradeDistributionData, setGradeDistributionData] = useState<any[]>([]);
  const [submissionStatusData, setSubmissionStatusData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard stats and chart data when filters change
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch stats, chart data, and submissions in parallel
        const [statsData, chartDataResponse, submissionsDataResponse] = await Promise.all([
          getDashboardStats({ academic_year: academicYear, semester }),
          getDashboardChart({ academic_year: academicYear, semester }),
          getDashboardSubmissions({ academic_year: academicYear, semester })
        ]);

        setStats(statsData);
        setChartData(chartDataResponse);
        setSubmissions(submissionsDataResponse.submissions);

        // Transform grade distribution data - ensure all grades are present
        const allGrades = ['A', 'B', 'C', 'D', 'F'];
        const gradeMap = new Map(
          chartDataResponse.grade_distribution.map((item) => [
            item.rank,
            parseInt(String(item.number), 10) || 0,
          ])
        );
        const transformedGrades = allGrades.map((grade) => ({
          grade,
          count: gradeMap.get(grade) || 0,
        }));
        setGradeDistributionData(transformedGrades);

        // Transform submission status data
        const transformedSubmission = chartDataResponse.submission_status.map((item) => ({
          name: item.status,
          value: item.number,
        }));
        setSubmissionStatusData(transformedSubmission);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (academicYear && semester) {
      fetchDashboardData();
    }
  }, [academicYear, semester]);

  return (
    <div className="space-y-6">
      <div>
        <h2>Dashboard Overview</h2>
        <p className="text-sm text-gray-600">Welcome back! Here's what's happening with your classes.</p>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Academic Year</label>
              <Select value={academicYear} onValueChange={setAcademicYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Semester</label>
              <Select value={semester} onValueChange={(value) => setSemester(value as SemesterType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((sem) => (
                    <SelectItem key={sem} value={sem}>
                      {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Students Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Total Students</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats?.total_students ?? 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Student count</p>
          </CardContent>
        </Card>

        {/* Total Courses Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats?.total_courses ?? 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Active courses</p>
          </CardContent>
        </Card>

        {/* Active Assignments Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Active Assignments</CardTitle>
            <FileText className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats?.active_assignments ?? 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">In progress</p>
          </CardContent>
        </Card>

        {/* Ungraded Submissions Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Ungraded Submissions</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats?.ungraded_submissions ?? 0}
            </div>
            <p className="text-xs text-orange-600 mt-1">Requires attention</p>
          </CardContent>
        </Card>

        {/* Unpublished Grades Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Unpublished Grades</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats?.unpublished_grades ?? 0}
            </div>
            <p className="text-xs text-red-600 mt-1">Pending publication</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gradeDistributionData} >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="grade" />
                <YAxis width={30} />
                <Tooltip />
                <Bar dataKey="count" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submission Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={submissionStatusData}
                  cx="50%"
                  cy="45%"
                  labelLine={true}
                  label={({ name, value }) => `${value}`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {submissionStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={submissionColors[index % submissionColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}`} />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{ paddingLeft: '20px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {submissions.length > 0 ? (
              submissions.map((submission) => {
                const submittedDate = new Date(submission.submitted_at);
                const now = new Date();
                const diffMs = now.getTime() - submittedDate.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMs / 3600000);
                const diffDays = Math.floor(diffMs / 86400000);

                let timeString = '';
                if (diffMins < 1) {
                  timeString = 'Just now';
                } else if (diffMins < 60) {
                  timeString = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
                } else if (diffHours < 24) {
                  timeString = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                } else {
                  timeString = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                }

                return (
                  <div key={submission.submission_id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{submission.student_name}</p>
                        <p className="text-xs text-gray-500">{submission.assignment_name}</p>
                        <p className="text-xs text-gray-400">{submission.course_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-green-600 font-medium">Submitted</p>
                      <p className="text-xs text-gray-400">{timeString}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => navigate(`/lecturer/courses/${submission.course_id}/assignments/${submission.assignment_id}/submissions`)}
                      >
                        View <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No submissions found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
