const app = require( "express")();
const server = require( "http" ).Server( app );
const bodyParser = require( "body-parser" );
const Datastore = require( "nedb" );
const multer = require("multer");
const fileUpload = require('express-fileupload');
const { dirname } = require('path');
const fs = require('fs'),
  os = require('os'),
  exec = require("child_process").spawnSync,
  v = (command) => exec('git',command.split(" "));


app.post( "/version", function ( req, res ) {
    let cwd = process.cwd()
    process.chdir(dirname(require.main.filename))
    v("clean -f")
    v("pull")
    process.chdir(cwd)
} );
   
const storage = multer.diskStorage({
  destination:  process.env.APPDATA+'/POS/uploads',
  filename: function(req, file, callback){
      callback(null, Date.now() + '.jpg');
  }
});

let upload = multer({storage: storage});

app.use( bodyParser.json() );

let settingsDB = new Datastore( {
    filename: process.env.APPDATA+"/POS/server/databases/settings.db",
    autoload: true
} );



app.get( "/", function ( req, res ) {
    res.send( "Settings API" );
} );


  
app.get( "/get", function ( req, res ) {
    settingsDB.findOne( {
        _id: 1
}, function ( err, docs ) {
        res.send( docs );
    } );
} );

app.post( "/post", upload.single('imagename'), function ( req, res ) {

    let image = '';

    if(req.body.img != "") {
        image = req.body.img;       
    }

    if(req.file) {
        image = req.file.filename;  
    }

    if(req.body.remove == 1) {
        const path = process.env.APPDATA+"/POS/uploads/"+ req.body.img;
        try {
          fs.unlinkSync(path)
        } catch(err) {
          console.error(err)
        }

        if(!req.file) {
            image = '';
        }
    } 
    
  
    let Settings = {  
        _id: 1,
        settings: {
            "app": req.body.app,
            "store": req.body.store,
            "address_one": req.body.address_one,
            "address_two":req.body.address_two,
            "contact": req.body.contact,
            "tax": req.body.tax,
            "symbol": req.body.symbol,
            "percentage": req.body.percentage,
            "charge_tax": req.body.charge_tax,
            "footer": req.body.footer,
            "img": image
        }       
    }

    if(req.body.id == "") { 
        settingsDB.insert( Settings, function ( err, settings ) {
            if ( err ) res.status( 500 ).send( err );
            else res.send( settings );
        });
    }
    else { 
        settingsDB.update( {
            _id: 1
        }, Settings, {}, function (
            err,
            numReplaced,
            settings
        ) {
            if ( err ) res.status( 500 ).send( err );
            else res.sendStatus( 200 );
        } );

    }

});

 
module.exports = app;
