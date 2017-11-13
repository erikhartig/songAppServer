/*
 * Search Function for SquadJam Mobile App
 * Author: Raphael Wieland
 * Date: 11/10/2017
 *
 * Based off the search-for-track example for spotify's node.js wrapper written by José Manuel Pérez (JMPerez) of Spotify.
 */

const fs = require('fs');
var SpotifyWebApi = require('spotify-web-api-node');

//Load client id and key into instance variables.
var spoClientId = fs.readFileSync("spo_client_id.txt", {
         encoding: 'utf-8'
      });
var spoClientKey = fs.readFileSync("spo_client_key.txt", {
         encoding: 'utf-8'
      });

/* Search Function
 * Prerequisits: spotifyClientID and SpotifyClientKey must be saved in files names spo_client_id.txt and spo_client_key.txt respectively within the same directory.
 * Inputs: a search query string (you can search by title by preappending "title:" to the query or by artist by preappending "artist:" to the query.), the router's res object.
 * Outputs: ends the res object passed in by setting the status and sending the search entries JSON object.
 * Catches: catches if clientCredentialGrant() or searchTracks() promise rejects and responds with the correct status codes.
 */
module.exports = {
   search: function(query, res){

    //create new SpotifyWebApi wrapper object with clientID and clientKey
    var spotifyApi = new SpotifyWebApi({
    clientId : spoClientId,
    clientSecret : spoClientKey,
    });

    // try to authenticate using client credential authentication flow as specified here:
    // https://developer.spotify.com/web-api/authorization-guide/#client-credentials-flow
    spotifyApi.clientCredentialsGrant().then(function(data){
        // Save the access token so that it's used in future calls
        spotifyApi.setAccessToken(data.body['access_token']);
        // return a new promise that accepts if the search is processed correctly.
        return spotifyApi.searchTracks(query)
      }, function(err) {
        // catch error if authentication fails
        console.log('Something went wrong when retrieving an access token', err.message);
        // sendStatus to client
        res.sendStatus(401);
      }).then(function(data){
            // initialize an instance variable to the correct part of the returned search results.
            var spotifyResults = data.body.tracks.items;
            // create new entries object which starts as an empty array
            var results = {"entries":[]};
            // for each entry in the search results,
            for(i = 0; i < spotifyResults.length; i++){
                var song = spotifyResults[i];
                // create a new entry object
                var entry = {
                    "title":song.name,
                    "id":song.id,
                    "artist":song.artists[0].name,
                    "img":img = song.album.images[2].url
                };
                // debug statement
                console.log(entry);
                // add entry to array
                results.entries[i]=entry;
            };
            // debug statement
            // console.log(results);
            // Send status and object to client
            res.status(200).json(results);
        }, function(err) {
            // catch error if search failed
            console.log('Something went wrong while trying to process your search!', err);
            // sendStatus to client
            res.sendStatus(400);
        });

     }
  };

// Example call to the search function
// search("queen",null);
