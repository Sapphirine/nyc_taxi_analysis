var fs = require("fs");
var pathDataFile = __dirname + "/data/data.json";
var contents = fs.readFileSync(pathDataFile,'utf-8');
var zipcodeData = JSON.parse(contents);

var express = require('express');
var compression = require('compression');

var app = express();
var port = 3000;
var appDir = __dirname + "/app";

app.get("/zipcodes",function(req,res){
    var zips = (Object.keys(req.query));
    var result = {};
    
    console.log("\n--> Zips requested:",zips.length);
    console.log(zips.join(","));
    
    for(var i = 0; i <zips.length; i++){
       var zip = zips[i];
       if(!result.hasOwnProperty(zip)){
           result[zip] = (zipcodeData.hasOwnProperty(zip))? zipcodeData[zip] : null;
           if(result[zip] != null) result[zip].opacity = 0.3 + Math.random();
       }
    }
    
    result = JSON.stringify(result);
    
    //ensure the response is a json object
    res.setHeader('Content-Type', 'application/json');
    if(result == {}) res.status(404).send(result); 
    else res.status(200).send(result);
});

var pgp = require('pg-promise')(/*options*/);
var db = pgp('postgres://postgres:rex123456@localhost:5432/bigdata');
app.get("/prediction/:zipcode/:dayOfWeek/:hour", function(req, res) {
    var dayOfWeek = req.params.dayOfWeek;
    var hour = req.params.hour;
    var zipcode = req.params.zipcode;

    console.log('zipcode: ' + zipcode);
    console.log('dayOfWeek: ' + dayOfWeek);
    console.log('hour: ' + hour);

    db.one('select * from output where zipcode=$1 and dayofweek=$2 and hour=$3', [zipcode, dayOfWeek, hour])
        .then(function (data) {
            console.log('DATA:', data);
            res.json(data);
        })
        .catch(function (error) {
            console.log('ERROR:', error);
            res.json(error);
        })
});


app.use(compression());
app.use(express.static(appDir));
app.listen(process.env.PORT || port);

console.log("\n---> Serving Zipcodes on localhost:",port);

