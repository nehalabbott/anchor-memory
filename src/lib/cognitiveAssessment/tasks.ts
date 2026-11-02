/** Contains instructions and answer material for each check-in task. */
import type { AssessmentDomain } from './engine'

export interface AssessmentPrompt {
  id: string
  domain: AssessmentDomain
  title: string
  instruction: string
  answer: string
  helper: string
  choices?: string[]
  items?: string[]
  sequence?: string[]
}

export const ASSESSMENT_PROMPTS: AssessmentPrompt[] = [
  {
    id: 'clock', domain: 'visuospatial', title: 'A gentle clock drawing',
    instruction: 'Please draw a clock. Put the hands on the clock to show 10 minutes past 10. Take your time.',
    answer: 'clock-10-past-10', helper: 'A clock is available to help, but you can draw it in your own way.',
  },
  {
    id: 'cube', domain: 'visuospatial', title: 'A simple cube drawing',
    instruction: 'Please draw a cube. You can use a light line or a familiar shape.',
    answer: 'cube-drawn', helper: 'The drawing does not need to be perfect. A simple cube shape is enough.',
  },
  {
    id: 'naming', domain: 'naming', title: 'Name familiar things',
    instruction: 'Look at each picture and type the object names you recognize, separated by commas.',
    answer: 'chair, flower, window, cup', helper: 'A partial answer is fine.',
    choices: ['chair', 'flower', 'window', 'cup'],
  },
  {
    id: 'memory', domain: 'memory', title: 'A short memory list',
    instruction: 'Remember these three words: garden, sun, bread. We will return to them after the other tasks.',
    answer: 'garden,sun,bread', helper: 'The words are shown now so you can take your time.',
    items: ['garden', 'sun', 'bread'],
  },
  {
    id: 'attention', domain: 'attention', title: 'A digit span',
    instruction: 'Remember the number shown. You can hide it when you are ready to type it back.',
    answer: '6428', helper: 'You may take as long as you need. Try the number in the order shown.',
  },
  {
    id: 'language', domain: 'language', title: 'A language repetition check-in',
    instruction: 'Read the sentence shown. Hide it when you are ready, then type it from memory.',
    answer: 'the garden is quiet today', helper: 'Exact wording is not essential. A close answer is fine.',
  },
  {
    id: 'orientation', domain: 'orientation', title: 'A calm orientation check-in',
    instruction: 'Please tell us the date, month, year, day, and place you are in.',
    answer: 'date,month,year,day,place', helper: 'It is okay to use the calendar or a familiar place name.',
  },
]

export const NAMING_OBJECTS = [
  { label: 'chair', image: 'chair' },
  { label: 'flower', image: 'flower' },
  { label: 'window', image: 'window' },
  { label: 'cup', image: 'cup' },
]

export const MEMORY_WORDS = ['garden', 'sun', 'bread']
export const ATTENTION_DIGITS = '6428'
export const LANGUAGE_SENTENCE = 'The garden is quiet today.'
