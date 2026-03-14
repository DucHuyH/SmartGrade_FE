import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { SearchBar } from '../../components/SearchBar';
import { Plus, Users, FileText, Filter, Loader2 } from 'lucide-react';
import { Course } from '../../../model';
import { getAllCourses, createCourse } from '../../services/lecturer/courseService';
import { getCurrentUser } from '../../services/lecturer/authService';
import { toast } from 'react-toastify';

const SEMESTERS = [
  'Semester 1',
  'Semester 2',
  'Summer Semester',
];

const ACADEMIC_YEARS = Array.from({ length: 11 }, (_, index) => {
  const startYear = 2025 + index;
  return `${startYear}-${startYear + 1}`;
});


export function CourseManagement() {
  type FormErrors = {
    courseName?: string;
    courseCode?: string;
  };
  const user = getCurrentUser();
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);

  const [courseName, setcourseName] = useState('');
  const [courseCode, setcourseCode] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState(SEMESTERS[0]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(ACADEMIC_YEARS[0]);
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    fetchCourses();
  }, []);


  const fetchCourses = async () => {
    setIsLoadingCourses(true);
    try {
      const response = await getAllCourses();
      if (response.success) {
        setCourses(response.data.course);
        setTotalItems(response.data.pagination.totalItems);
        setTotalPages(response.data.pagination.totalPages);
        setLimit(response.data.pagination.limit);

      } else {
        setCourses([]);
        setTotalItems(0);
        setTotalPages(1);
        setLimit(10);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      setCourses([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setIsLoadingCourses(false);
    }
  };


  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!courseName.trim()) {
      newErrors.courseName = 'Course Name is required';
    }

    if (!courseCode.trim()) {
      newErrors.courseCode = 'Course Code is required';
    }

    setErrors(newErrors);

    return Object.values(newErrors).every((error) => error === '')

  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    try {
      const response = await createCourse({
        lecturer_id: user?.user_id,
        name: courseName,
        course_code: courseCode,
        // description,
        academic_year: selectedAcademicYear,
        semester: selectedSemester,
      });
      if (response.success) {
        setOpen(false);
        fetchCourses();
        toast.success('Course created successfully!');
      } else {
        console.error('Failed to create course:', response.message);
        toast.error('Failed to create course. Please try again.');
      }
    } catch (error) {
      console.error('Error creating course:', error);
      toast.error('An error occurred while creating the course. Please try again.');
    }
  };

  // Filter courses based on search query and semester
  const filteredcourses = courses.filter((course) => {
    const courseNameText = (course.name ?? '').toLowerCase();
    const courseCodeText = (course.course_code ?? '').toLowerCase();
    const semesterText = (course.semester ?? '').toLowerCase();
    const searchText = searchQuery.toLowerCase();

    const matchesSearch = courseNameText.includes(searchText) || courseCodeText.includes(searchText);
    const matchesSemester = semesterFilter === 'all' || semesterText.startsWith(semesterFilter.toLowerCase());
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
                <Label htmlFor="course-name">Course Name <span className="text-red-500">*</span></Label>
                <Input
                  id="course-name"
                  placeholder="e.g., Data Structures"
                  value={courseName}
                  onChange={(e) => {
                    setcourseName(e.target.value);
                    setErrors((prev) => ({ ...prev, courseName: undefined }));
                  }}
                />
                {errors.courseName && <p className="text-sm text-red-600">{errors.courseName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-code">Course Code <span className="text-red-500">*</span></Label>
                <Input
                  id="course-code"
                  placeholder="e.g., CS301"
                  value={courseCode}
                  onChange={(e) => {
                    setcourseCode(e.target.value);
                    setErrors((prev) => ({ ...prev, courseCode: undefined }));
                  }}
                />
                {errors.courseCode && <p className="text-sm text-red-600">{errors.courseCode}</p>}
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
                <Label htmlFor="semester">Chọn học kỳ</Label>
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
              <div className="space-y-2">
                <Label htmlFor="academic-year">Chọn năm học</Label>
                <Select
                  value={selectedAcademicYear}
                  onValueChange={setSelectedAcademicYear}
                >
                  <SelectTrigger id="academic-year">
                    <SelectValue placeholder="Chọn năm học">{selectedAcademicYear}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_YEARS.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateCourse} className="w-full">
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

      {isLoadingCourses ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-black font-semibold text-lg">Loading courses...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredcourses.map((course) => (
            <Card key={course.course_id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{course.name}</CardTitle>
                    <CardDescription>{course.course_code}</CardDescription>
                  </div>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">{course.semester} {course.academic_year}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    {/* <span>{course.students} Students</span> */}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="h-4 w-4" />
                    {/* <span>{course.assignments} Assignments</span> */}
                  </div>
                  <div className="flex gap-2 pt-3">
                    <Link to={`/lecturer/courses/${course.course_id}/assignments`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        View Assignments
                      </Button>
                    </Link>
                    <Link to={`/lecturer/gradebook/${course.course_id}`} className="flex-1">
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
      )}

      {!isLoadingCourses && filteredcourses.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {searchQuery || semesterFilter !== 'all'
            ? 'No courses found matching your filters'
            : 'No courses available'}
        </div>
      )}
    </div>
  );
}