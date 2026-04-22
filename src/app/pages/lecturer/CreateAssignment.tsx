import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { ArrowLeft, FileText, Loader2, Save, X, Upload, Plus, Trash2, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { Course } from '../../../model';
import { CriteriaPayload, RubricPayload } from '../../../model/rubric';
import { createAssignment } from '../../services/lecturer/assignmentService';
import { toast } from 'react-toastify';
import { RUBRIC_TEMPLATES } from '../../constants/rubricTemplates';
import { ScoringLevel, ScoringLevelsEditor, createDefaultScoringLevels } from '../../components/ScoringLevelsEditor';

const FILE_TYPE_OPTIONS = ['pdf', 'docx', 'xlsx', 'txt']
const DEADLINE_OFFSET_MINUTES = 5

type CriteriaDraft = CriteriaPayload
type NormalizedCriteriaDraft = CriteriaDraft & { sourceIndex: number }

const createEmptyCriteria = (): CriteriaDraft => ({
  criteria_name: '',
  description: '',
  max_score: 0,
  weight: 0,
})

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

const loadRubricTemplate = (templateId: string): CriteriaDraft[] => {
  const template = RUBRIC_TEMPLATES.find((t) => t.id === templateId)
  if (!template) {
    return [createEmptyCriteria()]
  }

  // Normalize percentages to sum to 100%
  const criteriaCount = template.criteria.length
  const basePercentage = Math.floor(100 / criteriaCount)
  const remainder = 100 - (basePercentage * criteriaCount)

  return template.criteria.map((c, index) => ({
    criteria_name: c.criteria_name,
    description: c.description,
    max_score: c.max_score,
    // Distribute percentage equally, add remainder to last criterion
    weight: index === criteriaCount - 1 ? basePercentage + remainder : basePercentage,
  }))
}

const loadTemplatesScoringLevels = (templateId: string): { [key: number]: ScoringLevel[] } => {
  const template = RUBRIC_TEMPLATES.find((t) => t.id === templateId) as any
  if (!template) {
    return {}
  }

  const scoringLevelsByIndex: { [key: number]: ScoringLevel[] } = {}

  // Load criterion-specific scoring levels if they exist, otherwise fall back to template-level
  template.criteria.forEach((criterion: any, index: number) => {
    if (criterion.scoringLevels && criterion.scoringLevels.length > 0) {
      // Use criterion-specific scoring levels
      scoringLevelsByIndex[index] = criterion.scoringLevels.map((level: any) => ({
        id: level.level.toLowerCase(),
        level: level.level,
        description: level.description,
        maxScore: level.level === 'Excellent' ? 10 : level.level === 'Satisfactory' ? 7 : 4,
        minScore: level.level === 'Excellent' ? 8 : level.level === 'Satisfactory' ? 5 : 0,
      }))
    } else if (template.scoringLevels && template.scoringLevels.length > 0) {
      // Fall back to template-level scoring levels
      scoringLevelsByIndex[index] = template.scoringLevels.map((level: any) => ({
        id: level.level.toLowerCase(),
        level: level.level,
        description: level.description,
        maxScore: level.level === 'Excellent' ? 10 : level.level === 'Satisfactory' ? 7 : 4,
        minScore: level.level === 'Excellent' ? 8 : level.level === 'Satisfactory' ? 5 : 0,
      }))
    } else {
      // Default scoring levels
      scoringLevelsByIndex[index] = createDefaultScoringLevels()
    }
  })

  return scoringLevelsByIndex
}

const parseScoringLevels = (description: string) => {
  const levels = {
    excellent: '',
    satisfactory: '',
    poor: '',
  }

  if (!description) return levels

  const excellentMatch = description.match(/Excellent\s*\([^)]*\):\s*([^\n]*(?:\n(?!(?:Satisfactory|Poor))[^\n]*)*)/i)
  const satisfactoryMatch = description.match(/Satisfactory\s*\([^)]*\):\s*([^\n]*(?:\n(?!(?:Excellent|Poor))[^\n]*)*)/i)
  const poorMatch = description.match(/Poor\s*\([^)]*\):\s*([^\n]*(?:\n(?!(?:Excellent|Satisfactory))[^\n]*)*)/i)

  if (excellentMatch) levels.excellent = excellentMatch[1].trim()
  if (satisfactoryMatch) levels.satisfactory = satisfactoryMatch[1].trim()
  if (poorMatch) levels.poor = poorMatch[1].trim()

  return levels
}

