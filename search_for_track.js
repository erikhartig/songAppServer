var SpotifyWebApi = require('spotify-web-api-node');

/*
 * This example shows how to search for a track. The endpoint is documented here:
 * https://developer.spotify.com/web-api/search-item/
 * Set the credentials given on Spotify's My Applications page.
 * https://developer.spotify.com/my-applications
 */


var searchResults = [];
//var query = "title:Wish you were here";

var spotifyApi = new SpotifyWebApi({
   clientId: 'aeabe938c81a4599865b2dc24413e623',
   clientSecret: 'd57f8390e7fd4e8fbe8baf7b652f4f50',
});

module.exports = {
   search: function(query) {

      var resultSongs = spotifyApi.clientCredentialsGrant()
         .then(function(data) {
            // Save the access token so that it's used in future calls
            spotifyApi.setAccessToken(data.body['access_token']);
            // Do search using the access token
            return spotifyApi.searchTracks(query);
         }, function(err) {
            console.log('Something went wrong when retrieving an access token', err.message);
         });
   }
}
