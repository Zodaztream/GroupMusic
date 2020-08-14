import React, { useState } from "react";
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
import querystring from "querystring";

export const authEndpoint = "https://accounts.spotify.com/authorize?";
//const keys = require("../../data.json");
var client_id = "d5a94039038d4a12b5816fd9bf1e6af5"; // Your client id
//var client_secret = keys["secret_key"]; // Your secret
var redirect_uri = "com.example.cordovaspotifyapp";

const mode_length = "01000000000011111010"; // This contains the mode bits (first 4 bits, followed by 16 bits determining the length)
const terminator_bits = "0000"; //these are required for QR codes incase the length is not exact.
// Filler bits.
const subsequent_bits = `11101100 00010001 11101100 00010001 11101100 00010001 11101100 00010001 11101100 00010001 11101100 00010001 11101100 00010001 11101100 00010001 11101100 00010001 11101100 00010001 11101100`;
/*

hex = "H".charCodeAt(0).toString(16); // convert character to hex (without 0x)
binary = parseInt(hex, 16).toString(2) // converts hex to binary
eight_bit = eight_bit.slice(0, 8 - binary.length) // Append 0s if necessary to make 8 bits.
eight_bit += binary
btoh = parseInt(eight_bit, 2).toString(16) // converts binary to hex
character = String.fromCharCode(0x48) // convert hex to character MUST USE 0x

Convert binary to hex
*/

/**
 * Takes 1 character and outputs it's hex value (without 0x)
 * @param {string} input
 */
function characters_to_hex(input) {
  return input.charCodeAt(0).toString(16);
}
/**
 * Takes a hex value (integer part) and converts into 1 byte
 * @param {string} input
 */
function hex_to_binary(input) {
  var byte = "00000000";
  var binary = parseInt(input, 16).toString(2);
  byte = byte.slice(0, 8 - binary.length);
  byte += binary;
  return byte;
}

/**
 * Takes a string that's a byte
 * @param {string} input
 */
function binary_to_hex(input) {
  return parseInt(input, 2).toString(16);
}

/**
 * Takes a string of hex (without 0x) and converts into character
 * as per the ISO standard
 * @param {string} input
 */
function hex_to_character(input) {
  return String.fromCharCode("0x" + input);
}

function comeplete_qr_code(encoded) {
  // this takes all bits rearrenges them into a complete QR code order and returns them into equal chunks of 8 bits long
  let all_bits = `${mode_length}${encoded}${terminator_bits}${subsequent_bits}`;
  return all_bits
    .replace(/\s+/g, "")
    .match(/.{1,8}/g)
    .join(" ");
}

function App() {
  const history = useHistory();
  const dispatch = useDispatch();
  const [on, setOn] = useState(false);
  const [searchValue, setSearch] = useState("");
  const [roomcode, setRoomcode] = useState("");
  const [encodedBinary, setEncodedBinary] = useState("");
  const [state, setState] = useState(null);

  var Spotify = window.cordova.plugins.SpotifyPlugin;
  if (encodedBinary) console.log(comeplete_qr_code(encodedBinary));
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
            setEncodedBinary(
              res
                .split("")
                .map(char => {
                  return [hex_to_binary(characters_to_hex(char))];
                })
                .join(" ")
            );
            console.log("Now printing...");
          });
        }}
      >
        Log in
      </Button>
      <Button
        variant="contained"
        color="blue"
        onClick={() => {
          // This is when we want to retrieve token manually
          Spotify.getToken(
            function(res) {
              // This tests that the decoded binary value is correct debugging purposes
              let temp = encodedBinary
                .split(" ")
                .map(binary => {
                  return hex_to_character(binary_to_hex(binary));
                })
                .join("");
              console.log(res === temp);
            },
            function(error) {
              alert(error);
            }
          );
        }}
      >
        Log in
      </Button>
      {access_token && (
        <Button
          variant="contained"
          color="blue"
          onClick={() => handleAddQueue()}
        >
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
    </div>
  );
}

export default App;
