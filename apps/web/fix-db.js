require('dotenv').config({path:'.env'});
const { MongoClient } = require('mongodb');

async function fix() {
  const c = new MongoClient(process.env.MONGODB_URI);
  await c.connect();
  const db = c.db();
  const nodes = await db.collection('nodes').find({}).toArray();
  let fixed = 0;
  for (const n of nodes) {
    let changed = false;
    let u = {};
    if (n.label && typeof n.label === 'object' && n.label.value) { u.label = n.label.value; changed = true; }
    if (n.vendor && typeof n.vendor === 'object' && n.vendor.value) { u.vendor = n.vendor.value; changed = true; }
    if (n.time && typeof n.time === 'object' && n.time.value) { u.time = n.time.value; changed = true; }
    if (changed) {
      await db.collection('nodes').updateOne({ _id: n._id }, { $set: u });
      fixed++;
    }
  }
  console.log('Fixed', fixed, 'corrupted nodes in DB.');
  await c.close();
}
fix().catch(console.error);
