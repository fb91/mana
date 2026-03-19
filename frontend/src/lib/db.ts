import { openDB, DBSchema } from 'idb'

interface ManaDB extends DBSchema {
  'chat-history': {
    key: string
    value: {
      id: string
      messages: Array<{ role: string; content: string }>
      updatedAt: number
    }
  }
  'novenas-activas': {
    key: number
    value: {
      id: number
      novenaId: number
      diaActual: number
      horaNotificacion: string
      iniciadoAt: number
    }
  }
  'preferences': {
    key: string
    value: string | boolean | number
  }
}

const DB_NAME = 'mana-db'
const DB_VERSION = 1

export const getDB = () =>
  openDB<ManaDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('chat-history', { keyPath: 'id' })
      db.createObjectStore('novenas-activas', { keyPath: 'id' })
      db.createObjectStore('preferences')
    },
  })

export const saveChatHistory = async (id: string, messages: Array<{ role: string; content: string }>) => {
  const db = await getDB()
  await db.put('chat-history', { id, messages, updatedAt: Date.now() })
}

export const getChatHistory = async (id: string) => {
  const db = await getDB()
  return db.get('chat-history', id)
}

export const clearChatHistory = async (id: string) => {
  const db = await getDB()
  await db.delete('chat-history', id)
}

export const getPreference = async (key: string) => {
  const db = await getDB()
  return db.get('preferences', key)
}

export const setPreference = async (key: string, value: string | boolean | number) => {
  const db = await getDB()
  await db.put('preferences', value, key)
}
