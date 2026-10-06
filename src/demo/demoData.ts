import type { MemoryItem, SupportedPerson } from '@/lib/types'

/** Entirely fictional data for demonstrations. Never treat this as real patient information. */
export const DEMO_PERSON: SupportedPerson = {
  id: 'fictional-demo-person',
  name: 'Margaret',
  personalDetails: ['Enjoys gardening and family stories', 'Likes a gentle, unhurried pace'],
  createdAt: 1,
  updatedAt: 1,
}

export const DEMO_MEMORIES: MemoryItem[] = [
  {
    id: 'fictional-demo-anita', kind: 'person', name: 'Anita', relationship: 'daughter',
    story: 'Anita calls Margaret on Sunday mornings and they talk about the garden.',
    people: ['Anita', 'Margaret'], activities: ['talking', 'gardening'], objects: ['watering can'],
    photo: { id: '/demo/anita.svg', kind: 'photo', storage: 'remote', mimeType: 'image/svg+xml', altText: 'Fictional portrait of Anita' },
    createdAt: 1,
  },
  {
    id: 'fictional-demo-rahul', kind: 'person', name: 'Rahul', relationship: 'grandchild',
    story: 'Rahul and Margaret planted marigolds together in the garden.',
    people: ['Rahul', 'Margaret'], activities: ['gardening'], places: ['the garden'], objects: ['marigold seeds'],
    photo: { id: '/demo/rahul.svg', kind: 'photo', storage: 'remote', mimeType: 'image/svg+xml', altText: 'Fictional portrait of Rahul' },
    createdAt: 2,
  },
  {
    id: 'fictional-demo-nisha', kind: 'person', name: 'Nisha', relationship: 'friend',
    story: 'Nisha and Margaret enjoyed sharing tea after their afternoon walk.',
    people: ['Nisha', 'Margaret'], activities: ['walking', 'sharing tea'], places: ['the garden'], objects: ['teapot', 'mangoes'],
    photo: { id: '/demo/nisha.svg', kind: 'photo', storage: 'remote', mimeType: 'image/svg+xml', altText: 'Fictional portrait of Nisha' },
    createdAt: 3,
  },
  {
    id: 'fictional-demo-shimla', kind: 'event', name: 'A family trip to Shimla',
    story: 'The family took a train to Shimla, walked among the cedar trees, and took photographs together.',
    people: ['Anita', 'Rahul', 'Margaret'], places: ['Shimla', 'cedar garden'], activities: ['train trip', 'walking', 'taking photographs'], objects: ['camera', 'picnic basket'],
    events: [
      { id: 'fictional-demo-trip-1', title: 'Packed a picnic basket', sequenceOrder: 1, objects: ['picnic basket'] },
      { id: 'fictional-demo-trip-2', title: 'Rode the train to Shimla', sequenceOrder: 2, place: 'Shimla', activity: 'train trip' },
      { id: 'fictional-demo-trip-3', title: 'Walked among the cedar trees', sequenceOrder: 3, place: 'cedar garden', activity: 'walking' },
      { id: 'fictional-demo-trip-4', title: 'Took photographs together', sequenceOrder: 4, activity: 'taking photographs', objects: ['camera'] },
    ],
    createdAt: 4,
  },
  {
    id: 'fictional-demo-garden', kind: 'activity', name: 'Gardening together',
    story: 'Margaret enjoyed tending the garden with her family in the afternoon.',
    people: ['Anita', 'Rahul'], places: ['the garden'], activities: ['gardening'], objects: ['watering can', 'marigolds', 'flowerpot'],
    createdAt: 5,
  },
  {
    id: 'fictional-demo-birthday', kind: 'event', name: 'A family birthday celebration',
    story: 'Everyone gathered for tea and a homemade cake to celebrate together.',
    people: ['Anita', 'Rahul', 'Nisha'], activities: ['having tea', 'celebrating'], objects: ['homemade cake', 'teapot', 'mangoes', 'apples'],
    events: [
      { id: 'fictional-demo-birthday-1', title: 'Family arrived for tea', sequenceOrder: 1 },
      { id: 'fictional-demo-birthday-2', title: 'Tea was poured', sequenceOrder: 2, objects: ['teapot'] },
      { id: 'fictional-demo-birthday-3', title: 'Everyone shared the cake', sequenceOrder: 3, objects: ['homemade cake'] },
    ],
    createdAt: 6,
  },
]