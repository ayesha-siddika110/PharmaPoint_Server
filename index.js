const express = require('express');
const cors = require('cors');
require('dotenv').config()
var jwt = require('jsonwebtoken');
var morgan = require('morgan')


const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(morgan('dev'))


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.331jm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const db = client.db("PharmaPoint_DB")
    const usersCollections = db.collection("users")
    const productsCollections = db.collection("products")
    const categoryCollections = db.collection("category")
    const cartCollections = db.collection("cart")


    // //sent jwt 
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_Token, {
        expiresIn: '10h'
      })
      // console.log(token)
      res.send({ token })
    })
    //verifyToken midddleware
    const verifyToken = (req, res, next) => {
      // console.log('inside verifyToken ', req.headers.authorization)
      if (!req.headers.authorization) {
        return res.send(401).send({ message: 'unAuthorized access' })
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_Token, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unAuthorized access' })
        }
        req.decoded = decoded;
        next()
      })
    }

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollections.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    // get the users

    // app.get('/users',verifyToken,verifyAdmin, async (req, res) => {
    //   const result = await usersCollections.find().toArray()
    //   res.send(result)
    // })
    // app.get('/users/admin/:email', verifyToken,verifyAdmin, async (req, res) => {
    //   const email = req.params.email;
    //   if (email !== req.decoded.email) {
    //     return res.status(403).send({ message: 'forbidden access' })
    //   }

    //   const query = { email: email };
    //   const user = await usersCollections.findOne(query);
    //   let admin = false;
    //   if (user) {
    //     admin = user?.role === 'admin';
    //   }
    //   res.send({ admin });
    // })

    //post users data
    app.post('/users/:email', async (req, res) => {
      const newuser = req.body;
      const email = req.params.email
      const query = { email }
      const existingUser = await usersCollections.findOne(query)
      if (existingUser) {
        return res.send(existingUser)
      }
      const result = await usersCollections.insertOne({...newuser, 
        timeStamp: Date.now(),
        role: "user"
      })
      res.send(result)
    })

    // post product

    app.post('/products', async(req,res)=>{
      const newProduct = req.body
      const result = await productsCollections.insertOne(newProduct)
      res.send(result)
    })
    app.get('/products', async(req,res)=>{
      const result = await productsCollections.find().toArray()
      res.send(result)
    })
  
 
    app.get('/products/:param', async (req, res) => {
      const param = req.params.param;
      if (ObjectId.isValid(param)) {

        const query = { _id: new ObjectId(param) };
        const result = await productsCollections.findOne(query);
    
        if (!result) {
          return res.status(404).send({ error: "Product not found by ID" });
        }
    
        return res.send(result);
      }

      const query = { category: param };
      const result = await productsCollections.find(query).toArray();
    
      if (result.length === 0) {
        return res.status(404).send({ error: "No products found in this category" });
      }
    
      res.send(result);
    });

    // post to the cart

    app.post('/cart', async(req,res)=>{
      const newItem = req.body;
      const query = {_id : newItem._id}
      const axistItem = await cartCollections.findOne(query)
      if(axistItem){
        return res.send({message: "Already axist on the cart list"})
      }

      const result = await cartCollections.insertOne(newItem)
      res.send(result)
    })
    app.get('/cart', async(req,res)=>{
      const result = await cartCollections.find().toArray()
      res.send(result)
    })

    // cart delete
    app.get('/cart/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: id }
      const result = await cartCollections.findOne(query)
      res.send(result)
    })

 
    app.delete('/cart/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: id }
      const result = await cartCollections.deleteOne(query)
      res.send(result)
    })
    
    // app.delete('/purchaseFood/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) }
    //   const result = await foodsPurchaseCollections.deleteOne(query)
    //   res.send(result)
    // })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('server is running')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
