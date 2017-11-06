const https = require('https');
const fs = require('fs');
var mysql = require('mysql');
var express = require('express');
var request = require('request');
var sjcl = require('sjcl');
var bodyParser = require('body-parser');
const searchForTracks = require('./search_for_track.js');

var app = express();

var con = mysql.createConnection({
   host: "localhost",
   user: "root",
   password: "password",
   database: "songapp"
});

app.use(bodyParser.urlencoded({
   extended: true
}));
app.use(bodyParser.json({
   type: 'application/json'
}));

var port = process.env.PORT || 8000;
var router = express.Router();

router.use(function(req, res, next) {
   // do logging
   console.log('Something is happening.');
   next(); // make sure we go to the next routes and don't stop here
});

router.get('/', function(req, res) {
   res.json({
      message: 'hooray! welcome to our api!'
   });
});

router.route('/users')

   .post(function(req, res) {
      verifyString(req.body.username);
      verifyString(req.body.password);
      if (!(req.body.username != "" && req.body.password != "")) {
         alert('username or password is empty');
         throw 'username or password is empty';
      }
      var saltBits = sjcl.random.randomWords(8);
      var encodedSalt = sjcl.codec.base64.fromBits(saltBits);
      var bitArray = sjcl.hash.sha256.hash(req.body.password, saltBits, 1000, 256);
      var digest_sha256 = sjcl.codec.hex.fromBits(bitArray);

      console.log(digest_sha256);
      con.query("INSERT INTO users (username, hashed_password, salt) VALUES ('" +
         req.body.username + "', '" +
         digest_sha256 + "', '" +
         encodedSalt +
         "')",
         function(err, result, fields) {
            if (err) throw err;
            res.status(200)
            res.send(req.body.username);
         });
   });


router.route('/search')

   .post(function(req, res) {
      verifyLogin(req.header.sessionId);
      //TO-DO get spotify authorization token and add it as a header field
      var q = req.body.searchTerm;
      q = "track:" + q.replace(/^[ ]*$/, "%20");
      var type = "type=track";
      var url = "https://api.spotify.com/v1/search?" + q + "&" + type;
      var options = {
         url: url,
         method: "GET",
         headers: {
            'Authorization': 'Basic ' + fullEncodedAuth
         }
      }
   });

router.route('/search/:name')

   .get(function(req, res){
      verifyString(req.params.name);
      var songs = searchForTracks.search(req.params.name);
      console.log(songs);
      var results = songs.tracks.items;
      for (i = 0; i < results.length; i++) {
         var song = results[i];
         var test = {
            "img" : song.album.images[2].url,
            "name" : song.name,
            "artist" : song.artists[0].name,
            "id" : song.id
         };
         songs.push(test);
      }
      console.log(songs);
   });

router.route('/songs')

   .post(function(req, res) {
      console.log(req.get("Session-Id"));
      verifyLogin(req.header.sessionId);
      verifyString(req.body.spotifyId);
      verifyString(req.body.playlistId);
      //get info from spotify
      con.query("INSERT INTO songs (song_name, artist_name, playlist_id) VALUES ( '" + req.body.songName + "', '" + req.body.artistName + "', ? )", req.body.playlistId, function(err, result, fields) {
         if (err) throw err;
         res.end(JSON.stringify(req.body));
      });
   })

   .get(function(req, res) {
      console.log("here");
      verifyString(req.get("Session-Id"));
      verifyLogin(req.get("Session-Id"));
      con.query("SELECT * FROM songs", function(err, result, fields) {
         if (err) throw err;
         res.end(JSON.stringify(result));
      });
   });

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
         url: 'https://api.spotify.com/v1',//TO-DO Fix this url
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
      request.post(options, function(err, response, body) {});
   });

router.route('/login/:id')

   .delete(function(req, res) {
      verifyString(req.params.id);
      var sql = "delete from sessions where id = ?";
      var inserts = [req.params.id];
      sql = mysql.format(sql, inserts);
      con.query(sql, function(err, result, fields) {
         if (err) throw err;
         res.status(200);
         res.end();
      });
   });

router.route('/login')

   .post(function(req, res) {
      verifyString(req.body.username);
      verifyString(req.body.password);
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
            con.query("INSERT INTO sessions (id, user_id) VALUES ('" +
               sessionIdHex + "', " + result[0].id + ")",
               function(err, result, fields) {
                  if (err) throw err;
                  res.end(String(sessionIdHex));
               }); //add fields for refresh token token and refresh time
         } else {
            throw 'incorrect username or password';
         }
      });
   });

router.route('/playlist')

   .post(function(req, res) {
      var userId = verifyLogin(req.get("Session-Id"));
      var text = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

      for (var i = 0; i < 6; i++) {
         text += possible.charAt(Math.floor(Math.random() * possible.length));
      }

      var sql = "INSERT INTO playlists (code_word, user_id) VALUES ?, ?";
      var inserts = [text, req.body.username];
      sql = mysql.format(sql, inserts);
      con.query(sql, function(err, result, fields) {
         if (err) throw err;
         res.end(text);
      });
   });

router.route('/playlist/:id')

   .delete(function(req, res) {
      verifyString(req.params.id);
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

//
// const options = {
//    key: fs.readFileSync('server-key.pem'),
//    cert: fs.readFileSync('server-cert.pem')
// };

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

function verifyString(str) {
   if (/^[a-zA-Z0-9- ]*$/.test(str) == false) {
      throw 'Contains invalid characters';
   }
}
