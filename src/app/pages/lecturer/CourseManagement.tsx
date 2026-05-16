import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Pagination } from '../../components/ui/pagination';
import { SearchBar } from '../../components/SearchBar';
import { Plus, Filter, Loader2, MoreVertical, ChevronDown, Calendar } from 'lucide-react';
import { Course } from '../../../model';
import { getAllCourses, createCourse, updateCourse, deleteCourse, getCourseStudents } from '../../services/lecturer/courseService';
import { getAssignmentsForCourse } from '../../services/lecturer/assignmentService';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState(SEMESTERS[0]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(ACADEMIC_YEARS[0]);
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [errors, setErrors] = useState<FormErrors>({});
  const [editErrors, setEditErrors] = useState<FormErrors>({});
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);

  const [activeMenuCourseId, setActiveMenuCourseId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmEditOpen, setConfirmEditOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const [editCourseName, setEditCourseName] = useState('');
  const [editCourseCode, setEditCourseCode] = useState('');
  const [editSemester, setEditSemester] = useState(SEMESTERS[0]);
  const [editAcademicYear, setEditAcademicYear] = useState(ACADEMIC_YEARS[0]);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  // Expand/Collapse state for course preview
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [courseAssignments, setCourseAssignments] = useState<Record<string, any[]>>({});
  const [assignmentCounts, setAssignmentCounts] = useState<Record<string, number>>({});
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [isLoadingAssignments, setIsLoadingAssignments] = useState<Record<string, boolean>>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(6);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, semesterFilter]);

  useEffect(() => {
    fetchCourses();
  }, [currentPage, limit, debouncedSearchQuery, semesterFilter]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActiveMenuCourseId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalizeAssignments = (response: any): any[] => {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.data?.course)) {
      return response.data.course;
    }

    if (Array.isArray(response?.course)) {
      return response.course;
    }

    return [];
  };

  const extractAssignmentCount = (response: any): number => {
    const totalItems = response?.data?.pagination?.totalItems ?? response?.pagination?.totalItems;

    if (typeof totalItems === 'number') {
      return totalItems;
    }

    return normalizeAssignments(response).length;
  };

  const preloadAssignmentCounts = async (courseData: Course[]) => {
    if (!courseData.length) {
      setAssignmentCounts({});
      return;
    }

    const countEntries = await Promise.all(
      courseData.map(async (course) => {
        try {
          // limit=1 is enough if API returns totalItems in pagination
          const response = await getAssignmentsForCourse(course.course_id, 1, 1);
          return [course.course_id, extractAssignmentCount(response)] as const;
        } catch (error) {
          console.error(`Error preloading assignment count for ${course.course_id}:`, error);
          return [course.course_id, 0] as const;
        }
      })
    );

    setAssignmentCounts((prev) => ({
      ...prev,
      ...Object.fromEntries(countEntries),
    }));
  };

  const extractStudentCount = (response: any): number => {
    if (typeof response?.data?.pagination?.totalItems === 'number') {
      return response.data.pagination.totalItems;
    }

    if (typeof response?.pagination?.totalItems === 'number') {
      return response.pagination.totalItems;
    }

    if (Array.isArray(response?.data?.students)) {
      return response.data.students.length;
    }

    if (Array.isArray(response?.students)) {
      return response.students.length;
    }

    if (Array.isArray(response)) {
      return response.length;
    }

    return 0;
  };

  const preloadStudentCounts = async (courseData: Course[]) => {
    if (!courseData.length) {
      setStudentCounts({});
      return;
    }

    const countEntries = await Promise.all(
      courseData.map(async (course) => {
        try {
          const response = await getCourseStudents(course.course_id, 1000);
          return [course.course_id, extractStudentCount(response)] as const;
        } catch (error) {
          console.error(`Error preloading student count for ${course.course_id}:`, error);
          return [course.course_id, 0] as const;
        }
      })
    );

    setStudentCounts((prev) => ({
      ...prev,
      ...Object.fromEntries(countEntries),
    }));
  };

  const fetchCourses = async () => {
    setIsLoadingCourses(true);
    try {
      const response = await getAllCourses({
        page: currentPage,
        limit,
        search: debouncedSearchQuery,
        semester: semesterFilter !== 'all' ? semesterFilter : undefined,
      });
      if (response.success) {
        const courseData = response.data?.course ?? [];
        const paginationData = response.data?.pagination;

        setCourses(courseData);
        void preloadAssignmentCounts(courseData);
        void preloadStudentCounts(courseData);
        setTotalItems(paginationData?.totalItems ?? 0);
        setTotalPages(paginationData?.totalPages ?? 1);
        setLimit(paginationData?.limit ?? 6);

      } else {
        setCourses([]);
        setTotalItems(0);
        setTotalPages(1);
        setLimit(6);
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

  const toggleCourseExpanded = async (courseId: string) => {
    if (expandedCourseId === courseId) {
      // Collapse
      setExpandedCourseId(null);
    } else {
      // Expand - fetch assignments if not already loaded
      setExpandedCourseId(courseId);

      if (!courseAssignments[courseId]) {
        try {
          setIsLoadingAssignments((prev) => ({ ...prev, [courseId]: true }));
          const response = await getAssignmentsForCourse(courseId);

          const assignments = normalizeAssignments(response);

          setCourseAssignments((prev) => ({
            ...prev,
            [courseId]: assignments,
          }));

          setAssignmentCounts((prev) => ({
            ...prev,
            [courseId]: extractAssignmentCount(response),
          }));
        } catch (error) {
          console.error('Error fetching assignments:', error);
          setCourseAssignments((prev) => ({
            ...prev,
            [courseId]: [],
          }));
        } finally {
          setIsLoadingAssignments((prev) => ({ ...prev, [courseId]: false }));
        }
      }
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

  const validateEditForm = () => {
    const newErrors: FormErrors = {};

    if (!editCourseName.trim()) {
      newErrors.courseName = 'Course Name is required';
    }

    if (!editCourseCode.trim()) {
      newErrors.courseCode = 'Course Code is required';
    }

    setEditErrors(newErrors);

    return Object.values(newErrors).every((error) => error === '');
  };

  const openEditDialog = (course: Course) => {
    setSelectedCourse(course);
    setEditCourseName(course.name ?? '');
    setEditCourseCode(course.course_code ?? '');
    setEditSemester(course.semester ?? SEMESTERS[0]);
    setEditAcademicYear(course.academic_year ?? ACADEMIC_YEARS[0]);
    setEditErrors({});
    setActiveMenuCourseId(null);
    setEditOpen(true);
  };

  const openDeleteConfirm = (course: Course) => {
    setSelectedCourse(course);
    setActiveMenuCourseId(null);
    setConfirmDeleteOpen(true);
  };

  const handleOpenConfirmEdit = () => {
    if (!validateEditForm()) {
      return;
    }

    setConfirmEditOpen(true);
  };

  const handleConfirmSaveEdit = async () => {
    if (!selectedCourse?.course_id) {
      toast.error('Cannot find course to update.');
      return;
    }

    setIsSavingEdit(true);
    try {
      await updateCourse(selectedCourse.course_id, {
        name: editCourseName,
        course_code: editCourseCode,
        semester: editSemester,
        academic_year: editAcademicYear,
      });

      setConfirmEditOpen(false);
      setEditOpen(false);
      setSelectedCourse(null);
      await fetchCourses();
      toast.success('Course updated successfully!');
    } catch (error) {
      console.error('Error updating course:', error);
      toast.error('Failed to update course. Please try again.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedCourse?.course_id) {
      toast.error('Cannot find course to delete.');
      return;
    }

    setIsDeletingCourse(true);
    try {
      await deleteCourse(selectedCourse.course_id);
      setConfirmDeleteOpen(false);
      setSelectedCourse(null);
      await fetchCourses();
      toast.success('Course deleted successfully!');
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course. Please try again.');
    } finally {
      setIsDeletingCourse(false);
    }
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

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) {
      return;
    }

    setCurrentPage(page);
  };

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

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-106.25">
            <DialogHeader>
              <DialogTitle>Edit Course</DialogTitle>
              <DialogDescription>Update course information before saving changes</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-course-name">Course Name <span className="text-red-500">*</span></Label>
                <Input
                  id="edit-course-name"
                  placeholder="e.g., Data Structures"
                  value={editCourseName}
                  onChange={(e) => {
                    setEditCourseName(e.target.value);
                    setEditErrors((prev) => ({ ...prev, courseName: undefined }));
                  }}
                />
                {editErrors.courseName && <p className="text-sm text-red-600">{editErrors.courseName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-course-code">Course Code <span className="text-red-500">*</span></Label>
                <Input
                  id="edit-course-code"
                  placeholder="e.g., CS301"
                  value={editCourseCode}
                  onChange={(e) => {
                    setEditCourseCode(e.target.value);
                    setEditErrors((prev) => ({ ...prev, courseCode: undefined }));
                  }}
                />
                {editErrors.courseCode && <p className="text-sm text-red-600">{editErrors.courseCode}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-semester">Chọn học kỳ</Label>
                <Select value={editSemester} onValueChange={setEditSemester}>
                  <SelectTrigger id="edit-semester">
                    <SelectValue placeholder="Select a semester">{editSemester}</SelectValue>
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
                <Label htmlFor="edit-academic-year">Chọn năm học</Label>
                <Select value={editAcademicYear} onValueChange={setEditAcademicYear}>
                  <SelectTrigger id="edit-academic-year">
                    <SelectValue placeholder="Chọn năm học">{editAcademicYear}</SelectValue>
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

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button onClick={handleOpenConfirmEdit}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={confirmEditOpen} onOpenChange={setConfirmEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Save</DialogTitle>
              <DialogDescription>Do you want to save changes for this course?</DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setConfirmEditOpen(false)} disabled={isSavingEdit}>
                Cancel
              </Button>
              <Button onClick={handleConfirmSaveEdit} disabled={isSavingEdit}>
                {isSavingEdit ? 'Saving...' : 'Confirm Save'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete course {selectedCourse?.name ? `"${selectedCourse.name}"` : ''}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)} disabled={isDeletingCourse}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeletingCourse}>
                {isDeletingCourse ? 'Deleting...' : 'Confirm Delete'}
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
        {/* <div className="flex gap-2">
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
        </div> */}
      </div>

      {isLoadingCourses ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-black font-semibold text-lg">Loading courses...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {courses.map((course) => (
            <Card key={course.course_id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{course.name}</CardTitle>
                    <CardDescription>{course.course_code}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">{course.semester} {course.academic_year}</span>
                    <div className="relative" ref={activeMenuCourseId === course.course_id ? actionMenuRef : null}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setActiveMenuCourseId((prev) => (prev === course.course_id ? null : course.course_id))}
                        aria-label="Course actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>

                      {activeMenuCourseId === course.course_id && (
                        <div className="absolute right-0 top-10 z-20 min-w-28 rounded-md border bg-white p-1 shadow-md">
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => openEditDialog(course)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-red-600 hover:text-red-700"
                            onClick={() => openDeleteConfirm(course)}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => toggleCourseExpanded(course.course_id)}
                      className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 transition-colors"
                    >
                      <div className="text-left">
                        <p className="text-xs text-gray-600 font-medium">Assignments</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {assignmentCounts[course.course_id] ?? '-'}
                        </p>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${expandedCourseId === course.course_id ? 'rotate-180' : ''
                          }`}
                      />
                    </button>

                    <div className="w-full p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                      <div className="text-left">
                        <p className="text-xs text-gray-600 font-medium">Students</p>
                        <p className="text-2xl font-bold text-emerald-600">
                          {studentCounts[course.course_id] ?? '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedCourseId === course.course_id && (
                    <div className="border-t pt-4 space-y-3">
                      {isLoadingAssignments[course.course_id] ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
                          <span className="text-sm text-gray-600">Loading assignments...</span>
                        </div>
                      ) : courseAssignments[course.course_id] && courseAssignments[course.course_id].length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          <p className="text-xs font-semibold text-gray-700 uppercase">Recent Assignments</p>
                          {courseAssignments[course.course_id].slice(0, 5).map((assignment) => (
                            <div
                              key={assignment.assignment_id}
                              className="bg-gray-50 p-3 rounded border border-gray-200 hover:border-blue-300 transition-colors"
                            >
                              <p className="text-sm font-medium text-gray-900 truncate">{assignment.title}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString('vi-VN') : 'N/A'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No assignments yet</p>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-3">
                    <Link to={`/lecturer/courses/${course.course_id}/assignments`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        View Assignments
                      </Button>
                    </Link>
                    <Link to={`/lecturer/courses/${course.course_id}/gradebook`} className="flex-1">
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

      {!isLoadingCourses && courses.length > 0 && (
        <div className="space-y-3">
          {/* <div className="text-sm text-gray-500 text-center">
            Showing {courses.length} courses on page {currentPage} of {totalPages} ({totalItems} total)
          </div> */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {!isLoadingCourses && courses.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {searchQuery || semesterFilter !== 'all'
            ? 'No courses found matching your filters'
            : 'No courses available'}
        </div>
      )}
    </div>
  );
}