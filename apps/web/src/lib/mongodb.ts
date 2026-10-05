import { MongoClient, ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/yatrasarthi';
const options = {
  serverSelectionTimeoutMS: 2000,
  connectTimeoutMS: 2000,
};

// In-memory / file-persisted fallback storage when local MongoDB daemon is not running
const STORAGE_FILE = path.resolve(process.cwd(), '.dev-db.json');

function loadStorage(): Record<string, any[]> {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Could not read fallback db storage:', e);
  }
  return { users: [], trips: [], nodes: [], edges: [], actions: [], payments: [], events: [] };
}

function saveStorage(data: Record<string, any[]>) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not write fallback db storage:', e);
  }
}

let memoryStorage = loadStorage();

function matchesQuery(doc: any, query: Record<string, any>): boolean {
  if (!query || Object.keys(query).length === 0) return true;

  for (const [key, val] of Object.entries(query)) {
    if (key === '$or' && Array.isArray(val)) {
      const anyMatch = val.some(subQ => matchesQuery(doc, subQ));
      if (!anyMatch) return false;
      continue;
    }

    if (key === '_id') {
      const docId = doc._id ? doc._id.toString() : doc.id;
      const targetId = val instanceof ObjectId ? val.toString() : val?.toString();
      if (typeof val === 'object' && val?.$in && Array.isArray(val.$in)) {
        const inTargets = val.$in.map((v: any) => v.toString());
        if (!inTargets.includes(docId)) return false;
      } else if (docId !== targetId) {
        return false;
      }
      continue;
    }

    const docVal = doc[key];
    if (typeof val === 'object' && val !== null) {
      if (val.$gte !== undefined && docVal < val.$gte) return false;
      if (val.$lt !== undefined && docVal >= val.$lt) return false;
      if (val.$in !== undefined && Array.isArray(val.$in)) {
        if (!val.$in.includes(docVal)) return false;
      }
    } else {
      if (docVal !== val) return false;
    }
  }
  return true;
}

class FallbackCollection {
  name: string;

  constructor(name: string) {
    this.name = name;
    if (!memoryStorage[name]) {
      memoryStorage[name] = [];
    }
  }

  async findOne(query: Record<string, any>) {
    const list = memoryStorage[this.name] || [];
    const found = list.find(doc => matchesQuery(doc, query));
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  find(query: Record<string, any> = {}) {
    let list = (memoryStorage[this.name] || []).filter(doc => matchesQuery(doc, query));
    let sortKey: string | null = null;
    let sortOrder = 1;

    const cursor = {
      sort: (sortObj: Record<string, number>) => {
        const [k, v] = Object.entries(sortObj)[0] || [];
        if (k) {
          sortKey = k;
          sortOrder = v;
        }
        return cursor;
      },
      toArray: async () => {
        let result = [...list];
        if (sortKey) {
          result.sort((a, b) => {
            const valA = a[sortKey!];
            const valB = b[sortKey!];
            if (valA < valB) return -sortOrder;
            if (valA > valB) return sortOrder;
            return 0;
          });
        }
        return JSON.parse(JSON.stringify(result));
      },
    };
    return cursor;
  }

  async insertOne(doc: any) {
    const _id = doc._id || new ObjectId();
    const newDoc = { ...doc, _id: _id.toString() };
    memoryStorage[this.name].push(newDoc);
    saveStorage(memoryStorage);
    return { insertedId: _id };
  }

  async updateOne(filter: Record<string, any>, update: Record<string, any>) {
    const list = memoryStorage[this.name] || [];
    const idx = list.findIndex(doc => matchesQuery(doc, filter));
    if (idx !== -1) {
      const doc = { ...list[idx] };
      if (update.$set) {
        Object.assign(doc, update.$set);
      }
      if (update.$inc) {
        for (const [k, v] of Object.entries(update.$inc)) {
          doc[k] = (doc[k] || 0) + (v as number);
        }
      }
      if (update.$addToSet) {
        for (const [k, v] of Object.entries(update.$addToSet)) {
          if (!Array.isArray(doc[k])) doc[k] = [];
          if (!doc[k].includes(v)) doc[k].push(v);
        }
      }
      if (update.$pull) {
        for (const [k, v] of Object.entries(update.$pull)) {
          if (Array.isArray(doc[k])) {
            doc[k] = doc[k].filter((item: any) => item !== v);
          }
        }
      }
      list[idx] = doc;
      saveStorage(memoryStorage);
      return { matchedCount: 1, modifiedCount: 1 };
    }
    return { matchedCount: 0, modifiedCount: 0 };
  }

  async deleteOne(filter: Record<string, any>) {
    const list = memoryStorage[this.name] || [];
    const idx = list.findIndex(doc => matchesQuery(doc, filter));
    if (idx !== -1) {
      list.splice(idx, 1);
      saveStorage(memoryStorage);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  async deleteMany(filter: Record<string, any>) {
    const beforeLen = (memoryStorage[this.name] || []).length;
    memoryStorage[this.name] = (memoryStorage[this.name] || []).filter(doc => !matchesQuery(doc, filter));
    const deletedCount = beforeLen - memoryStorage[this.name].length;
    saveStorage(memoryStorage);
    return { deletedCount };
  }
}

class FallbackDb {
  collection(name: string) {
    return new FallbackCollection(name);
  }
}

class FallbackClient {
  db() {
    return new FallbackDb();
  }
}

// Connection manager
async function initClient(): Promise<any> {
  try {
    const realClient = new MongoClient(uri, options);
    await realClient.connect();
    console.log('✓ Connected to MongoDB');
    return realClient;
  } catch (err: any) {
    console.warn('⚠️ Local MongoDB server offline; using resilient file/in-memory fallback DB (.dev-db.json)');
    return new FallbackClient();
  }
}

let clientPromise: Promise<any>;

let globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<any>;
};

if (!globalWithMongo._mongoClientPromise) {
  globalWithMongo._mongoClientPromise = initClient();
}
clientPromise = globalWithMongo._mongoClientPromise;

export default clientPromise;
