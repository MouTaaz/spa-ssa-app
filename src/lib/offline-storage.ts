// IndexedDB utilities for offline data persistence
const DB_NAME = "ssa-app-db"
const DB_VERSION = 1
const STORE_NAME = "appointments"

let db: IDBDatabase | null = null

export async function initializeDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" })
      }
    }
  })
}

export async function saveAppointmentOffline(appointment: any): Promise<void> {
  if (!db) await initializeDB()

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readwrite")
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(appointment)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function getOfflineAppointments(): Promise<any[]> {
  if (!db) await initializeDB()

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readonly")
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

export async function deleteOfflineAppointment(id: string): Promise<void> {
  if (!db) await initializeDB()

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readwrite")
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function clearOfflineData(): Promise<void> {
  if (!db) await initializeDB()

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readwrite")
    const store = transaction.objectStore(STORE_NAME)
    const request = store.clear()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}
