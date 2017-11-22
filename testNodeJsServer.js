/*
Author: Erik Hartig
Date: 11/15/17
Code that creates a node js web server that implements a restful api
**/

const https = require('https');
const fs = require('fs');
var mysql = require('mysql');
var express = require('express');
var request = require('request');
var sjcl = require('sjcl');
var bodyParser = require('body-parser');
const searchForTracks = require('./search_for_track.js');

var app = express();
//creates a connection object to allow access to the database
var con = mysql.createConnection({
   host: "localhost",
   user: "root",
   password: "password",
   database: "songapp"
});

//creating settings for the http body parser
app.use(bodyParser.urlencoded({
   extended: true
}));
app.use(bodyParser.json({
   type: 'application/json'
}));

//setting up the port and routing information
var port = process.env.PORT || 80;
var router = express.Router();

router.use(function(req, res, next) {
   // do logging
   console.log('Something is happening.');
   next(); // make sure we go to the next routes and don't stop here
});

//A basic test function that can be used to see if the api is functioning
router.get('/', function(req, res) {
   res.json({
      message: 'hooray! welcome to our api!'
   });
});



//This route allows for put request to do voting, needs a playlist id, a song name, and a value of 1 for a vote for or 0 for a vote against
router.route('/vote')

   .put(function(req, res) {
      con.query("SELECT id FROM playlists WHERE code_word=?", req.body.playlist, function(err, result, fields) {
         con.query("SELECT id, score FROM songs WHERE playlist_id = ? AND song_name = ?", [result[0].id, req.body.songName], function(err, result, fields) {
            if (err) throw error;
            if (req.body.vote == 1) {
               result[0].score = result[0].score + 1;
            } else if (req.body.vote == 0) {
               result[0].score = result[0].score - 1;
            } else {
               res.status(400);
               res.send("invalid vote number");
               throw "invalid vote number";
            }
            con.query("UPDATE songs SET score=? WHERE id=?", [result[0].score, result[0].id], function(err, result, fields) {
               if (err) throw error;
               res.status(200);
               res.end();
            });
         });
      });
   });

//calls the search function by taking a name at the end of the http request
router.route('/search/:name')

   .get(function(req, res) {
      searchForTracks.search(req.params.name, res);
   });

//returns all the songs for a given playlist
router.route('/songs/:playlistId')

.get(function(req, res) {
   //verifyLogin(req.get("Session-Id"));
   console.log("finding songs");
   con.query("SELECT id FROM playlists where code_word=?", req.params.playlistId, function(err, result, fields){
      if(err) throw err;
      con.query("SELECT * FROM songs where playlist_id=?", result[0].id, function(err, result, fields) {
         if (err) throw err;
         res.status(200);
         res.send(result);
      });
   });
});

//Allows for the adding of new songs through a post request
router.route('/songs')

   .post(function(req, res) {
      //console.log(req.get("Session-Id"));
      //verifyLogin(req.header.sessionId);
      //get info from spotify
      con.query("INSERT INTO songs (song_name, artist_name, spotify_id, image_url, score, playlist_id) VALUES (?, ?, ?, ?, 0, ?)", [req.body.title, req.body.artist, req.body.spotifyId, req.body.url, req.body.playlistId], function(err, result, fields) {
         if (err) throw err;
         res.send(JSON.stringify(req.body)); //remove after testing
      });
   });

//unused: allow sthe user to link a spotify account with their account, ended up not being used due to certain features being dropped.
router.route('/users/spotify')

   .post(function(req, res) {
      var userId = verifyLogin(req.get("Session-Id"));
      var spoClientId = fs.readFileSync("spo_client_id.txt", {
         encoding: 'utf-8'
      });
      var spoClientKey = fs.readFileSync("spo_client_key.txt", {
         encoding: 'utf-8'
      });

      var fullEncodedAuth = sjcl.codec.base64.fromBits(sjcl.codec.hex.toBits(spoClientId + ":" + spoClientKey));
      console.log(fullEncodedAuth);

      verifyString(req.params.code);
      var options = {
         url: 'https://api.spotify.com/v1', //TO-DO Fix this url
         method: "POST",
         headers: {
            'Authorization': 'Basic ' + fullEncodedAuth
         },
         body: {
            'grant_type': 'authorization_code',
            'code': req.params.code,
            'redirect_uri': req.params.redirectUri
         }
      }
   });

