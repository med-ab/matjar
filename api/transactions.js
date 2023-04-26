let app = require("express")()
let server = require("http").Server(app)
let bodyParser = require("body-parser")
let Datastore = require("nedb")
let Inventory = require("./inventory")

app.use(bodyParser.json())

module.exports = app

let transactions = new Datastore({
  filename: process.env.APPDATA+"/POS/server/databases/transactions.db",
  autoload: true
})


transactions.ensureIndex({ fieldName: '_id', unique: true })

app.get("/", function(req, res) {
  res.send("Transactions API")
})

 
app.get("/all", function(req, res) {
  transactions.find({}, function(err, docs) {
    res.send(docs)
  })
})



 
app.get("/on-hold", function(req, res) {
  transactions.find(
    { $and: [{ ref_number: {$ne: ""}}, { status: 0  }]},    
    function(err, docs) {
      if (docs) res.send(docs)
    }
  )
})



app.get("/customer-orders", function(req, res) {
  transactions.find(
    { $and: [{ customer: {$ne: "0"} }, { status: 0}, { ref_number: ""}]},
    function(err, docs) {
      if (docs) res.send(docs)
    }
  )
})



app.get('/by-date', (req, res) => 
  transactions.find({ $and: [
      { date: { $gte: new Date(req.query.start).toJSON(), $lte: new Date(req.query.end).toJSON() }},
      ...req.query.till != 0 ? [{till: Number(req.query.till)}]: [],
      ...req.query.user != 0 ? [{user_id: Number(req.query.user)}]: [],
      ...req.query.status ? [{status: Number(req.query.status)}] : [] ]},
    (err, docs) => {
      if (docs) res.send(docs)
    } ) )

app.post("/new", function(req, res) {
  transactions.insert(req.body, function(err, transaction) {    
    if (err) res.status(500).send(err)
    else {
     res.sendStatus(200)
     if(req.body.paid >= req.body.total){
        Inventory.decrementInventory(req.body.items)
     }
    }
  })
})

app.put("/new", function(req, res) {
  transactions.update({_id: req.body._id}, req.body, {}, function (err, numReplaced, order) {
    if (err) res.status(500).send(err)
    else {
     res.sendStatus(200);  
    }
  })
})


app.delete("/:transactionId", ( req, res ) =>
  transactions.remove({_id: req.params.transactionId}, ( err, numRemoved ) =>
    err != null ? res.status( 500 ).send( err ) : res.sendStatus( 200 )  )  )

app.get("/:transactionId", function(req, res) {
  transactions.find({ _id: req.params.transactionId }, function(err, doc) {
    if (doc) res.send(doc[0])
  })
})
