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

var generator_poly =
  "0x291 + 215x290 + 234x289 + 158x288 + 94x287 + 184x286 + 97x285 + 118x284 + 170x283 + 79x282 + 187x281 + 152x280 + 148x279 + 252x278 + 179x277 + 5x276 + 98x275 + 96x274 + 153x273";

//This is the log antilog table for the galois field(256), each INDEX represents the power-value of alpha (=2). e.g 29 = alpha^8 (i.e index 8)
const galois_field_table = `1	2	4	8	16	32	64	128	29	58	116	232	205	135	19	38	76	152	45	90	180	117	234	201	143	3	6	12	24	48	96	192	157	39	78	156	37	74	148	53
                        106	212	181	119	238	193	159	35	70	140	5	10	20	40	80	160	93	186	105	210	185	111	222	161	95	190	97	194	153	47	94	188	101	202	137	15	30
                        60	120	240	253	231	211	187	107	214 177	127	254	225	223	163	91	182	113	226	217	175	67	134	17	34	68	136	13	26	52	104	208	189	103	206	129
                        31	62	124	248	237	199	147	59	118	236	197	151	51	102	204	133	23	46	92	184	109	218	169	79	158	33	66	132	21	42	84	168	77	154	41	82
                        164	85	170	73	146	57	114	228	213	183	115	230	209	191	99	198	145	63	126	252	229	215	179	123	246	241	255	227	219	171	75	150	49	98	196	149
                        55	110	220	165	87	174	65	130	25	50	100	200	141	7	14	28	56	112	224	221	167	83	166	81	162	89	178	121	242	249	239	195	155	43	86	172	69
                        138	9	18	36	72	144	61	122	244	245	247	243	251	235	203	139	11	22	44	88	176	125	250	233	207	131	27	54	108	216	173	71	142`
  .replace(/\s+/g, " ")
  .split(" ");

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
  return all_bits.replace(/\s+/g, "").match(/.{1,8}/g); //returns array of 8 bit chunks (strings)
  //.join(" ");
}

/////courtesty of https://sim0n.wordpress.com/2009/04/04/javascript-simple-algebraic-long-division/
// Long divison
function extractCompontents(Term, constantChar) {
  var Comps = new Array();
  Comps[0] = Term.split(constantChar)[0];
  Comps[1] = Term.split("^")[1];
  if (Comps[0] == "") {
    Comps[0] = 1;
  }
  if (String(Comps[1]) == "undefined") {
    Comps[1] = 1;
  }
  return Comps;
}
function divideTerm(Term1, Term2, constantChar) {
  var extTerm1 = extractCompontents(Term1, constantChar);
  var extTerm2 = extractCompontents(Term2, constantChar);
  return (
    String(extTerm1[0] / extTerm2[0]) +
    constantChar +
    "^" +
    String(extTerm1[1] - extTerm2[1])
  );
}
function multiplyTerm(Term1, Term2, constantChar) {
  var extTerm1 = extractCompontents(Term1, constantChar);
  return String(extTerm1[0] * Term2) + constantChar + "^" + String(extTerm1[1]);
}

function subtractTerm(Term1, Term2, constantChar) {
  var extTerm1 = extractCompontents(Term1, constantChar);
  var extTerm2 = extractCompontents(Term2, constantChar);
  if (extTerm1[1] != extTerm2[1]) {
    return null;
  }
  return (
    String(extTerm1[0] - extTerm2[0]) + constantChar + "^" + String(extTerm1[1])
  );
}

function longAlgebraicDivision(poly, division) {
  //Format the equations correctly
  poly = poly.replace(/(--|\+\+)/g, "+");
  poly = poly.replace(/(-\+|\+-)/g, "-");
  poly = poly.replace(/^\+/g, "");
  poly = poly.replace(/\s/g, "");
  division = division.replace(/(--|\+\+)/g, "+");
  division = division.replace(/(-\+|\+-)/g, "-");
  division = division.replace(/^\+/g, "");
  division = division.replace(/\s/g, "");
  //Add spaces to the equation to break it apart
  poly = poly.replace(/([+-])/g, " $1");
  //Split the equation at the spaces
  var equ = poly.split(" ");
  //Begin the division
  var output = "";
  var lastTerm = "";
  for (var i = 0; i < equ.length - 1; i++) {
    var term = equ[i];
    if (i == 0) {
      var dt = divideTerm(term, division.split("x")[0], "x");
      output += dt + "+";
      dt = multiplyTerm(dt, division.split("x")[1], "x");
      lastTerm = dt;
    } else {
      var dt = subtractTerm(term, lastTerm, "x");
      dt = divideTerm(dt, division.split("x")[0], "x");
      output += dt + "+";
      dt = multiplyTerm(dt, division.split("x")[1], "x");
      lastTerm = dt;
    }
  }
  //Format output
  output = output.replace(/\+([+-])/g, "$1");
  output = output.replace(/x\^0\+$/g, "");
  output = output.replace(/x\^1/g, "x");
  //Calculate remainder
  lastTerm = lastTerm.replace(/x\^0/g, "");
  output +=
    " : Remainder [" +
    String(Number(equ[equ.length - 1]) - Number(lastTerm)) +
    "]";
  return output;
}

function longDivision(message_poly, generator_poly) {
  //galois_field_table.indexOf(integer) = alpha power value
  //Add spaces to the equation to break it apart
  //Split the equation at the spaces
  // multiply the lead term of the message poly by generator poly
  for (let i = 0; i < 274; i++) {
    let first_term = message_poly[0].split("x");
    var alpha_power = galois_field_table.indexOf(first_term[0]);
    // multiplies the lead term of the message poly by the generator poly and, simultanouelsy converting the entire generator poly to integer
    var generator_poly_copy = generator_poly.map(term => {
      var term_split = term.split("x");
      var term_alpha = Number(term_split[0]);
      var added_term =
        alpha_power + term_alpha >= 256
          ? (alpha_power + term_alpha) % 255
          : alpha_power + term_alpha;
      var integer_term = galois_field_table[added_term];
      return `${integer_term}x${term_split[1]}`;
    });

    //XOR the generator_poly (now with integer notation) with the message polynomial, those with the same x_power, XOR by 0 with those "outside" the range of the generator_poly
    for (let j = 0; j < generator_poly_copy.length; j++) {
      let generator_term = generator_poly_copy[j].split("x")[0];
      let message_term = message_poly[j] ? message_poly[j].split("x") : [0, 0];
      message_poly[j] = `${message_term[0] ^ Number(generator_term)}x${
        message_term[1]
      }`;
    }

    //discard the first term (which is 0)
    message_poly.shift();
  }

  console.log(message_poly); //Final 18 EC-codewords

  //LOOP

  //console.log(message_poly); // lead_term should be 0, it is not. What's wrong. INvestigate tomorrow
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
  if (encodedBinary) {
    let qr_chunks = comeplete_qr_code(encodedBinary);
    let integer_chunks = qr_chunks.map(chunk => parseInt(chunk, 2)); //converts the byte chunks into integer, necessary for message polynomial (QR-related), these are coefficients
    let message_polynomial = integer_chunks.map(
      (integer, index) =>
        `${integer}x${integer_chunks.length - (1 + index) + 18}`
    );
    generator_poly = generator_poly.replace(/\s/g, "");
    generator_poly = generator_poly.split("+");
    longDivision(message_polynomial, generator_poly);
    let group_one = [qr_chunks.splice(0, 68), qr_chunks.splice(68, 136)];
    let group_two = [qr_chunks.splice(136, 205), qr_chunks.splice(205, 274)];
  }
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
