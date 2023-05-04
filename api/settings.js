var app = require('express')()
var server = require('http').Server(app)
var bodyParser = require('body-parser')
var Datastore = require('nedb')
var multer = require('multer')
var fileUpload = require('express-fileupload')
var fs = require('fs')
var {dirname} = require('path')
var os = require('os')
var exec = require('child_process').spawnSync
var v =(command)=> 
    exec('git', command.split(' ')).stdout.toString()?.trim()

app.get('/version', (req, res) => {
    v('fetch')
    var {cwd,chdir} = process
    chdir(dirname(require.main.filename))
    var current = v('rev-parse HEAD')
    var updates = v('log HEAD..origin/main') ?
      v(`log HEAD..origin/main`).split('commit ').filter(String).map(commit=>Object.assign({},...commit.split('\n').filter(String).map(o=>o.trim()).map((o, i) =>
          i == 0 ? { commit: o }
        : i == 1 ? { [o.split(': ')[0]]: o.split(': ')[1] }
        : i == 2 ? { [o.split(': ')[0]]: new Date(o.split(': ')[1]) }
        : i == 3 ? { message: o }
        : ''  )))
      : []
    console.log({current, updates})
    res.type('json').send(JSON.stringify({current, updates}))
    chdir(cwd())
})
app.patch('/version', function (req, res) {
    var cwd = process.cwd()
    process.chdir(dirname(require.main.filename))
    if (req.query.commands) { 
        log(req.query.commands)
        req.query.commands.split(';').forEach(v)
    }
    res.sendStatus(200)
    process.chdir(cwd)
})

var storage = multer.diskStorage({
    destination: process.env.APPDATA + '/POS/uploads',
    filename: function (req, file, callback) {
        callback(null, Date.now() + '.jpg')
    }
})

var upload = multer({ storage: storage })

app.use(bodyParser.json())

var settingsDB = new Datastore({
    filename: process.env.APPDATA + '/POS/server/databases/settings.db',
    autoload: true
})

app.get('/', function (req, res) {
    res.send('Settings API')
})

app.get('/get', function (req, res) {
    settingsDB.findOne({
        _id: 1
    }, function (err, docs) {
        res.send(docs)
    })
})

app.post('/post', upload.single('imagename'), function (req, res) {
    var image = ''
    if (req.body.img != '') image = req.body.img
    if (req.file) image = req.file.filename
    if (req.body.remove == 1) {
        var path = process.env.APPDATA + '/POS/uploads/' + req.body.img
        try {
            fs.unlinkSync(path)
        } catch (err) {
            console.error(err)
        }
        if (!req.file) image = ''
    }
    var Settings = {
        _id: 1,
        settings: {
            app: req.body.app,
            store: req.body.store,
            address_one: req.body.address_one,
            address_two: req.body.address_two,
            contact: req.body.contact,
            tax: req.body.tax,
            symbol: req.body.symbol,
            percentage: req.body.percentage,
            charge_tax: req.body.charge_tax,
            footer: req.body.footer,
            img: image
        }
    }
    if (req.body.id == '') {
        settingsDB.insert(Settings, function (err, settings) {
            if (err) res.status(500).send(err)
            else res.send(settings)
        })
    }
    else {
        settingsDB.update({
            _id: 1
        }, Settings, {}, function (
            err,
            numReplaced,
            settings
        ) {
            if (err) res.status(500).send(err)
            else res.sendStatus(200)
        })

    }

})


module.exports = app
