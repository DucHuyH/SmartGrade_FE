import { useState } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { SearchBar } from '../../components/SearchBar';
import { Plus, Users, FileText, Calendar, Filter } from 'lucide-react';

const SEMESTERS = [
  'Semester 1 2025-2026',
  'Semester 2 2025-2026',
  'Summer Semester 2025-2026',
];

const courses = [
  {
    id: 'CS301',
    name: 'Data Structures & Algorithms',
    code: 'CS301',
    students: 42,
    assignments: 8,
    semester: 'Semester 1 2025-2026',
  },
  {
    id: 'CS405',
    name: 'Database Management Systems',
    code: 'CS405',
    students: 38,
    assignments: 6,
    semester: 'Semester 1 2025-2026',
  },
  {
    id: 'CS502',
    name: 'Machine Learning',
    code: 'CS502',
    students: 35,
    assignments: 7,
    semester: 'Semester 2 2025-2026',
  },
  {
    id: 'CS601',
    name: 'Advanced Software Engineering',
    code: 'CS601',
    students: 41,
    assignments: 7,
    semester: 'Summer Semester 2025-2026',
  },
];

export function CourseManagement() {
  const [open, setOpen] = useState(false);
  const [courseName, setcourseName] = useState('');
  const [courseCode, setcourseCode] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState(SEMESTERS[0]);
  const [semesterFilter, setSemesterFilter] = useState('all');

  const handleCreatecourse = () => {
    // Mock create course
    setOpen(false);
    setcourseName('');
    setcourseCode('');
    setDescription('');
    setSelectedSemester(SEMESTERS[0]);
  };

  // Filter courses based on search query and semester
  const filteredcourses = courses.filter((course) => {
    const matchesSearch = course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSemester = semesterFilter === 'all' || course.semester === semesterFilter;
    return matchesSearch && matchesSemester;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2>Course Management</h2>
          <p className="text-sm text-gray-600">Manage your courses and classes</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-106.25">
            <DialogHeader>
              <DialogTitle>Create New Course</DialogTitle>
              <DialogDescription>Add a new course to your teaching schedule</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="course-name">Course Name</Label>
                <Input
                  id="course-name"
                  placeholder="e.g., Data Structures"
                  value={courseName}
                  onChange={(e) => setcourseName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-code">Course Code</Label>
                <Input
                  id="course-code"
                  placeholder="e.g., CS301"
                  value={courseCode}
                  onChange={(e) => setcourseCode(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the course"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="semester">Semester</Label>
                <Select
                  value={selectedSemester}
                  onValueChange={setSelectedSemester}
                >
                  <SelectTrigger id="semester">
                    <SelectValue placeholder="Select a semester">{selectedSemester}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map((semester) => (
                      <SelectItem key={semester} value={semester}>
                        {semester}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreatecourse} className="w-full">
                Create Course
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search courses by name or code..."
          className="flex-1 max-w-md"
        />
        <div className="flex gap-2">
          <Select value={semesterFilter} onValueChange={setSemesterFilter}>
            <SelectTrigger className="w-60">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Semesters</SelectItem>
              {SEMESTERS.map((semester) => (
                <SelectItem key={semester} value={semester}>
                  {semester}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredcourses.map((course) => (
          <Card key={course.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{course.name}</CardTitle>
                  <CardDescription>{course.code}</CardDescription>
                </div>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{course.semester}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{course.students} Students</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span>{course.assignments} Assignments</span>
                </div>
                <div className="flex gap-2 pt-3">
                  <Link to={`/lecturer/courses/${course.id}/assignments`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      View Assignments
                    </Button>
                  </Link>
                  <Link to={`/lecturer/gradebook/${course.id}`} className="flex-1">
                    <Button className="w-full">
                      Gradebook
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredcourses.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {searchQuery || semesterFilter !== 'all' 
            ? 'No courses found matching your filters' 
            : 'No courses available'}
        </div>
      )}
    </div>
  );
}