import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { SearchBar } from '../../components/SearchBar';
import { BookOpen, Loader2, User } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Pagination } from '../../components/ui/pagination';
import { toast } from 'react-toastify';
import { getStudentCourses, StudentCourseApiItem } from '../../services/student/courseService';

export function MyCourses() {
  const [courses, setCourses] = useState<StudentCourseApiItem[]>([]);
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

  const filteredCourses = useMemo(() => {
    return courses;
  }, [courses]);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          <Card className="lg:col-span-2">
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
              <div className="flex items-start gap-2">
                <BookOpen className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <CardTitle>{course.name}</CardTitle>
                  <CardDescription>{course.course_code}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                <div>
                  <span className="text-gray-500">Course ID:</span> {course.course_id}
                </div>
                <div>
                  <span className="text-gray-500">Lecturer ID:</span> {course.lecturer_id}
                </div>
                <div>
                  <span className="text-gray-500">Semester:</span> {course.semester}
                </div>
                <div>
                  <span className="text-gray-500">Academic Year:</span> {course.academic_year}
                </div>
                <div className="sm:col-span-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{course.lecturer?.name ?? 'N/A'}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Link to={`/student/courses/${course.course_id}/assignments`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    View Assignments
                  </Button>
                </Link>
                <Link to={`/student/courses/${course.course_id}/materials`} className="flex-1">
                  <Button className="w-full">
                    Course Materials
                  </Button>
                </Link>
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