var request = require('request');
var bodyParser = require('body-parser');

voteForSong("test", "JCO0MW", "1");

//Note song should contain the plain text name of the song, playlist should contain
//the code or id given for the playlist it is in, and the vote should be 1 if voting for a
//song or 0 if you are voiting against it.  Note server does not enforce that a user can only vote once
function voteForSong(song, playlist, vote) {
   var jsonDataObj = {
      'playlist': playlist,
      'songName': song,
      'vote': vote
   };
   request.put({
      url: 'http://songapp.ddns.net:8000/api/vote',
      body: jsonDataObj,
      json: true
   }, function(error, response, body) {
   });
}
