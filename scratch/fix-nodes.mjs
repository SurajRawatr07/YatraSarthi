import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
config({ path: 'apps/web/.env' });

async function fix() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("No MongoDB URI, assuming file fallback.");
    return;
  }
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const nodes = await db.collection('nodes').find({}).toArray();
  
  let fixed = 0;
  for (const n of nodes) {
    let changed = false;
    const update = {};
    if (typeof n.label === 'object' && n.label !== null && 'value' in n.label) {
      update.label = n.label.value;
      changed = true;
    }
    if (typeof n.vendor === 'object' && n.vendor !== null && 'value' in n.vendor) {
      update.vendor = n.vendor.value;
      changed = true;
    }
    if (typeof n.time === 'object' && n.time !== null && 'value' in n.time) {
      update.time = n.time.value;
      changed = true;
    }
    
    if (changed) {
      await db.collection('nodes').updateOne({ _id: n._id }, { $set: update });
      fixed++;
    }
  }
  console.log(`Fixed ${fixed} corrupted nodes.`);
  await client.close();
}
fix().catch(console.error);
