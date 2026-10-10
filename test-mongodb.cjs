
const { MongoClient } = require("mongodb");

async function testConnection() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("MONGODB_URI is missing from .env.local");
    process.exitCode = 1;
    return;
  }

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  try {
    await client.connect();
    await client.db("sapnakriti").command({ ping: 1 });
    console.log("SUCCESS: Connected to MongoDB Atlas!");
  } catch (error) {
    console.error("MongoDB connection failed:", error.name);
    console.error(error.message);
    if (error.cause) console.error("Cause:", error.cause.message);
    process.exitCode = 1;
  } finally {
    await client.close().catch(() => {});
  }
}

testConnection();
