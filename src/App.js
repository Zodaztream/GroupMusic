/**
 * Important: I made custom changes to the Spotify plugin; added functionality to make it work better
 */
import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { addTrack } from "./actions";
import logo from "./logo.svg";
import "./App.css";
import { useModal } from "react-modal-hook";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import { useHistory, Redirect, Link } from "react-router-dom";
import { withRouter } from "react-router";
import { handleAddQueue, handleSearch } from "./network/helper";
import TextField from "@material-ui/core/TextField";
import Tracklist from "./components/Tracklist";
import QrComponent from "./components/qrcomponent";
import querystring from "querystring";

export const authEndpoint = "https://accounts.spotify.com/authorize?";
//const keys = require("../../data.json");
var client_id = "d5a94039038d4a12b5816fd9bf1e6af5"; // Your client id
//var client_secret = keys["secret_key"]; // Your secret
var redirect_uri = "com.example.cordovaspotifyapp";

const sleep = milliseconds => {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
};

function App() {
  const history = useHistory();
  const dispatch = useDispatch();
  const [on, setOn] = useState(false);
  const [searchValue, setSearch] = useState("");
  const [roomcode, setRoomcode] = useState("");
  const [res, setRes] = useState("");

  var Spotify = window.cordova.plugins.SpotifyPlugin;

  //console.log(comeplete_qr_code(encodedBinary));
  var access_token = "";
  // add token to local storage (might still use this)
  localStorage.setItem("access_token", access_token);

  return (
    <div>
      <Button
        variant="contained"
        color="blue"
        onClick={() => {
          // below is for logging in
          Spotify.login(client_id, redirect_uri, "", function(res) {
            setRes(res);
          });
        }}
      >
        Log in
      </Button>
      <Button
        variant="contained"
        color="blue"
        onClick={() => {
          window.QRScanner.show();
          window.QRScanner.scan(displayContents);
          function displayContents(err, text) {
            if (err) {
              console.log(err);
            } else {
              alert(text);
            }
            window.QRScanner.hide();
          }
        }}
      >
        Scan QR
      </Button>
      {access_token && (
        <Button variant="contained" color="blue" onClick={() => handleAddQueue()}>
          Add song
        </Button>
      )}
      {access_token && (
        <TextField
          id="standard-basic"
          label="Search track..."
          onChange={event => setSearch(event.currentTarget.value)}
        />
      )}
      {access_token && (
        <Button
          variant="contained"
          color="blue"
          onClick={() =>
            handleSearch(searchValue).then(result => {
              const { tracks } = JSON.parse(result);
              tracks["items"].map(item => {
                const trackItem = {
                  name: item["name"], // track name
                  artist: item["artists"][0]["name"], // artist name
                  uri: item["uri"], // track URI
                  image: item["album"]["images"][0] // one image
                };
                dispatch(addTrack(trackItem));
              });
            })
          }
        >
          Search
        </Button>
      )}
      {access_token && <Tracklist />}
      {!access_token && (
        <TextField
          id="standard-basic"
          label="Enter room code..."
          onChange={event => setRoomcode(event.currentTarget.value)}
        />
      )}
      {!access_token && (
        <Button
          variant="contained"
          color="blue"
          onClick={() => {
            console.log(window.location.hostname);
            window.location.assign(
              "http://" +
                window.location.hostname +
                ":8888/join?" +
                querystring.stringify({
                  code: roomcode
                })
            );
          }}
        >
          Join Room
        </Button>
      )}

      {res && <QrComponent res={res} />}
    </div>
  );
}

export default App;
