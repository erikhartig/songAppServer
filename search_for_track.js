var SpotifyWebApi = require("../");

/*
 * This example shows how to search for a track. The endpoint is documented here:
 * https://developer.spotify.com/web-api/search-item/
 * Set the credentials given on Spotify's My Applications page.
 * https://developer.spotify.com/my-applications
 */


var searchResults = [];
var querry = "title:Wish you were here";

var spotifyApi = new SpotifyWebApi({
  clientId : 'aeabe938c81a4599865b2dc24413e623',
  clientSecret : 'd57f8390e7fd4e8fbe8baf7b652f4f50',
});


spotifyApi.clientCredentialsGrant()
  .then(function(data) {
    // Save the access token so that it's used in future calls
    spotifyApi.setAccessToken(data.body['access_token']);
  // Do search using the access token
    spotifyApi.searchTracks(querry)
    .then(function(data){
        var results = data.body.tracks.items;
        for(i = 0; i < results.length; i++){
            var song = results[i];          
//            string[i]={name: song.name, id: song.id, artist:song.artists[0].name, img:song.album.images[2].urll};
            var name = song.name;
            var id = song.id;
            var artist = song.artists[0].name;
            var img = song.album.images[2].url;
            var parsed = '{ img:"'+img +'", name:"'+name+'", artist:"'+artist+'", id:"'+id+'" }';
            console.log(parsed);
        }
    }, function(err) {
        console.log('Something went wrong!', err);
    });
  }, function(err) {
    console.log('Something went wrong when retrieving an access token', err.message);
  });



