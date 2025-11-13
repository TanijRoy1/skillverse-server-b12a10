const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const admin = require("firebase-admin");
const app = express();
const port = process.env.PORT || 3000;

const decoded = Buffer.from(process.env.FIREBASE_SERVICE_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);

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
    // await client.connect();

    const coursesDB = client.db("coursesDB");
    const courseCollection = coursesDB.collection("courses");
    const enrolledCollection = coursesDB.collection("enrolled");
    const reviewCollection = coursesDB.collection("reviews");

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
    app.get("/courses/:id",verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await courseCollection.findOne(query);
      res.send(result);
    });
    app.get("/filteredCourses", async (req, res) => {
      const category = req.query.category;
      const query = { category: category };
      const cursor = courseCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.post("/courses", verifyFirebaseToken, async (req, res) => {
      const newCourse = req.body;
      const result = await courseCollection.insertOne(newCourse);
      res.send(result);
    });
    app.patch("/courses/:id", verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const updatedCourse = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          title: updatedCourse.title,
          image: updatedCourse.image,
          price: updatedCourse.price,
          duration: updatedCourse.duration,
          category: updatedCourse.category,
          description: updatedCourse.description,
          isFeatured: updatedCourse.isFeatured,
        },
      };
      const result = await courseCollection.updateOne(query, update);
      res.send(result);
    });
    app.get("/myCourses", verifyFirebaseToken, async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        if (req.token_email !== email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }
        query.instructorEmail = email;
      }
      const cursor = courseCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.post(
      "/myEnrolledCourses/:id",
      verifyFirebaseToken,
      async (req, res) => {
        const enrolledCourse = req.body;
        const existingCourse = await enrolledCollection.findOne({
          courseId : enrolledCourse.courseId,
          enrolled_by : enrolledCourse.enrolled_by
        });
        if(existingCourse){
          return res.send({message : "You’re already enrolled in this course — no need to enroll again."});
        }
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const update = {
          $inc: {
            enrollment: 1,
          },
        };
        const updatedenrollment = await courseCollection.updateOne(
          query,
          update
        );

        const result = await enrolledCollection.insertOne(enrolledCourse);
        res.send(result);
      }
    );
    app.get("/myEnrolledCourses", verifyFirebaseToken, async (req, res) => {
      const email = req.query.email;
      const query = {};
      if(email){
        if (req.token_email !== email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }
        query.enrolled_by = email;
      }
      const cursor = enrolledCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })
    app.delete("/myCourses/:id", verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const result = await courseCollection.deleteOne(query);
      res.send(result);
    })
    app.delete("/myEnrolledCourses/:id", verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const result = await enrolledCollection.deleteOne(query);
      res.send(result);
    })
    app.post("/reviews", verifyFirebaseToken, async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    })
    app.get("/reviews/:courseId", verifyFirebaseToken, async (req, res) => {
      const courseId = req.params.courseId;
      const query = {courseId : courseId};
      const cursor = reviewCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

    // await client.db("admin").command({ ping: 1 });
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
