import { openDB, IDBPDatabase } from 'idb';
import type { Task } from './types';

const DB_NAME = 'svampbase';
const DB_VERSION = 1;
const STORE_NAME = 'tasks';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllTasks(): Promise<Task[]> {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function getTask(id: string): Promise<Task | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function putTask(task: Task): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, task);
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function clearAllTasks(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}
