import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Plus, Trash2 } from 'lucide-react'

export interface ScoringLevel {
  id: string
  level: string
  description: string
  maxScore: number
  minScore: number
}

export const createDefaultScoringLevels = (): ScoringLevel[] => {
  return [
    { id: 'excellent', level: 'Excellent', description: '', maxScore: 10, minScore: 8 },
    { id: 'satisfactory', level: 'Satisfactory', description: '', maxScore: 7, minScore: 5 },
    { id: 'poor', level: 'Poor', description: '', maxScore: 4, minScore: 0 }
  ]
}

export const generateLevelId = () => `level_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

interface ScoringLevelsEditorProps {
  levels: ScoringLevel[]
  onUpdate: (updatedLevels: ScoringLevel[]) => void
}

export function ScoringLevelsEditor({ levels, onUpdate }: ScoringLevelsEditorProps) {
  const handleLevelChange = (id: string, field: keyof ScoringLevel, value: any) => {
    const updatedLevels = levels.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    onUpdate(updatedLevels)
  }

  const handleDeleteLevel = (id: string) => {
    const updatedLevels = levels.filter((l) => l.id !== id)
    onUpdate(updatedLevels)
  }

  const handleAddLevel = () => {
    const newLevel: ScoringLevel = {
      id: generateLevelId(),
      level: `Level ${levels.length + 1}`,
      description: '',
      maxScore: 10,
      minScore: 5
    }
    onUpdate([...levels, newLevel])
  }

  return (
    <table className='w-full text-xs'>
      <thead className='bg-gray-200 border-b'>
        <tr>
          <th className='px-6 py-3 text-left font-semibold text-gray-700 w-40'>Level</th>
          <th className='px-6 py-3 text-center font-semibold text-gray-700 w-28'>Min</th>
          <th className='px-6 py-3 text-center font-semibold text-gray-700 w-28'>Max</th>
          <th className='px-6 py-3 text-left font-semibold text-gray-700 flex-1'>Description</th>
        </tr>
      </thead>
      <tbody>
        {levels.map((scoreLevel) => (
          <tr key={scoreLevel.id} className='border-b hover:bg-gray-100'>
            <td className='px-6 py-4 font-medium text-gray-700'>
              <div className='flex items-center gap-2'>
                <Input
                  type='text'
                  value={scoreLevel.level}
                  onChange={(e) => handleLevelChange(scoreLevel.id, 'level', e.target.value)}
                  placeholder='Level name'
                  className='bg-white border border-gray-300 text-sm py-1 w-full'
                  aria-label={`Level name for ${scoreLevel.level || 'scoring level'}`}
                />
              </div>
            </td>
            <td className='px-6 py-4'>
              <Input
                type='number'
                min={0}
                max={10}
                value={scoreLevel.minScore}
                onChange={(e) =>
                  handleLevelChange(scoreLevel.id, 'minScore', Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))
                }
                placeholder='0'
                className='bg-white border border-gray-300 text-center text-base py-2'
                aria-label={`Minimum score for ${scoreLevel.level || 'level'}`}
              />
            </td>
            <td className='px-6 py-4'>
              <Input
                type='number'
                min={0}
                max={10}
                value={scoreLevel.maxScore}
                onChange={(e) =>
                  handleLevelChange(scoreLevel.id, 'maxScore', Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))
                }
                placeholder='0'
                className='bg-white border border-gray-300 text-center text-base py-2'
                aria-label={`Maximum score for ${scoreLevel.level || 'level'}`}
              />
            </td>
            <td className='px-6 py-4'>
              <div className='flex gap-2'>
                <Textarea
                  value={scoreLevel.description}
                  onChange={(e) => handleLevelChange(scoreLevel.id, 'description', e.target.value)}
                  placeholder={`Enter description for ${scoreLevel.level}...`}
                  rows={2}
                  className='bg-white text-sm border border-gray-300 flex-1'
                  aria-label={`Description for ${scoreLevel.level || 'level'}`}
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => handleDeleteLevel(scoreLevel.id)}
                  className='text-red-600 hover:text-red-700 hover:bg-red-50'
                  disabled={levels.length <= 1}
                  title='Delete this level'
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>
            </td>
          </tr>
        ))}
        <tr className='bg-gray-50 hover:bg-gray-100'>
          <td colSpan={4} className='px-6 py-3 text-center'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleAddLevel}
              className='text-blue-600 hover:text-blue-700'
            >
              <Plus className='h-4 w-4 mr-2' />
              Add Level
            </Button>
          </td>
        </tr>
      </tbody>
    </table>
  )
}