export function CreateAssignment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const selectedCourse = useMemo(() => {
    const rawCourse = searchParams.get('course')
    if (!rawCourse) {
      return null
    }

    try {
      const parsed = JSON.parse(rawCourse) as Course
      return parsed?.course_id ? parsed : null
    } catch {
      return null
    }
  }, [searchParams])

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [expandedCriteria, setExpandedCriteria] = useState<number | null>(null);
  const [scoringLevels, setScoringLevels] = useState<{ [key: number]: ScoringLevel[] }>({});

  const [courseId] = useState(selectedCourse?.course_id ?? '');
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

  const totalSelectedFileTypes = useMemo(() => selectedFileTypes.join(', '), [selectedFileTypes])
  const normalizedRubricCriteria = useMemo(
    () =>
      criteriaList
        .map((criteria, index) => ({
          ...criteria,
          sourceIndex: index,
          criteria_name: criteria.criteria_name.trim(),
          description: criteria.description.trim(),
          max_score: Number(criteria.max_score) || 0,
          weight: Number(criteria.weight) || 0,
        }))
        .filter((criteria) => (Number(criteria.weight) || 0) > 0),
    [criteriaList],
  )
  const hasRubricInput = normalizedRubricCriteria.length > 0
  const rubricPoints = useMemo(
    () => {
      const totalPts = Number(totalPoints) || 100
      return normalizedRubricCriteria.reduce((sum, criteria) => sum + Math.round((Number(criteria.weight) / 100) * totalPts), 0)
    },
    [normalizedRubricCriteria, totalPoints],
  )
  const minimumDeadlineInput = useMemo(() => getMinimumDeadlineInput(), [deadlineTick])
  const deadlineMinForPicker = useMemo(() => {
    const selectedDate = deadline.slice(0, 10)
    const minDate = minimumDeadlineInput.slice(0, 10)

    if (selectedDate && selectedDate > minDate) {
      return `${selectedDate}T00:00`
    }

    return minimumDeadlineInput
  }, [deadline, minimumDeadlineInput])

  const selectedCourseLabel = useMemo(
    () => (selectedCourse ? `${selectedCourse.course_code} - ${selectedCourse.name}` : ''),
    [selectedCourse],
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

  const updateCriteriaDescription = (index: number, value: string) => {
    setCriteriaList((prev) =>
      prev.map((criteria, currentIndex) =>
        currentIndex === index
          ? {
            ...criteria,
            description: value,
          }
          : criteria,
      ),
    )
  }

  const updateCriteriaWeight = (index: number, value: string) => {
    const parsed = Number(value)
    const percentage = Number.isFinite(parsed) && parsed > 0 ? parsed : 0
    setCriteriaList((prev) =>
      prev.map((criteria, currentIndex) =>
        currentIndex === index
          ? {
            ...criteria,
            weight: Math.min(percentage, 100),
          }
          : criteria,
      ),
    )
  }

  const applyTemplate = (templateId: string) => {
    const newCriteria = loadRubricTemplate(templateId)
    const newScoringLevels = loadTemplatesScoringLevels(templateId)
    setCriteriaList(newCriteria)
    setScoringLevels(newScoringLevels)
    setSelectedTemplate(templateId)
    setShowTemplateMenu(false)
    toast.success('Rubric template applied')
  }

  const getRubricPayload = (criteriaItems: NormalizedCriteriaDraft[]): RubricPayload => {
    return {
      title: title.trim() ? `Rubric for ${title.trim()}` : 'Assignment Rubric',
      criteria: criteriaItems.map((criteria) => {
        const percentage = Number(criteria.weight) || 0
        const ranges = (scoringLevels[criteria.sourceIndex] || createDefaultScoringLevels()).map((level) => ({
          level: level.level.trim(),
          min_score: Number(level.minScore) || 0,
          max_score: Number(level.maxScore) || 0,
          description: level.description.trim(),
        }))

        return {
          criteria_name: criteria.criteria_name.trim(),
          description: criteria.description.trim(),
          weight: percentage / 100,
          ranges,
        }
      }),
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

  const handleSave = async () => {
    if (!courseId) {
      toast.error('Course information is missing. Please go back and open Create Assignment from a course page.')
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

    if (hasRubricInput) {
      const hasEmptyCriteriaName = normalizedRubricCriteria.some((criteria) => !criteria.criteria_name)
      if (hasEmptyCriteriaName) {
        toast.error('Each rubric criteria must have a name.')
        return
      }

      const hasInvalidWeight = normalizedRubricCriteria.some((criteria) => (Number(criteria.weight) || 0) <= 0)
      if (hasInvalidWeight) {
        toast.error('Each rubric criteria must have a percentage greater than 0.')
        return
      }
    }

    const rubricPayload = getRubricPayload(hasRubricInput ? normalizedRubricCriteria : [])
    console.log('Prepared rubric payload:', rubricPayload)

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

        submitData.rubric = rubricPayload;
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
                <Input
                  id='subject'
                  value={selectedCourseLabel || 'No course selected'}
                  readOnly
                  disabled
                  className='disabled:opacity-100'
                />
                {!selectedCourse && (
                  <p className='text-sm text-red-600'>Course information is missing. Please go back and create assignment from a course.</p>
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

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0'>
              <div>
                <CardTitle>Grading Rubrics</CardTitle>
                <CardDescription>Define criteria and point distribution</CardDescription>
              </div>
              <div className='flex gap-2'>
                <div className='relative'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                    className='gap-2'
                  >
                    <Copy className='h-4 w-4' />
                    Templates
                    <ChevronDown className='h-3 w-3' />
                  </Button>
                  {showTemplateMenu && (
                    <div className='absolute top-10 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-50'>
                      {RUBRIC_TEMPLATES.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => applyTemplate(template.id)}
                          className='w-full text-left px-4 py-2 hover:bg-gray-100 text-sm first:rounded-t-lg last:rounded-b-lg'
                        >
                          {template.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button type='button' variant='outline' onClick={addCriteria}>
                  <Plus className='h-4 w-4 mr-2' />
                  Add Criteria
                </Button>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              {/* Rubric Table */}
              <div className='overflow-x-auto border rounded-lg'>
                <table className='w-full text-sm'>
                  <thead className='bg-gray-100 border-b'>
                    <tr>
                      <th className='px-4 py-3 text-left font-semibold text-gray-700 w-8'></th>
                      <th className='px-4 py-3 text-left font-semibold text-gray-700'>Criteria Name</th>
                      <th className='px-4 py-3 text-center font-semibold text-gray-700 w-32'>Percentage (%)</th>
                      <th className='px-4 py-3 text-center font-semibold text-gray-700 w-20'>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criteriaList.map((criteria, index) => {
                      const isExpanded = expandedCriteria === index
                      const levels = scoringLevels[index] || createDefaultScoringLevels()

                      return (
                        <Fragment key={`criteria-row-${criteria.criteria_id ?? 'new'}-${index}`}>
                          <tr key={`${criteria.criteria_id ?? 'new'}-${index}`} className='border-b hover:bg-gray-50 transition-colors'>
                            <td className='px-4 py-3 text-center'>
                              <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                onClick={() => {
                                  setExpandedCriteria(isExpanded ? null : index)
                                  if (!isExpanded && !scoringLevels[index]) {
                                    setScoringLevels(prev => ({
                                      ...prev,
                                      [index]: createDefaultScoringLevels()
                                    }))
                                  }
                                }}
                                className='p-0'
                              >
                                {isExpanded ? (
                                  <ChevronDown className='h-4 w-4' />
                                ) : (
                                  <ChevronRight className='h-4 w-4' />
                                )}
                              </Button>
                            </td>
                            <td className='px-4 py-3'>
                              <Input
                                value={criteria.criteria_name}
                                onChange={(event) => updateCriteriaName(index, event.target.value)}
                                placeholder='Enter criteria name'
                                className='bg-white border border-gray-300'
                              />
                            </td>
                            <td className='px-4 py-3'>
                              <Input
                                type='number'
                                min={0}
                                max={100}
                                step={1}
                                value={criteria.weight}
                                onChange={(event) => updateCriteriaWeight(index, event.target.value)}
                                placeholder='0'
                                className='bg-white border border-gray-300 text-center w-24 text-base py-2'
                              />
                            </td>
                            <td className='px-4 py-3 text-center'>
                              <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                onClick={() => removeCriteria(index)}
                                disabled={criteriaList.length <= 1}
                                className='text-red-600 hover:text-red-700 hover:bg-red-50'
                              >
                                <Trash2 className='h-4 w-4' />
                              </Button>
                            </td>
                          </tr>

                          {/* Scoring Levels Sub-Table */}
                          {isExpanded && (
                            <tr key={`levels-${index}`} className='bg-gray-50 border-b'>
                              <td colSpan={4} className='p-0'>
                                <ScoringLevelsEditor
                                  levels={levels}
                                  onUpdate={(updatedLevels) => {
                                    setScoringLevels(prev => ({ ...prev, [index]: updatedLevels }))
                                  }}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className='border-t pt-4 bg-gray-50 rounded-lg p-4 flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-gray-700'>Total Points</p>
                  <p className='text-xs text-gray-500 mt-1'>Sum of all criteria points</p>
                </div>
                <span className={`text-2xl font-bold ${rubricPoints !== parseInt(totalPoints || '0') ? 'text-red-600' : 'text-green-600'}`}>
                  {rubricPoints} / {totalPoints || '0'}
                </span>
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

              {/* <div className='space-y-2'>
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
              </div> */}
            </CardContent>
          </Card>

          <Button
            onClick={handleSave}
            className='w-full'
            disabled={isSubmitting || !courseId}
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
