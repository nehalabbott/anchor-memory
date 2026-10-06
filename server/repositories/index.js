import { createPersonRepository } from './personRepository.js'
import { createPreferencesRepository } from './preferencesRepository.js'
import { createMemoryRepository } from './memoryRepository.js'
import { createSessionRepository } from './sessionRepository.js'
import { createEventRepository } from './eventRepository.js'
import { createAssessmentRepository } from './assessmentRepository.js'
import { createAuthRepository } from './authRepository.js'

export function createRepositories(database) {
  return {
    auth: createAuthRepository(database),
    person: createPersonRepository(database),
    preferences: createPreferencesRepository(database),
    memories: createMemoryRepository(database),
    sessions: createSessionRepository(database),
    events: createEventRepository(database),
    assessments: createAssessmentRepository(database),
  }
}
