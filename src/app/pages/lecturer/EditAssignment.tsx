import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ArrowLeft, Download, FileText, Loader2, Save, Upload, X, Plus, Trash2 } from 'lucide-react';
import { Course } from '../../../model';
import { Assignment } from '../../../model/assignment';
import { CriteriaPayload, RubricPayload } from '../../../model/rubric';
import { getAssignmentDetails, updateAssignment } from '../../services/lecturer/assignmentService';
import { getAllCourses } from '../../services/lecturer/courseService';
import { toast } from 'react-toastify';

const FILE_TYPE_OPTIONS = ['pdf', 'docx', 'xlsx', 'txt']
const DEADLINE_OFFSET_MINUTES = 5

type CriteriaDraft = CriteriaPayload

const createEmptyCriteria = (): CriteriaDraft => ({
  criteria_name: '',
  description: '',
  max_score: 0,
  weight: 1,
})

const toIsoDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toISOString()
}

const toLocalDateTimeInput = (value?: string) => {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const timezoneOffsetInMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - timezoneOffsetInMs).toISOString().slice(0, 16)
}

const getMinimumDeadlineInput = () => {
  const minDeadline = new Date(Date.now() + DEADLINE_OFFSET_MINUTES * 60 * 1000)
  return toLocalDateTimeInput(minDeadline.toISOString())
}

const parseAssignmentPayload = (payload: unknown): Assignment | null => {
  const root = (payload as Record<string, unknown>)?.data ?? payload
  const rootRecord = (root as Record<string, unknown>) ?? {}

  const assignment =
    (rootRecord.assignment as Assignment | undefined) ??
    ((rootRecord.data as Record<string, unknown> | undefined)?.assignment as Assignment | undefined) ??
    (root as Assignment)

  return assignment?.assignment_id ? assignment : null
}

const normalizeAllowedFileTypes = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim()

    if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmedValue.replace(/'/g, '"'))
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        }
      } catch {
        // Fallback to the CSV-like parse below.
      }
    }

    return (
      trimmedValue
        .split(',')
        // eslint-disable-next-line no-useless-escape
        .map((item) => item.trim().replace(/^[\[\]'"\s]+|[\[\]'"\s]+$/g, ''))
        .filter(Boolean)
    )
  }

  return [];
};

const getFileNameFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return pathname.split('/').pop() || 'assignment-file';
  } catch {
    return 'assignment-file';
  }
};

const formatFileSizeMb = (bytes: number) => {
  const sizeInMb = bytes / (1024 * 1024)
  return `${sizeInMb.toFixed(2)} MB`
}

