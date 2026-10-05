import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://hm0801:Harsh0801@hm-cluster.czl8van.mongodb.net/yatrasarthi?appName=HM-Cluster";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db('yatrasarthi');
    const users = db.collection('users');

    const phone = "+919075425848";
    
    // Upsert the user
    const result = await users.updateOne(
      { phone },
      {
        $set: {
          name: "Tanvi",
          phone: phone,
          whatsappOptIn: true,
          emergencyContacts: [
            {
              id: "ec_" + Date.now(),
              name: "Emergency Contact",
              phone: "+918898788663",
              deliveryMethod: "sms"
            }
          ],
          updatedAt: new Date().toISOString()
        },
        $setOnInsert: {
          id: "usr_" + Date.now(),
          createdAt: new Date().toISOString(),
          notificationPrefs: {
            disruptionAlerts: "on",
            phantomWarnings: true,
            paymentRequests: true,
            groupActivity: true
          },
          subscription: { tier: "free" }
        }
      },
      { upsert: true }
    );

    console.log("Upserted user:", result);
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
