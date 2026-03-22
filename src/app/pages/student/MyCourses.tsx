import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { SearchBar } from '../../components/SearchBar';
import { BookOpen, Users, FileText, Clock } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/button';

const courses = [
  {
    id: 'CS301',
    name: 'Data Structures & Algorithms',
    code: 'CS301',
    lecturer: 'Dr. Sarah Johnson',
    schedule: 'Mon, Wed 10:00-11:30',
    progress: 75,
    assignments: { completed: 6, total: 8 },
    grade: 'A',
    average: 91.5,
  },
  {
    id: 'CS405',
    name: 'Database Management Systems',
    code: 'CS405',
    lecturer: 'Prof. Michael Chen',
    schedule: 'Tue, Thu 14:00-15:30',
    progress: 70,
    assignments: { completed: 5, total: 7 },
    grade: 'A-',
    average: 89.2,
  },
  {
    id: 'CS502',
    name: 'Machine Learning',
    code: 'CS502',
    lecturer: 'Dr. Emily Roberts',
    schedule: 'Wed, Fri 16:00-17:30',
    progress: 65,
    assignments: { completed: 4, total: 6 },
    grade: 'A',
    average: 93.8,
  },
  {
    id: 'CS601',
    name: 'Advanced Software Engineering',
    code: 'CS601',
    lecturer: 'Prof. James Wilson',
    schedule: 'Mon, Fri 13:00-14:30',
    progress: 80,
    assignments: { completed: 7, total: 8 },
    grade: 'B+',
    average: 87.4,
  },
];

export function MyCourses() {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter courses based on search query
  const filteredCourses = courses.filter((course) =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.lecturer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2>My Classes</h2>
        <p className="text-sm text-gray-600">Spring 2026 Semester</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">4</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Average Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-green-600">90.5%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">22/29</div>
            <p className="text-xs text-gray-500">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">72%</div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search classes by name, code, or lecturer..."
        className="max-w-md"
      />

      {/* Course Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCourses.map((course) => (
          <Card key={course.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{course.name}</CardTitle>
                  <CardDescription>{course.code}</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-lg text-green-600">{course.grade}</div>
                  <div className="text-xs text-gray-600">{course.average}%</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{course.lecturer}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{course.schedule}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>
                    {course.assignments.completed}/{course.assignments.total} Assignments
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Course Progress</span>
                  <span>{course.progress}%</span>
                </div>
                <Progress value={course.progress} className="h-2" />
              </div>

              <div className="flex gap-2">
                <Link to={`/student/assignments?class=${course.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    View Assignments
                  </Button>
                </Link>
                <Link to={`/student/classes/${course.id}/materials`} className="flex-1">
                  <Button className="w-full">
                    Course Materials
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No courses found matching "{searchQuery}"
        </div>
      )}
    </div>
  );
}