export function EditAssignment() {
  const navigate = useNavigate();
  const { assignment_id } = useParams();
  const [searchParams] = useSearchParams();
  const courseFromQuery = searchParams.get('course') ?? '';

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);

  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [courseId, setCourseId] = useState(courseFromQuery);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState('');
  const [requirements, setRequirements] = useState('');
  const [deadline, setDeadline] = useState('');
  const [totalPoints, setTotalPoints] = useState('100');
  const [maxFileSizeMb, setMaxFileSizeMb] = useState('10');
  const [allowLateSubmissions, setAllowLateSubmissions] = useState(true);
  const [enableAiGrading, setEnableAiGrading] = useState(true);
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>(FILE_TYPE_OPTIONS);
  const [deadlineTick, setDeadlineTick] = useState(Date.now());
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [solutionFile, setSolutionFile] = useState<File | null>(null);
  const [questionFileUrl, setQuestionFileUrl] = useState('');
  const [solutionFileUrl, setSolutionFileUrl] = useState('');
  const [isCurrentQuestionFileRemoved, setIsCurrentQuestionFileRemoved] = useState(false);
  const [isCurrentSolutionFileRemoved, setIsCurrentSolutionFileRemoved] = useState(false);
  const [isDraggingQuestionFile, setIsDraggingQuestionFile] = useState(false);
  const [isDraggingSolutionFile, setIsDraggingSolutionFile] = useState(false);
  const [criteriaList, setCriteriaList] = useState<CriteriaDraft[]>([
    createEmptyCriteria(),
  ]);
  const questionFileInputRef = useRef<HTMLInputElement | null>(null);
  const solutionFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setDeadlineTick(Date.now())
    }, 30 * 1000)

    return () => window.clearInterval(timerId)
  }, [])

  useEffect(() => {
    if (!assignment_id) {
      return
    }

    const fetchAssignment = async () => {
      setIsLoadingDetails(true)
      try {
        const response = await getAssignmentDetails(assignment_id)
        const parsedAssignment = parseAssignmentPayload(response)

        if (!parsedAssignment) {
          toast.error('Cannot load assignment details.')
          navigate('/lecturer/courses')
          return
        }

        setAssignment(parsedAssignment);
        setCourseId(parsedAssignment.course_id || courseFromQuery);
        setTitle(parsedAssignment.title ?? '');
        setDescription(parsedAssignment.description ?? '');
        setQuestions(parsedAssignment.questions ?? '');
        setRequirements(parsedAssignment.requirements ?? '');
        setDeadline(toLocalDateTimeInput(parsedAssignment.due_date));
        setTotalPoints(String(parsedAssignment.max_score ?? 100));
        setMaxFileSizeMb(String(parsedAssignment.max_file_size_mb ?? 10));
        setAllowLateSubmissions(parsedAssignment.allow_late_submissions ?? true);
        setEnableAiGrading(parsedAssignment.enable_ai_grading ?? true);
        setSelectedFileTypes(normalizeAllowedFileTypes((parsedAssignment as Partial<Assignment>).allowed_file_types));
        setQuestionFileUrl(parsedAssignment.question_file_url ?? '');
        setSolutionFileUrl(parsedAssignment.solution_file_url ?? '');
        if (parsedAssignment.rubric?.criteria?.length) {
          setCriteriaList(
            parsedAssignment.rubric.criteria.map((criteria) => ({
              criteria_id: criteria.criteria_id,
              rubric_id: criteria.rubric_id,
              criteria_name: criteria.criteria_name,
              description: criteria.description,
              max_score: criteria.max_score,
              weight: criteria.weight,
            })),
          )
        } else {
          setCriteriaList([createEmptyCriteria()])
        }
        setIsCurrentQuestionFileRemoved(false);
        setIsCurrentSolutionFileRemoved(false);
      } catch (error) {
        console.error('Error fetching assignment details for edit:', error);
        toast.error('Failed to load assignment details.');
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchAssignment()
  }, [assignment_id, courseFromQuery, navigate])

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoadingCourses(true)
      try {
        const response = await getAllCourses({ page: 1, limit: 100, search: '' })
        const root = response?.data ?? {}
        const coursesData = root?.course

        if (Array.isArray(coursesData)) {
          setCourses(coursesData)
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
  }, [])

  const availableFileTypes = useMemo(() => {
    return Array.from(new Set([...FILE_TYPE_OPTIONS, ...selectedFileTypes]))
  }, [selectedFileTypes])
  const minimumDeadlineInput = useMemo(() => getMinimumDeadlineInput(), [deadlineTick])
  const deadlineMinForPicker = useMemo(() => {
    const selectedDate = deadline.slice(0, 10)
    const minDate = minimumDeadlineInput.slice(0, 10)

    if (selectedDate && selectedDate > minDate) {
      return `${selectedDate}T00:00`
    }

    return minimumDeadlineInput
  }, [deadline, minimumDeadlineInput])

  const selectedFileTypesLabel = useMemo(() => selectedFileTypes.join(', '), [selectedFileTypes])
  const rubricPoints = useMemo(
    () => criteriaList.reduce((sum, criteria) => sum + (Number(criteria.max_score) || 0), 0),
    [criteriaList],
  )

  const toggleFileType = (fileType: string) => {
    setSelectedFileTypes((prev) =>
      prev.includes(fileType)
        ? prev.filter((item) => item !== fileType)
        : [...prev, fileType]
    );
  };

  const addCriteria = () => {
    setCriteriaList((prev) => [...prev, createEmptyCriteria()])
  }

  const removeCriteria = (index: number) => {
    setCriteriaList((prev) => {
      if (prev.length <= 1) {
        return prev
      }

      return prev.filter((_, currentIndex) => currentIndex !== index)
    })
  }

  const updateCriteriaName = (index: number, value: string) => {
    setCriteriaList((prev) =>
      prev.map((criteria, currentIndex) =>
        currentIndex === index
          ? {
            ...criteria,
            criteria_name: value,
          }
          : criteria,
      ),
    )
  }

  const updateCriteriaMaxScore = (index: number, value: string) => {
    const parsed = Number(value)
    setCriteriaList((prev) =>
      prev.map((criteria, currentIndex) =>
        currentIndex === index
          ? {
            ...criteria,
            max_score: Number.isFinite(parsed) ? parsed : 0,
          }
          : criteria,
      ),
    )
  }

  const getRubricPayload = (): RubricPayload => {
    return {
      title: title.trim() ? `Rubric for ${title.trim()}` : 'Assignment Rubric',
      criteria: criteriaList.map((criteria) => ({
        criteria_id: criteria.criteria_id,
        rubric_id: criteria.rubric_id,
        criteria_name: criteria.criteria_name.trim(),
        description: criteria.description.trim(),
        max_score: Number(criteria.max_score) || 0,
        weight: Number(criteria.weight) || 1,
      })),
    }
  }

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

  const handleRemoveCurrentQuestionFile = () => {
    setQuestionFileUrl('');
    setQuestionFile(null);
    setIsCurrentQuestionFileRemoved(true);
  };

  const handleRemoveCurrentSolutionFile = () => {
    setSolutionFileUrl('');
    setSolutionFile(null);
    setIsCurrentSolutionFileRemoved(true);
  };

  const handleDownloadFile = (url: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSave = async () => {
    if (!assignment_id) {
      toast.error('Assignment ID is missing.')
      return
    }

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

    const hasEmptyCriteriaName = criteriaList.some((criteria) => !criteria.criteria_name.trim())
    if (hasEmptyCriteriaName) {
      toast.error('Each rubric criteria must have a name.')
      return
    }

    const hasInvalidCriteriaScore = criteriaList.some((criteria) => (Number(criteria.max_score) || 0) <= 0)
    if (hasInvalidCriteriaScore) {
      toast.error('Each rubric criteria must have points greater than 0.')
      return
    }

    if (rubricPoints !== parsedMaxScore) {
      toast.error('Total rubric points must match Assignment Total Points.')
      return
    }

    const rubricPayload = getRubricPayload()

    setIsSubmitting(true);
    try {
      let submitData: FormData | Record<string, unknown>;

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
        formData.append('rubric', JSON.stringify(rubricPayload));

        if (isCurrentQuestionFileRemoved && !questionFile) {
          formData.append('question_file_url', '');
          formData.append('question_file_public_id', '');
        }
        if (isCurrentSolutionFileRemoved && !solutionFile) {
          formData.append('solution_file_url', '');
          formData.append('solution_file_public_id', '');
        }
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
          rubric: rubricPayload,
        };

        if (isCurrentQuestionFileRemoved) {
          submitData.question_file_url = null;
          submitData.question_file_public_id = null;
        } else if (questionFileUrl) {
          submitData.question_file_url = questionFileUrl;
        }

        if (isCurrentSolutionFileRemoved) {
          submitData.solution_file_url = null;
          submitData.solution_file_public_id = null;
        } else if (solutionFileUrl) {
          submitData.solution_file_url = solutionFileUrl;
        }
      }

      await updateAssignment(assignment_id, submitData);

      toast.success('Assignment updated successfully!')
      navigate(`/lecturer/courses/${courseId}/assignments`)
    } catch (error) {
      console.error('Error updating assignment:', error)
      toast.error('Failed to update assignment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const backCourseId = courseId || courseFromQuery || assignment?.course_id

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2>Edit Assignment</h2>
          <p className='text-sm text-gray-600'>Review details and update assignment settings</p>
        </div>
        <Button
          variant='outline'
          onClick={() => navigate(backCourseId ? `/lecturer/courses/${backCourseId}/assignments` : '/lecturer/courses')}
        >
          <ArrowLeft className='h-4 w-4 mr-2' />
          Back to Assignments
        </Button>
      </div>

      {isLoadingDetails ? (
        <div className='py-20 flex flex-col items-center justify-center gap-4'>
          <Loader2 className='h-10 w-10 animate-spin text-primary' />
          <p className='text-black font-semibold text-lg'>Loading assignment details...</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='lg:col-span-2 space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle>Assignment Details</CardTitle>
                <CardDescription>Update the core assignment information</CardDescription>
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
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='title'>Assignment Title</Label>
                  <Input id='title' value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='description'>Description</Label>
                  <Textarea
                    id='description'
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='questions'>Questions</Label>
                  <Textarea id='questions' rows={4} value={questions} onChange={(e) => setQuestions(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requirements">Requirements</Label>
                  <Textarea id="requirements" rows={4} value={requirements} onChange={(e) => setRequirements(e.target.value)} />
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='deadline'>Deadline</Label>
                    <Input
                      id='deadline'
                      type='datetime-local'
                      value={deadline}
                      min={deadlineMinForPicker}
                      step={60}
                      onChange={(e) => setDeadline(e.target.value)}
                    />
                    <p className='text-xs text-gray-500'>
                      Choose a deadline from now + {DEADLINE_OFFSET_MINUTES} minutes onward. Past times are disabled.
                    </p>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='points'>Total Points</Label>
                    <Input
                      id='points'
                      type='number'
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
                      {questionFileUrl ? (
                        <>
                          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 truncate">
                            Current file: {getFileNameFromUrl(questionFileUrl)}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" onClick={() => handleDownloadFile(questionFileUrl)} variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                            <Button type="button" onClick={handleRemoveCurrentQuestionFile} variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                              Remove Current File
                            </Button>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">No current file.</p>
                      )}

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
                      {solutionFileUrl ? (
                        <>
                          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 truncate">
                            Current file: {getFileNameFromUrl(solutionFileUrl)}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" onClick={() => handleDownloadFile(solutionFileUrl)} variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                            <Button type="button" onClick={handleRemoveCurrentSolutionFile} variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                              Remove Current File
                            </Button>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">No current file.</p>
                      )}

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

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0'>
                <div>
                  <CardTitle>Grading Rubrics</CardTitle>
                  <CardDescription>Define criteria and point distribution</CardDescription>
                </div>
                <Button type='button' variant='outline' onClick={addCriteria}>
                  <Plus className='h-4 w-4 mr-2' />
                  Add Criteria
                </Button>
              </CardHeader>
              <CardContent className='space-y-3'>
                {criteriaList.map((criteria, index) => (
                  <div key={`${criteria.criteria_id ?? 'new'}-${index}`} className='grid grid-cols-[1fr_120px_40px] gap-3'>
                    <Input
                      value={criteria.criteria_name}
                      onChange={(event) => updateCriteriaName(index, event.target.value)}
                      placeholder='Criteria name'
                    />
                    <Input
                      type='number'
                      min={1}
                      value={criteria.max_score}
                      onChange={(event) => updateCriteriaMaxScore(index, event.target.value)}
                      placeholder='Points'
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      onClick={() => removeCriteria(index)}
                      disabled={criteriaList.length <= 1}
                      className='text-red-600 hover:text-red-700'
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                ))}

                <div className='border-t pt-4 flex items-center justify-between text-sm'>
                  <span>Total Points:</span>
                  <span className='font-semibold'>{rubricPoints} / {totalPoints || '0'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

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
                    {availableFileTypes.map((type) => (
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
                  <p className='text-xs text-gray-500'>Selected: {selectedFileTypesLabel || 'None'}</p>
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

            <Button onClick={handleSave} className='w-full' disabled={isSubmitting || isLoadingCourses}>
              {isSubmitting ? (
                <>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  Saving...
                </>
              ) : (
                <>
                  <Save className='h-4 w-4 mr-2' />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
