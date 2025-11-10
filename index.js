const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.z1gnsog.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

app.get("/", (req, res) => {
  res.send("SkillVerse server is running.");
});

async function run() {
  try {
    await client.connect();

    const coursesDB = client.db("coursesDB");
    const courseCollection = coursesDB.collection("courses");

    app.get("/courses", async (req, res) => {
      const cursor = courseCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/courses/:id", async (req, res) => {
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const result = await courseCollection.findOne(query);
      res.send(result);
    })

    await client.db("admin").command({ ping: 1 });
    console.log(
      "✅ Pinged your deployment. Yor are successfully connected to MongoDB!"
    );
  } finally {
    // Optionally close the client when needed
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`SkillVerse Server running on port: ${port}`);
});