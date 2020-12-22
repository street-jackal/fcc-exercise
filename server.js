const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
let bodyParser = require('body-parser')

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });


/** Create the schema for storing our exerise routines */
let routineSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: String
})

/** Create the schema for storing our people */
let personSchema = new mongoose.Schema({
  username: { type: String, required: true },
  log: [routineSchema]
});



/** Create models using above schema */
let Person = mongoose.model('Person', personSchema);
let Routine = mongoose.model('Routine', routineSchema);

let response = {};

/** Add a new person to the database with name from input field */
app.post('/api/exercise/new-user', bodyParser.urlencoded({ extended: false }), (request, response) => {
  let newPerson = new Person({ username: request.body.username })
  newPerson.save((error, savedPerson) => {
    if (!error) {
      response.json({ username: savedPerson.username, _id: savedPerson.id })
    }
  })
})

/** Get a list of all people in the database */
app.get('/api/exercise/users', (request, response) => {
  Person.find({}, (error, arrayOfUsers) => {
    if (!error) {
      response.json(arrayOfUsers)
    }
  })
})

/** Add a new exercise to specified user (by _id) to the database using data from the input fields */
app.post('/api/exercise/add', bodyParser.urlencoded({ extended: false }), (request, response) => {

  let newRoutine = new Routine({
    description: request.body.description,
    duration: request.body.duration,
    date: request.body.date
  });

  if(newRoutine.date === ''){
    newRoutine.date = new Date().toISOString().substring(0, 10)
  }

  Person.findByIdAndUpdate(request.body.userId, { $push: { log: newRoutine } }, { new: true }, (err, data) => {
    if (!err) {
      let responseObject = {
      '_id': data.id,
      'username': data.username,
      'description': newRoutine.description,
      'duration': newRoutine.duration,
      'date': new Date(newRoutine.date).toDateString(),
      };
      response.json(responseObject);
    }
  })
})

/** Get a log of all of a person's exercise routines. Has optional args for [from], [to], & [limit] dates to return only routines from a given range of dates */
app.get('/api/exercise/log', (request, response) => {
  Person.findById(request.query.userId, (error, result) => {
    if (!error) {
      let responseObject = result.toJSON();
      if (request.query.from || request.query.to) {

        let startDate = new Date(0)
        let endDate = new Date()

        if (request.query.from) {
          startDate = new Date(request.query.from)
        }

        if (request.query.to) {
          endDate = new Date(request.query.to)
        }

        startDate = startDate.getTime()
        endDate = endDate.getTime()

        responseObject.log = responseObject.log.filter((session) => {
          let sessionDate = new Date(session.date).getTime()

          return sessionDate >= startDate && sessionDate <= endDate

        })
      }

      if (request.query.limit) {
        responseObject.log = responseObject.log.slice(0, request.query.limit)
      }

      responseObject['count'] = result.log.length;
      response.json(responseObject)
    }
  })
})