//Allows the creating of a new user through a post request
router.route('/users')

   .post(function(req, res) {
      console.log("user being created");
      if (!(req.body.username != "" && req.body.password != "")) {
         alert('username or password is empty');
         throw 'username or password is empty';
      }
      var saltBits = sjcl.random.randomWords(8);
      var encodedSalt = sjcl.codec.base64.fromBits(saltBits);
      var bitArray = sjcl.hash.sha256.hash(req.body.password, saltBits, 1000, 256);
      var digest_sha256 = sjcl.codec.hex.fromBits(bitArray);

      console.log(digest_sha256);
      con.query("INSERT INTO users (username, hashed_password, salt) VALUES (?,  ?, ?)", [req.body.username, digest_sha256, encodedSalt], function(err, result, fields) {
         if (err) throw err;
         res.status(200);
         res.send(req.body.username);
      });
   });


//allows a user to logout by passing a session id
router.route('/login/:id')

   .delete(function(req, res) {
      con.query("delete from sessions where id = ?", req.params.id, function(err, result, fields) {
         if (err) throw err;
         res.status(200);
         res.end();
      });
   });

//Allows a user to login and returns a session id
router.route('/login')

   .post(function(req, res) {
      var sql = "select * from users WHERE username = ?";
      var inserts = [req.body.username];
      sql = mysql.format(sql, inserts);
      con.query(sql, function(err, result, fields) {
         if (err) throw err;
         var saltBits = sjcl.codec.base64.toBits(result[0].salt);
         var hashedPassword = sjcl.hash.sha256.hash(req.body.password, saltBits, 1000, 256);
         var digest_sha256 = sjcl.codec.hex.fromBits(hashedPassword);
         if (req.body.username == result[0].username && digest_sha256 == result[0].hashed_password) {
            if (result[0].refresh_token !== null) {}
            var sessionId = sjcl.random.randomWords(16);
            var sessionIdHex = sjcl.codec.hex.fromBits(sessionId);
            con.query("DELETE FROM sessions where user_id = ?", result[0].id, function(err, result, fields) {
               if (err) throw err;
            });
            con.query("INSERT INTO sessions (id, user_id) VALUES (?, ?)", [sessionIdHex, result[0].id], function(err, result, fields) {
               if (err) throw err;
               res.status(200);
               res.send(String(sessionIdHex));
            }); //add fields for refresh token token and refresh time
         } else {
            res.status(400);
            res.send("incorrect username or password");
            throw 'incorrect username or password';
         }
      });
   });

//Allows for the creation of a new playlist
router.route('/playlist')

   .post(function(req, res) {
      var userId = verifyLogin(req.get("Session-Id"));
      var text = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

      for (var i = 0; i < 6; i++) {
         text += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      con.query("SELECT id from users where username=?", req.body.username, function(err, result, fields) {
         if (err) throw err;
         console.log(result);
         console.log(result[0].id);
         con.query("INSERT INTO playlists (code_word, user_id) VALUES (?, ?)", [text, result[0].id], function(err, result, fields) {
            if (err) throw err;
            res.end(text);
         });
      });
   });

//Allows the app to delete a playlist
router.route('/playlist/:id')

   .delete(function(req, res) {
      var userId = verifyLogin(req.get("Session-Id"));
      var sql = "delete from playlists where code_word = ?";
      var inserts = [req.params.id];
      sql = mysql.format(sql, inserts);
      con.query(sql, function(err, result, fields) {
         if (err) throw err;
         res.status(200);
         res.end();
      });
   });

app.use('/api', router);
app.listen(port);
console.log('Magic happens on port ' + port);

//code necessary for https not used because we decided not to use https
//
// const options = {
//    key: fs.readFileSync('server-key.pem'),
//    cert: fs.readFileSync('server-cert.pem')
// };

//checks to see if the user provided session id is valid
function verifyLogin(sessionId) {
   verifyString(sessionId);
   var sql = "select * from sessions where id = ?";
   var inserts = [sessionId];
   sql = mysql.format(sql, inserts);
   con.query(sql, function(err, result, fields) {
      if (err) throw err;
      if (result.length == 1) {
         return result[0].user_id;
      } else {
         throw 'Session id is invalid';
      }
   });
}

//checks to see if a string contains invalid characters
function verifyString(str) {
   if (/^[a-zA-Z0-9- ]*$/.test(str) == false) {
      throw 'Contains invalid characters';
   }
}
