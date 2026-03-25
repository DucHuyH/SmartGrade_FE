import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ArrowLeft, ArrowUpFromLine, FileText, Loader2, Save, X, Upload } from 'lucide-react';
import { Course } from '../../../model';
import { Assignment } from '../../../model/assignment';
import { createAssignment } from '../../services/lecturer/assignmentService';
import { getAllCourses } from '../../services/lecturer/courseService';
import { toast } from 'react-toastify';

const FILE_TYPE_OPTIONS = ['pdf', 'docx', 'xlsx', 'txt']
const DEADLINE_OFFSET_MINUTES = 5

const toIsoDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toISOString()
}

const toLocalDateTimeInput = (date: Date) => {
  const timezoneOffsetInMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - timezoneOffsetInMs).toISOString().slice(0, 16)
}

const getMinimumDeadlineInput = () => {
  const minDeadline = new Date(Date.now() + DEADLINE_OFFSET_MINUTES * 60 * 1000)
  return toLocalDateTimeInput(minDeadline)
}

const formatFileSizeMb = (bytes: number) => {
  const sizeInMb = bytes / (1024 * 1024)
  return `${sizeInMb.toFixed(2)} MB`
}

export function CreateAssignment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseFromQuery = searchParams.get('course') ?? '';

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [courseId, setCourseId] = useState(courseFromQuery);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState('');
  const [requirements, setRequirements] = useState('');
  const [deadline, setDeadline] = useState(getMinimumDeadlineInput());
  const [totalPoints, setTotalPoints] = useState('100');
  const [maxFileSizeMb, setMaxFileSizeMb] = useState('10');
  const [allowLateSubmissions, setAllowLateSubmissions] = useState(true);
  const [enableAiGrading, setEnableAiGrading] = useState(true);
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>(FILE_TYPE_OPTIONS);
  const [deadlineTick, setDeadlineTick] = useState(Date.now());
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [solutionFile, setSolutionFile] = useState<File | null>(null);
  const [isDraggingQuestionFile, setIsDraggingQuestionFile] = useState(false);
  const [isDraggingSolutionFile, setIsDraggingSolutionFile] = useState(false);
  const questionFileInputRef = useRef<HTMLInputElement | null>(null);
  const solutionFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setDeadlineTick(Date.now())
    }, 30 * 1000)

    return () => window.clearInterval(timerId)
  }, [])

  useEffect(() => {
    if (courseFromQuery) {
      setCourseId(courseFromQuery)
    }
  }, [courseFromQuery])

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoadingCourses(true)
      try {
        const response = await getAllCourses({ page: 1, limit: 100, search: '' })
        const root = response?.data ?? {}
        const coursesData = root?.course

        if (Array.isArray(coursesData)) {
          setCourses(coursesData)

          if (!courseFromQuery && coursesData.length > 0) {
            setCourseId(coursesData[0].course_id)
          }
        } else {
          setCourses([])
        }
      } catch (error) {
        console.error('Error fetching courses:', error)
        setCourses([])
        toast.error('Failed to load courses.')
      } finally {
        setIsLoadingCourses(false)
      }
    }

    fetchCourses()
  }, [courseFromQuery])

  const totalSelectedFileTypes = useMemo(() => selectedFileTypes.join(', '), [selectedFileTypes])
  const minimumDeadlineInput = useMemo(() => getMinimumDeadlineInput(), [deadlineTick])
  const deadlineMinForPicker = useMemo(() => {
    const selectedDate = deadline.slice(0, 10)
    const minDate = minimumDeadlineInput.slice(0, 10)

    if (selectedDate && selectedDate > minDate) {
      return `${selectedDate}T00:00`
    }

    return minimumDeadlineInput
  }, [deadline, minimumDeadlineInput])

  const toggleFileType = (fileType: string) => {
    setSelectedFileTypes((prev) =>
      prev.includes(fileType)
        ? prev.filter((item) => item !== fileType)
        : [...prev, fileType]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: (file: File | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
    }
  };

  const openFilePicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    ref.current?.click();
  };

  const clearSelectedFile = (
    setFile: (file: File | null) => void,
    setDragging: (isDragging: boolean) => void,
    ref: React.RefObject<HTMLInputElement | null>,
  ) => {
    setFile(null);
    setDragging(false);
    if (ref.current) {
      ref.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>, setDragging: (isDragging: boolean) => void) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>, setDragging: (isDragging: boolean) => void) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (
    e: React.DragEvent<HTMLElement>,
    setDragging: (isDragging: boolean) => void,
    setFile: (file: File | null) => void,
  ) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFile(file);
    }
  };

  const handleSave = async () => {
    if (!courseId) {
      toast.error('Please select a course.')
      return
    }

    if (!title.trim()) {
      toast.error('Assignment title is required.')
      return
    }

    if (!deadline) {
      toast.error('Deadline is required.')
      return
    }

    const parsedDeadline = new Date(deadline)
    if (Number.isNaN(parsedDeadline.getTime())) {
      toast.error('Deadline is invalid.')
      return
    }

    const minAllowedDeadline = new Date(Date.now() + DEADLINE_OFFSET_MINUTES * 60 * 1000)
    if (parsedDeadline.getTime() < minAllowedDeadline.getTime()) {
      toast.error(`Deadline must be at least ${DEADLINE_OFFSET_MINUTES} minutes from now.`)
      return
    }

    const parsedMaxScore = Number(totalPoints)
    if (!Number.isFinite(parsedMaxScore) || parsedMaxScore <= 0) {
      toast.error('Total points must be greater than 0.')
      return
    }

    const parsedMaxFileSize = Number(maxFileSizeMb)
    if (!Number.isFinite(parsedMaxFileSize) || parsedMaxFileSize <= 0) {
      toast.error('Max file size must be greater than 0.')
      return
    }

    if (selectedFileTypes.length === 0) {
      toast.error('Please choose at least one allowed file type.')
      return
    }

    setIsSubmitting(true);
    try {
      let submitData: any;

      if (questionFile || solutionFile) {
        const formData = new FormData();
        if (questionFile) {
          formData.append('question_file', questionFile);
        }
        if (solutionFile) {
          formData.append('solution_file', solutionFile);
        }
        formData.append('course_id', courseId);
        formData.append('title', title.trim());
        formData.append('description', description.trim());
        formData.append('questions', questions.trim());
        formData.append('requirements', requirements.trim());
        formData.append('due_date', toIsoDate(deadline));
        formData.append('max_score', String(parsedMaxScore));
        formData.append('allowed_file_types', JSON.stringify(selectedFileTypes));
        formData.append('max_file_size_mb', String(parsedMaxFileSize));
        formData.append('allow_late_submissions', String(allowLateSubmissions));
        formData.append('enable_ai_grading', String(enableAiGrading));
        submitData = formData;
      } else {
        submitData = {
          course_id: courseId,
          title: title.trim(),
          description: description.trim(),
          questions: questions.trim(),
          requirements: requirements.trim(),
          due_date: toIsoDate(deadline),
          max_score: parsedMaxScore,
          allowed_file_types: selectedFileTypes,
          max_file_size_mb: parsedMaxFileSize,
          allow_late_submissions: allowLateSubmissions,
          enable_ai_grading: enableAiGrading,
        };
      }

      await createAssignment(submitData);
      toast.success('Assignment created successfully!');
      navigate(`/lecturer/courses/${courseId}/assignments`);
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create assignment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2>Create New Assignment</h2>
          <p className='text-sm text-gray-600'>Set up a new assignment with rubrics and deadlines</p>
        </div>
        <Button
          variant='outline'
          onClick={() => navigate(courseId ? `/lecturer/courses/${courseId}/assignments` : '/lecturer/courses')}
        >
          <ArrowLeft className='h-4 w-4 mr-2' />
          Back to Assignments
        </Button>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Assignment Details */}
        <div className='lg:col-span-2 space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Assignment Details</CardTitle>
              <CardDescription>Basic information about the assignment</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='subject'>Course</Label>
                <Select
                  value={courseId}
                  onValueChange={setCourseId}
                  disabled={isLoadingCourses || courses.length === 0}
                >
                  <SelectTrigger id='subject'>
                    <SelectValue placeholder={isLoadingCourses ? 'Loading courses...' : 'Select course'} />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.course_id} value={course.course_id}>
                        {course.course_code} - {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isLoadingCourses && courses.length === 0 && (
                  <p className='text-sm text-red-600'>No courses available. Please create a course first.</p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='title'>Assignment Title</Label>
                <Input
                  id='title'
                  placeholder='e.g., Binary Search Tree Implementation'
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='description'>Description</Label>
                <Textarea
                  id='description'
                  placeholder='Provide detailed instructions for the assignment...'
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='questions'>Questions</Label>
                <Textarea
                  id='questions'
                  placeholder='Enter assignment questions...'
                  rows={4}
                  value={questions}
                  onChange={(e) => setQuestions(e.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='requirements'>Requirements</Label>
                <Textarea
                  id='requirements'
                  placeholder='Enter submission requirements...'
                  rows={4}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    type="datetime-local"
                    value={deadline}
                    min={deadlineMinForPicker}
                    step={60}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Choose a deadline from now + {DEADLINE_OFFSET_MINUTES} minutes onward. Past times are disabled.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="points">Total Points</Label>
                  <Input
                    id="points"
                    type="number"
                    min={1}
                    value={totalPoints}
                    onChange={(e) => setTotalPoints(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assignment Files</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-gray-200 p-4 sm:p-6 space-y-3">
                    <p className="text-sm font-medium text-gray-800">Question File</p>
                    <input
                      id="question-file"
                      ref={questionFileInputRef}
                      type="file"
                      onChange={(e) => handleFileChange(e, setQuestionFile)}
                      className="hidden"
                    />
                    {questionFile ? (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-12 w-12 shrink-0 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                            <FileText className="h-6 w-6" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-medium text-gray-900 truncate">{questionFile.name}</p>
                            <p className="text-sm text-gray-500">{formatFileSizeMb(questionFile.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => clearSelectedFile(setQuestionFile, setIsDraggingQuestionFile, questionFileInputRef)}
                          className="h-9 w-9 rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors flex items-center justify-center"
                          aria-label="Remove selected question file"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openFilePicker(questionFileInputRef)}
                        onDragOver={(e) => handleDragOver(e, setIsDraggingQuestionFile)}
                        onDragLeave={(e) => handleDragLeave(e, setIsDraggingQuestionFile)}
                        onDrop={(e) => handleDrop(e, setIsDraggingQuestionFile, setQuestionFile)}
                        className={`w-full rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors ${isDraggingQuestionFile ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white hover:primary/5 hover:border-primary'}`}
                      >
                        <div className="cursor-pointer">
                          <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                          <p className="text-sm text-gray-600 mb-1">Click to upload or drag and drop</p>
                          <p className="text-xs text-gray-400">PDF, Word, Text, or Excel (Max {maxFileSizeMb || '10'}MB)</p>
                        </div>
                      </button>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4 sm:p-6 space-y-3">
                    <p className="text-sm font-medium text-gray-800">Solution File</p>
                    <input
                      id="solution-file"
                      ref={solutionFileInputRef}
                      type="file"
                      onChange={(e) => handleFileChange(e, setSolutionFile)}
                      className="hidden"
                    />
                    {solutionFile ? (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-12 w-12 shrink-0 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                            <FileText className="h-6 w-6" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-medium text-gray-900 truncate">{solutionFile.name}</p>
                            <p className="text-sm text-gray-500">{formatFileSizeMb(solutionFile.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => clearSelectedFile(setSolutionFile, setIsDraggingSolutionFile, solutionFileInputRef)}
                          className="h-9 w-9 rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors flex items-center justify-center"
                          aria-label="Remove selected solution file"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openFilePicker(solutionFileInputRef)}
                        onDragOver={(e) => handleDragOver(e, setIsDraggingSolutionFile)}
                        onDragLeave={(e) => handleDragLeave(e, setIsDraggingSolutionFile)}
                        onDrop={(e) => handleDrop(e, setIsDraggingSolutionFile, setSolutionFile)}
                        className={`w-full rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors ${isDraggingSolutionFile ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white hover:primary/5 hover:border-primary'}`}
                      >
                        <div className="cursor-pointer">
                          <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                          <p className="text-sm text-gray-600 mb-1">Click to upload or drag and drop</p>
                          <p className="text-xs text-gray-400">PDF, Word, Text, or Excel (Max {maxFileSizeMb || '10'}MB)</p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500">Files will be uploaded when you save the assignment.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submission Settings */}
        <div className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Submission Settings</CardTitle>
              <CardDescription>Configure submission options</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label>Allowed File Types</Label>
                <div className='space-y-2'>
                  {FILE_TYPE_OPTIONS.map((type) => (
                    <label key={type} className='flex items-center gap-2'>
                      <input
                        type='checkbox'
                        checked={selectedFileTypes.includes(type)}
                        onChange={() => toggleFileType(type)}
                        className='rounded'
                      />
                      <span className='text-sm'>.{type}</span>
                    </label>
                  ))}
                </div>
                <p className='text-xs text-gray-500'>Selected: {totalSelectedFileTypes || 'None'}</p>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='max-size'>Max File Size (MB)</Label>
                <Input
                  id='max-size'
                  type='number'
                  min={1}
                  value={maxFileSizeMb}
                  onChange={(e) => setMaxFileSizeMb(e.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <label className='flex items-center gap-2'>
                  <input
                    type='checkbox'
                    checked={allowLateSubmissions}
                    onChange={(e) => setAllowLateSubmissions(e.target.checked)}
                    className='rounded'
                  />
                  <span className='text-sm'>Allow late submissions</span>
                </label>
                <label className='flex items-center gap-2'>
                  <input
                    type='checkbox'
                    checked={enableAiGrading}
                    onChange={(e) => setEnableAiGrading(e.target.checked)}
                    className='rounded'
                  />
                  <span className='text-sm'>Enable AI grading</span>
                </label>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleSave}
            className='w-full'
            disabled={isSubmitting || isLoadingCourses || courses.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                Creating...
              </>
            ) : (
              <>
                <Save className='h-4 w-4 mr-2' />
                Create Assignment
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
