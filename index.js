const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const admin = require("firebase-admin");
const serviceAccount = require("./skillverse-firebase-adminsdk.json");
const app = express();
const port = process.env.PORT || 3000;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Middleware
app.use(cors());
app.use(express.json());

const verifyFirebaseToken = async (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = req.headers.authorization.split(" ")[1];
  try {
    const userInfo = await admin.auth().verifyIdToken(token);
    req.token_email = userInfo.email;
    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
};

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
    app.get("/popularCourses", async (req, res) => {
      const query = { isFeatured: true };
      const cursor = courseCollection.find(query).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/courses/:id", verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await courseCollection.findOne(query);
      res.send(result);
    });
    app.get("/filteredCourses", async (req, res) => {
      const category = req.query.category;
      const query = {category : category}
      const cursor = courseCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.post("/courses", async (req, res) => {
      const newCourse = req.body;
      const result = await courseCollection.insertOne(newCourse);
      res.send(result);
    })
    app.patch("/courses/:id", async (req, res) => {
      const id = req.params.id;
      const updatedCourse = req.body;
      const query = {_id : new ObjectId(id)};
      const update = {
        $set : {
          title : updatedCourse.title,
          image : updatedCourse.image,
          price : updatedCourse.price,
          duration : updatedCourse.duration,
          category : updatedCourse.category,
          description : updatedCourse.description,
          isFeatured : updatedCourse.isFeatured,
        }
      }
      const result = await courseCollection.updateOne(query, update);
      res.send(result);
    })
    app.get("/myCourses", verifyFirebaseToken, async (req, res) => {
      const email = req.query.email;
      const query = {};
      if(email){
        if(req.token_email !== email){
          return res.status(403).send({message : "Forbidden Access"});
        }
        query.added_by = email;
      }
      const cursor = courseCollection.find(query);
      const result = await cursor.toArray();
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
