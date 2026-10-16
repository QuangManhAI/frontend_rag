import type { ChatMessage } from '../src/types/rag';

const DATABASE_NAME = 'scientific-rag-chat';
const DATABASE_VERSION = 1;
const STORE_NAME = 'conversations';
const CURRENT_RECORD_KEY = 'current';

export interface ChatConversationRecord {
  version: number;
  updatedAt: string;
  messages: ChatMessage[];
}

function getIndexedDb(): IDBFactory {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is unavailable in this browser');
  }

  return indexedDB;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<ChatMessage>;

  return (
    typeof message.id === 'string' &&
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string' &&
    typeof message.timestamp === 'string'
  );
}

function parseRecord(value: unknown): ChatConversationRecord {
  if (!value || typeof value !== 'object') {
    throw new Error('Stored chat conversation is malformed');
  }

  const record = value as Partial<ChatConversationRecord>;
  if (
    record.version !== DATABASE_VERSION ||
    typeof record.updatedAt !== 'string' ||
    !Array.isArray(record.messages) ||
    !record.messages.every(isChatMessage)
  ) {
    throw new Error('Stored chat conversation is malformed or incompatible');
  }

  return {
    version: record.version,
    updatedAt: record.updatedAt,
    messages: record.messages,
  };
}

function openDatabase(): Promise<IDBDatabase> {
  const request = getIndexedDb().open(DATABASE_NAME, DATABASE_VERSION);

  return new Promise((resolve, reject) => {
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open chat storage'));
    request.onblocked = () => reject(new Error('Chat storage upgrade is blocked'));
  });
}

function closeAfter<T>(database: IDBDatabase, operation: Promise<T>): Promise<T> {
  return operation.finally(() => database.close());
}

export async function loadConversation(): Promise<ChatMessage[]> {
  const database = await openDatabase();
  const operation = new Promise<ChatMessage[]>((resolve, reject) => {
    const request = database
      .transaction(STORE_NAME, 'readonly')
      .objectStore(STORE_NAME)
      .get(CURRENT_RECORD_KEY);

    request.onsuccess = () => {
      if (request.result === undefined) {
        resolve([]);
        return;
      }

      resolve(parseRecord(request.result).messages);
    };
    request.onerror = () => reject(request.error ?? new Error('Failed to load chat history'));
  });

  return closeAfter(database, operation);
}

export async function saveConversation(messages: ChatMessage[]): Promise<void> {
  if (!Array.isArray(messages) || !messages.every(isChatMessage)) {
    throw new Error('Cannot save malformed chat conversation');
  }

  const database = await openDatabase();
  const record: ChatConversationRecord = {
    version: DATABASE_VERSION,
    updatedAt: new Date().toISOString(),
    messages,
  };
  const operation = new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(record, CURRENT_RECORD_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Failed to save chat history'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Chat history save was aborted'));
  });

  return closeAfter(database, operation);
}

export async function clearConversation(): Promise<void> {
  const database = await openDatabase();
  const operation = new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(CURRENT_RECORD_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Failed to clear chat history'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Chat history clear was aborted'));
  });

  return closeAfter(database, operation);
}
