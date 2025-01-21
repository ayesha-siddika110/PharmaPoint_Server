const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const morgan = require('morgan')
const stripe = require('stripe')(process.env.STRIPE_secret_key)



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
    const paymentCollections = db.collection("payments")
    const advertiseCollections = db.collection("advertise")


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
    const verifyseller = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollections.findOne(query);
      const isSeller = user?.role === 'seller';
      if (!isSeller) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }
    const verifyUser = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollections.findOne(query);
      const isUser = user?.role === 'user';
      if (!isUser) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    // role verify

    app.get('/users/role/:email', async(req,res)=>{
      const email = req.params.email;
      const query = { email: email }
      const result = await usersCollections.findOne(query)
      res.send({role: result?.role})
    })
    // ************ Category ************

    //get the category
    app.get('/category', async (req, res) => {
      const result = await categoryCollections.find().toArray()
      res.send(result)
    })
    app.get('/category:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await categoryCollections.findOne(query)
      res.send(result)
    })
    //post the category
    app.post('/category', async (req, res) => {
      const newCategory = req.body;
      const result = await categoryCollections.insertOne(newCategory)
      res.send(result)
    })
    // patch` the category
    app.patch('/category/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateData = {
        $set: req.body
      };
      const result = await categoryCollections.updateOne(filter, updateData, options)
      res.send(result)
    })
    // delete the category
    app.delete('/category/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await categoryCollections.deleteOne(query)
      res.send(result)
    })

      // ************ Users ************

    // get the users

    app.get('/users', async (req, res) => {
      const result = await usersCollections.find().toArray()
      res.send(result)
    })
    app.get('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await usersCollections.findOne(query)
      res.send(result)
    })
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
      const result = await usersCollections.insertOne({
        ...newuser,
        timeStamp: Date.now(),
        role: "user"
      })
      res.send(result)
    })


    // update status
    app.patch('/users/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateData = {
        $set: req.body
      };
      const result = await usersCollections.updateOne(filter, updateData, options)
      res.send(result)
    })

    // ************ Products ************

    // post product

    app.post('/products', async (req, res) => {
      const newProduct = req.body
      const result = await productsCollections.insertOne(newProduct)
      res.send(result)
    })
    app.get('/products', async (req, res) => {
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
      //find by email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(param)) {
        const query = { sellerEmail: param };
        const result = await productsCollections.find(query).toArray();

        if (result.length === 0) {
          return res.status(404).send({ error: "No products found for this email" });
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
    app.delete('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await productsCollections.deleteOne(query)
      res.send(result)
    })

    // ************ Cart ************

    // post to the cart

    app.post('/cart', async (req, res) => {
      const newItem = req.body;
      const query = { _id: newItem._id }
      const axistItem = await cartCollections.findOne(query)
      if (axistItem) {
        return res.send({ message: "Already axist on the cart list" })
      }

      const result = await cartCollections.insertOne(newItem)
      res.send(result)
    })
    app.get('/cart', async (req, res) => {
      const result = await cartCollections.find().toArray()
      res.send(result)
    })

    // cart delete
    app.get('/cart/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await cartCollections.findOne(query)
      res.send(result)
    })


    app.delete('/cart/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await cartCollections.deleteOne(query)
      res.send(result)
    })

    // ************ Payment ************

    // payment intent 
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      console.log(paymentIntent.client_secret);
      

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });
    //payment history 
    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollections.insertOne(payment);

      //  carefully delete each item from the cart
      console.log('payment info', payment);
      const query = {
        _id: {
          $in: payment.cartIds.map(id => new ObjectId(id))
        }
      };

      const deleteResult = await cartCollections.deleteMany(query);

      res.send({ paymentResult, deleteResult });
    })
    //get payment history

    app.get('/payments', async (req, res) => {
      const result = await paymentCollections.find().toArray()
      res.send(result)
    })
    //get payment history by id
    app.get('/payments/:param', async (req, res) => {
      const param = req.params.param;

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(param)) {

        const query = { buyerEmail: param };
        const result = await paymentCollections.find(query).toArray();

        if (result.length === 0) {
          return res.status(404).send({ error: "No products found for this email" });
        }

        return res.send(result);
      }
      if (ObjectId.isValid(param)) {

        const query = { _id: new ObjectId(param) };
        const result = await paymentCollections.findOne(query);

        if (!result) {
          return res.status(404).send({ error: "Product not found by ID" });
        }

        return res.send(result);
      }

      // const query = { _id: new ObjectId(param) }
      // const result = await paymentCollections.findOne(query)
      // res.send(result)
    })
    //patch payment status
    app.patch('/payments/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateData = {
        $set: req.body
      };
      const result = await paymentCollections.updateOne(filter, updateData, options)
      res.send(result)
    })


    // ************ Advertise ************
    app.post('/advertise', async(req,res)=>{
      const newAdvertise = req.body;
      const data = {...newAdvertise, status: 'pending'}
      const result = await advertiseCollections.insertOne(data)
      res.send(result)
    })
    app.get('/advertise', async(req,res)=>{
      const result = await advertiseCollections.find().toArray()
      res.send(result)
    })
    app.get('/advertise/:id', async(req,res)=>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await advertiseCollections.findOne(query)
      res.send(result)
    })
    app.delete('/advertise/:id', async(req,res)=>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await advertiseCollections.deleteOne(query)
      res.send(result)
    })
    app.patch('/advertise/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateData = {
        $set: req.body
      };
      const result = await advertiseCollections.updateOne(filter, updateData, options)
      res.send(result)
    })
  } finally {

  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('server is running')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
