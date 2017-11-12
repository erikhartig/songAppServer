var request = require('request');
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({
   extended: true
}));
app.use(bodyParser.json({
   type: 'application/json'
}));

var testSong ={
    title: "Gwine to Run All Night",
    id: "1234",
    artist: "Stephen Foster",
    img: "notanimage.jpg"
}

/* API call to add a song to a particular song to a playlist.
 * Inputs: Song entry object and playlist code
 * Output: Posts the song entry object with the playlist ID aappended to it to /api/songs.
 * Each song entry object contains the following values:
 * title, id, artist, img, playlist
 */
function addSong(entry, playlist) {
    entry.playlist = playlist;
    console.log(entry);
    
   request.post({
      url: 'http://songapp.ddns.net:8000/api/songs',
      body: entry,
      json: true
   }, function(error, response, body) {
   });
}

addSong(testSong, "1234");
