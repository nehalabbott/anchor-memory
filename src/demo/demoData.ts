import type { MemoryItem, SupportedPerson } from '@/lib/types'

/** Entirely fictional data for demonstrations. Never treat this as real patient information. */
export const DEMO_PERSON: SupportedPerson = {
  id: 'fictional-demo-person',
  name: 'Margaret',
  personalDetails: [
    'Lives in Bengaluru with her family and enjoys the comfort of familiar routines',
    'Loves temple mornings, school stories, and time with her children and grandchildren',
    'Likes hearing about work, college, friends, and the household rhythm of everyday life',
  ],
  createdAt: 1,
  updatedAt: 1,
}

export const DEMO_MEMORIES: MemoryItem[] = [
  {
    id: 'fictional-demo-anita', kind: 'person', name: 'Anita', relationship: 'daughter',
    story: 'Anita calls Margaret every Sunday morning after the temple visit, and they talk about the week while sharing a hot cup of chai.',
    people: ['Anita', 'Margaret'], activities: ['talking', 'sharing chai', 'temple visit'], places: ['Bengaluru', 'home', 'temple'], objects: ['chai cup', 'prayer beads'],
    photo: { id: '/demo/anita.svg', kind: 'photo', storage: 'remote', mimeType: 'image/svg+xml', altText: 'Fictional portrait of Anita' },
    createdAt: 1,
  },
  {
    id: 'fictional-demo-rahul', kind: 'person', name: 'Rahul', relationship: 'grandchild',
    story: 'Rahul and Margaret watered the marigolds together in the courtyard before he left for college, laughing when the soil got onto his shoes.',
    people: ['Rahul', 'Margaret'], activities: ['gardening', 'laughing', 'going to college'], places: ['courtyard', 'college gate'], objects: ['watering can', 'marigold plants', 'sandals'],
    photo: { id: '/demo/rahul.svg', kind: 'photo', storage: 'remote', mimeType: 'image/svg+xml', altText: 'Fictional portrait of Rahul' },
    createdAt: 2,
  },
  {
    id: 'fictional-demo-nisha', kind: 'person', name: 'Nisha', relationship: 'friend',
    story: 'Nisha and Margaret met after the evening walk and sat together on the veranda sharing mangoes and stories from their school days.',
    people: ['Nisha', 'Margaret'], activities: ['walking', 'sharing fruit', 'remembering school'], places: ['veranda', 'school lane'], objects: ['mangoes', 'straw basket'],
    photo: { id: '/demo/nisha.svg', kind: 'photo', storage: 'remote', mimeType: 'image/svg+xml', altText: 'Fictional portrait of Nisha' },
    createdAt: 3,
  },
  {
    id: 'fictional-demo-suresh', kind: 'person', name: 'Suresh', relationship: 'spouse',
    story: 'Margaret and Suresh often sat together in the evening, listening to old songs and talking about the family while the children played outside.',
    people: ['Margaret', 'Suresh'], activities: ['listening to music', 'talking', 'family time'], places: ['living room', 'balcony'], objects: ['radio', 'tea set'],
    createdAt: 4,
  },
  {
    id: 'fictional-demo-meera', kind: 'person', name: 'Meera', relationship: 'daughter',
    story: 'Meera came home from the school office with her lunch box and a notebook full of art projects, and Margaret always asked about her day.',
    people: ['Margaret', 'Meera'], activities: ['school pickup', 'talking', 'making notes'], places: ['school', 'home'], objects: ['lunch box', 'notebook', 'color pencils'],
    createdAt: 5,
  },
  {
    id: 'fictional-demo-rani', kind: 'person', name: 'Rani', relationship: 'other',
    story: 'Rani cleaned the courtyard every morning and left a little smile behind with the flower pots and fresh broom marks across the steps.',
    people: ['Margaret', 'Rani'], activities: ['cleaning', 'flower care'], places: ['courtyard', 'front steps'], objects: ['broom', 'flower pots'],
    createdAt: 6,
  },
  {
    id: 'fictional-demo-shimla', kind: 'event', name: 'A family trip to Shimla',
    story: 'The family took a train to Shimla, walked through the cedar hills, and took photographs while Suresh bought warm tea and bun masks for everyone.',
    people: ['Margaret', 'Suresh', 'Anita', 'Rahul'], places: ['Shimla', 'railway station', 'cedar garden'], activities: ['train trip', 'walking', 'taking photographs', 'sharing tea'], objects: ['camera', 'picnic basket', 'tea thermos'],
    events: [
      { id: 'fictional-demo-trip-1', title: 'Packed a picnic basket', sequenceOrder: 1, objects: ['picnic basket'] },
      { id: 'fictional-demo-trip-2', title: 'Travelled by train to Shimla', sequenceOrder: 2, place: 'railway station', activity: 'train trip' },
      { id: 'fictional-demo-trip-3', title: 'Walked through the cedar trees', sequenceOrder: 3, place: 'cedar garden', activity: 'walking' },
      { id: 'fictional-demo-trip-4', title: 'Took photographs together', sequenceOrder: 4, activity: 'taking photographs', objects: ['camera'] },
    ],
    createdAt: 7,
  },
  {
    id: 'fictional-demo-temple', kind: 'place', name: 'Malleswaram Temple mornings',
    story: 'Before the heat rose, Margaret and the family walked to the temple with flowers in a basket and stood quietly while the bells rang across the lane.',
    people: ['Margaret', 'Suresh', 'Anita', 'Rahul'], places: ['Malleswaram Temple', 'temple lane'], activities: ['praying', 'walking', 'flower offering'], objects: ['flowers', 'basket', 'bell'],
    createdAt: 8,
  },
  {
    id: 'fictional-demo-school', kind: 'place', name: 'School drop-offs and pickup',
    story: 'The mornings were full of school bags, lunch boxes, and chatter as Margaret waited by the gate while the children hurried to class.',
    people: ['Margaret', 'Meera', 'Rahul'], places: ['school gate', 'playground'], activities: ['drop-off', 'pickup', 'waiting'], objects: ['school bag', 'lunch box', 'water bottle'],
    createdAt: 9,
  },
  {
    id: 'fictional-demo-college', kind: 'event', name: 'College reunion day',
    story: 'On the college reunion afternoon, Margaret met old classmates in the courtyard and laughed over old test papers and hostel stories.',
    people: ['Margaret', 'Nisha', 'friends'], places: ['college campus', 'courtyard'], activities: ['reunion', 'sharing memories', 'laughing'], objects: ['old yearbooks', 'coffee cups'],
    createdAt: 10,
  },
  {
    id: 'fictional-demo-work', kind: 'activity', name: 'Office lunch at the office canteen',
    story: 'Margaret enjoyed the office canteen lunches with her colleagues, where they swapped stories, solved little problems, and ate warm rice and sambar together.',
    people: ['Margaret', 'colleagues'], places: ['office canteen', 'workplace'], activities: ['lunch', 'sharing stories'], objects: ['steel lunchbox', 'sambar bowl', 'rice'],
    createdAt: 11,
  },
  {
    id: 'fictional-demo-garden', kind: 'activity', name: 'Gardening together',
    story: 'Margaret enjoyed tending the garden with her family in the late afternoon while the children ran around the neem tree and picked flowers for the prayer room.',
    people: ['Margaret', 'Anita', 'Rahul', 'Meera'], places: ['courtyard', 'prayer room', 'garden'], activities: ['gardening', 'flower picking'], objects: ['watering can', 'marigolds', 'flowerpot', 'neem leaves'],
    createdAt: 12,
  },
  {
    id: 'fictional-demo-birthday', kind: 'event', name: 'A family birthday celebration',
    story: 'Everyone gathered for tea and a homemade cake to celebrate, and the children danced around the table while the grandchildren sang and laughed.',
    people: ['Margaret', 'Anita', 'Rahul', 'Meera', 'Suresh'], activities: ['having tea', 'celebrating', 'singing'], objects: ['homemade cake', 'teapot', 'mangoes', 'apples', 'flower garland'],
    events: [
      { id: 'fictional-demo-birthday-1', title: 'Family arrived for tea', sequenceOrder: 1 },
      { id: 'fictional-demo-birthday-2', title: 'Tea was poured and stories began', sequenceOrder: 2, objects: ['teapot'] },
      { id: 'fictional-demo-birthday-3', title: 'Everyone sang and shared the cake', sequenceOrder: 3, objects: ['homemade cake'] },
    ],
    createdAt: 13,
  },
]

export function demoMemoriesFor(personName: string): MemoryItem[] {
  const replaceName = (value: string) => value.split(DEMO_PERSON.name).join(personName)

  return DEMO_MEMORIES.map((memory) => ({
    ...memory,
    story: replaceName(memory.story),
    people: memory.people?.map(replaceName),
    events: memory.events?.map((event) => ({
      ...event,
      title: replaceName(event.title),
      story: event.story ? replaceName(event.story) : undefined,
      people: event.people?.map(replaceName),
    })),
  }))
}