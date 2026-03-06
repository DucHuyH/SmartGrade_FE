import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { BookOpen, FileText, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/button';

const upcomingAssignments = [
  {
    id: 'ASG005',
    title: 'Graph Algorithms Implementation',
    subject: 'Data Structures',
    dueDate: '2026-03-05',
    daysLeft: 4,
    status: 'pending',
  },
  {
    id: 'ASG006',
    title: 'Database Normalization Exercise',
    subject: 'Database Management',
    dueDate: '2026-03-07',
    daysLeft: 6,
    status: 'pending',
  },
  {
    id: 'ASG007',
    title: 'Neural Network Lab',
    subject: 'Machine Learning',
    dueDate: '2026-03-10',
    daysLeft: 9,
    status: 'pending',
  },
];

const recentGrades = [
  { assignment: 'Binary Search Tree', subject: 'Data Structures', grade: 92, maxGrade: 100 },
  { assignment: 'SQL Queries Lab', subject: 'Database Management', grade: 88, maxGrade: 100 },
  { assignment: 'Linear Regression', subject: 'Machine Learning', grade: 95, maxGrade: 100 },
];

export function StudentDashboard() {
  const overallAverage = 91.7;

  return (
    <div className="space-y-6">
      <div>
        <h2>My Dashboard</h2>
        <p className="text-sm text-gray-600">Track your progress and upcoming assignments</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Enrolled Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">4</div>
            <p className="text-xs text-gray-500 mt-1">Spring 2026</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Pending Assignments</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-orange-600">3</div>
            <p className="text-xs text-gray-500 mt-1">Due soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-green-600">12</div>
            <p className="text-xs text-gray-500 mt-1">This semester</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Overall Average</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-green-600">{overallAverage}%</div>
            <p className="text-xs text-gray-500 mt-1">Grade: A</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Assignments */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Upcoming Assignments</CardTitle>
            <Link to="/student/assignments">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingAssignments.map((assignment) => (
              <div key={assignment.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-sm">{assignment.title}</h4>
                    <p className="text-xs text-gray-600">{assignment.subject}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      assignment.daysLeft <= 3
                        ? 'bg-red-100 text-red-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {assignment.daysLeft} days left
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Due: {assignment.dueDate}</p>
                <Link to={`/student/assignment/${assignment.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    View Details
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Grades */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Grades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentGrades.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm">{item.assignment}</p>
                    <p className="text-xs text-gray-600">{item.subject}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      {item.grade}/{item.maxGrade}
                    </p>
                    <p className="text-xs text-green-600">{Math.round((item.grade / item.maxGrade) * 100)}%</p>
                  </div>
                </div>
                <Progress value={(item.grade / item.maxGrade) * 100} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
