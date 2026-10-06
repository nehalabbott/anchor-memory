import type { MediaKind, MediaReference, MediaRepository } from '@/lib/types'

const DATABASE_NAME = 'anchor-media-v1'
const OBJECT_STORE = 'media'

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Media storage request failed.'))
  })
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is unavailable.'))
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(OBJECT_STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open media storage.'))
    request.onblocked = () => reject(new Error('Media storage upgrade is blocked by another open tab.'))
  })
}

const newId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 12)

/** IndexedDB implementation behind the app's opaque MediaReference boundary. */
export class IndexedDbMediaRepository implements MediaRepository {
  async save(blob: Blob, kind: MediaKind, altText?: string): Promise<MediaReference> {
    const id = newId()
    const database = await openDatabase()
    const transaction = database.transaction(OBJECT_STORE, 'readwrite')
    await requestResult(transaction.objectStore(OBJECT_STORE).put(blob, id))
    database.close()
    return { id, kind, storage: 'indexeddb', mimeType: blob.type || 'application/octet-stream', altText }
  }

  async resolve(reference: MediaReference): Promise<Blob | null> {
    if (reference.storage !== 'indexeddb') return null
    const database = await openDatabase()
    const blob = await requestResult(database.transaction(OBJECT_STORE, 'readonly').objectStore(OBJECT_STORE).get(reference.id))
    database.close()
    return blob instanceof Blob ? blob : null
  }

  async remove(reference: MediaReference): Promise<void> {
    if (reference.storage !== 'indexeddb') return
    const database = await openDatabase()
    const transaction = database.transaction(OBJECT_STORE, 'readwrite')
    await requestResult(transaction.objectStore(OBJECT_STORE).delete(reference.id))
    database.close()
  }
}

export const mediaRepository: MediaRepository = new IndexedDbMediaRepository()