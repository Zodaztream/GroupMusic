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
import querystring from "querystring";

export const authEndpoint = "https://accounts.spotify.com/authorize?";
//const keys = require("../../data.json");
var client_id = "d5a94039038d4a12b5816fd9bf1e6af5"; // Your client id
//var client_secret = keys["secret_key"]; // Your secret
var redirect_uri = "com.example.cordovaspotifyapp";
/// HELLO WORLD EXAMPLE QR CODE CONSTANTS
const H_encoded_string =
  "00100000 01011011 00001011 01111000 11010001 01110010 11011100 01001101 01000011 01000000 11101100 00010001 11101100";

///

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

function number_to_binary(input) {
  var byte = "00000000";
  var binary = parseInt(input, 10).toString(2);
  byte = byte.slice(0, 8 - binary.length);
  byte += binary;
  return byte;
}

function binary_to_number(input) {
  return parseInt(input, 2);
}

function comeplete_qr_code(encoded) {
  // this takes all bits rearrenges them into a complete QR code order and returns them into equal chunks of 8 bits long
  let all_bits = `${mode_length}${encoded}${terminator_bits}${subsequent_bits}`;
  return all_bits.replace(/\s+/g, "").match(/.{1,8}/g); //returns array of 8 bit chunks (strings)
  //.join(" ");
}

function longDivision(message_poly, generator_poly) {
  var init_length = message_poly.length;
  for (let i = 0; i < init_length; i++) {
    let first_term = message_poly[0].split("x");
    var alpha_power = galois_field_table.indexOf(first_term[0]);
    // multiplies the lead term of the message poly by the generator poly and, simultanouelsy converting the entire generator poly to integer
    var generator_poly_copy = generator_poly.map(term => {
      var term_split = term.split("x");
      var term_alpha = Number(term_split[0]);
      var added_term = alpha_power + term_alpha >= 255 ? (alpha_power + term_alpha) % 255 : alpha_power + term_alpha;
      var integer_term = galois_field_table[added_term];
      return `${integer_term}x${term_split[1]}`;
    });

    //XOR the generator_poly (now with integer notation) with the message polynomial. XOR by 0 with those "outside" the range of the generator_poly
    for (let j = 0; j < generator_poly_copy.length; j++) {
      let generator_term = generator_poly_copy[j].split("x")[0];
      let message_term = message_poly[j] ? message_poly[j].split("x") : [0, 0];
      message_poly[j] = `${Number(message_term[0]) ^ Number(generator_term)}x${message_term[1]}`;
    }

    console.log(message_poly);

    //discard ALL 0 terms which are at the beginning
    while (Number(message_poly[0].split("x")[0]) === 0) {
      message_poly.shift();
      i++;
    } // this counts as extra step if there are more than one 0s in the beginning.
    i--;
  }

  //console.log(message_poly); //Final 18 EC-codewords
  return message_poly.map(item => item.split("x")[0]);
}

const finder_pattern = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 0, 0, 0, 0, 0, 1, 0],
  [0, 1, 0, 1, 1, 1, 0, 1, 0],
  [0, 1, 0, 1, 1, 1, 0, 1, 0],
  [0, 1, 0, 1, 1, 1, 0, 1, 0],
  [0, 1, 0, 0, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0]
];

const alignment_pattern = [[1, 1, 1, 1, 1], [1, 0, 0, 0, 1], [1, 0, 1, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1]];

//It's here and not as a state because a state would trigger new updates constantly, we don't want that. We just want a temp storage for the module placement!
/**
 * Finds an overlapping pixel by looking if
 * the ith module exists in the blacklist.
 * @param {integer} x
 * @param {integer} y
 */
var blacklist = [];

const is_not_overlapping = (x, y) => {
  //if (y < 0 || y > 20) return false;
  return blacklist.indexOf(x + y * 57) === -1;
};

const binary_poly_division = (input, divide) => {
  var byte = Array(input.length).join("0");
  byte = byte.slice(0, input.length - divide.length);
  divide += byte;
  //assert the same size
  console.assert(input.length === divide.length, [input.length, divide.length]);
  var XOR = parseInt(binary_to_number(input) ^ binary_to_number(divide), 10).toString(2);

  return XOR;
};

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
  const [encodedBinary, setEncodedBinary] = useState("");
  const [state, setState] = useState(null);
  const canvasRef = React.useRef(null);
  const [dataBits, setDataBits] = useState("");

  const draw_modules_at = (x, y, SIZE, context, modules) => {
    modules.forEach((subarray, i) => {
      subarray.forEach((module, j) => {
        if (module === 1) context.fillRect(j * SIZE + x * SIZE, i * SIZE + y * SIZE, SIZE, SIZE);
        // need special case for -1,
        if ((x === -1 && j === 0) || (y === -1 && i === 0)) return; //skip
        blacklist.push(j + x + (y + i) * 57);
      });
    });
  };

  useEffect(() => {
    const SIZE = 4;
    const context = canvasRef.current.getContext("2d");
    //reset canvas and blacklist
    //context.fillRect = "rgba(0,0,0,0)";
    //context.fillRect(canvasRef.left, canvasRef.top, canvasRef.width, canvasRef.height)
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    context.beginPath();
    blacklist = [];

    // Add the three initial finder patterns
    draw_modules_at(-1, -1, SIZE, context, finder_pattern);

    draw_modules_at((10 - 1) * 4 + 21 - 7 - 1, -1, SIZE, context, finder_pattern);
    draw_modules_at(-1, (10 - 1) * 4 + 21 - 7 - 1, SIZE, context, finder_pattern);

    // draw alignment_patterns, they need to be placed correctly, (from the middle point, do this tomorrow) (i.e minus 2 on both X and Y axis)
    draw_modules_at(6 - 2, 28 - 2, SIZE, context, alignment_pattern); //(VERSION 10 alignment patterns)
    draw_modules_at(28 - 2, 28 - 2, SIZE, context, alignment_pattern);
    draw_modules_at(28 - 2, 6 - 2, SIZE, context, alignment_pattern);
    draw_modules_at(28 - 2, 50 - 2, SIZE, context, alignment_pattern);
    draw_modules_at(50 - 2, 50 - 2, SIZE, context, alignment_pattern);
    draw_modules_at(50 - 2, 28 - 2, SIZE, context, alignment_pattern);

    //add the timing patterns
    var i;
    for (i = 0; i < 50; i++) {
      blacklist.push(6 + i + 6 * 57);
      blacklist.push(6 + (6 + i) * 57);
      if (i % 2 === 0) {
        context.fillRect((6 + i) * SIZE, 6 * SIZE, SIZE, SIZE);
        context.fillRect(6 * SIZE, (6 + i) * SIZE, SIZE, SIZE);
      }
    }
    // add dark module
    draw_modules_at(8, 4 * 10 + 9, SIZE, context, [[1]]);

    //reserve format info areas (I could draw these first)
    let upper_left = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    draw_modules_at(0, 8, SIZE, context, [upper_left]);
    let upper_left_transpose = upper_left.map(col => [col]);
    draw_modules_at(8, 0, SIZE, context, upper_left_transpose);
    let upper_right = [0, 0, 0, 0, 0, 0, 0, 0];
    draw_modules_at((10 - 1) * 4 + 21 - 7 - 1, 8, SIZE, context, [upper_right]);
    let lower_left = upper_right.map(col => [col]);
    draw_modules_at(8, (10 - 1) * 4 + 21 - 7 - 1, SIZE, context, lower_left);

    //reserve version area
    let version_area = [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]];
    draw_modules_at(0, (10 - 1) * 4 + 21 - 7 - 1 - 3, SIZE, context, version_area);

    let version_area_transpose = version_area[0].map((_, index) => version_area.map(row => row[index]));
    draw_modules_at((10 - 1) * 4 + 21 - 7 - 1 - 3, 0, SIZE, context, version_area_transpose);

    //add the databits (REFACTOR CODE LATER)
    if (dataBits) {
      // start drawing position is at 20,20, (probably do this as a class instead idk)

      //console.log(dataBits);
      var i = 0; //bit index
      var size = 10 * 4 + 17; //v = 1,

      for (var right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (var vert = 0; vert < size; vert++) {
          //vertical counter
          for (var j = 0; j < 2; j++) {
            var x = right - j; // actual X coordinate
            var upward = ((right + 1) & 2) === 0; //bitwise AND
            var y = upward ? size - 1 - vert : vert; // actual y coordinate
            if (is_not_overlapping(x, y)) {
              var bit = dataBits[i];
              if ((x + y) % 2 === 0) bit = bit == 1 ? 0 : 1; //invert bit, mask pattern 0
              draw_modules_at(x, y, SIZE, context, [[Number(bit)]]);
              //sleep(5000);
              //The bits are not 100% correct. So, must be wrong with the solomon reed algorithm? EC codewords must be wrong somewhere.
              //We can investigate this. Because the wrong bits come towards the end (CONFIRM THIS) and that's where the Ec codewords go.
              i++;
            }
          }
        }
      }
    }

    //Format string, we are using mask apttern 0
    var five_bit_format = "01000";
    var format_string = "10000000000000"; // L-level and mask pattern 0

    while (format_string.length > 10) {
      var gen_poly = "10100110111";
      var format_string = binary_poly_division(format_string, gen_poly);
    }
    var combined_format = `${five_bit_format}${format_string}`;
    var final_format_string = parseInt(
      binary_to_number(combined_format) ^ binary_to_number("101010000010010"),
      10
    ).toString(2);

    // 	111011111000100
    final_format_string = [..."111011111000100"].map(item => Number(item));
    //Possible to draw over reversed bits
    var upper_left_format = [
      [...final_format_string.slice(0, 6)],
      [...final_format_string.slice(6, 8)],
      [...final_format_string.slice(9, 15)].reverse().map(col => [col]),
      [...final_format_string.slice(8, 9)].reverse().map(col => [col])
    ];
    var bottom_left_format = [...final_format_string.slice(0, 7)].reverse().map(col => [col]);
    var upper_right_format = [...final_format_string.slice(7, 15)];

    // "don't forget to JUMP over the 6th bit for the upper left
    draw_modules_at(0, 8, SIZE, context, [upper_left_format[0]]);
    draw_modules_at(7, 8, SIZE, context, [upper_left_format[1]]);
    draw_modules_at(8, 0, SIZE, context, upper_left_format[2]);
    draw_modules_at(8, 7, SIZE, context, upper_left_format[3]);
    draw_modules_at((10 - 1) * 4 + 21 - 7 - 1, 8, SIZE, context, [upper_right_format]);
    draw_modules_at(8, (10 - 1) * 4 + 21 - 7, SIZE, context, bottom_left_format);

    // Fill in the 6 x 3 version information (from QR-code specification)
    var version_information = [..."001010010011010011"].map(bit => Number(bit)).reverse();
    var version_information_array = [
      version_information.filter((_, index) => index % 3 === 0),
      version_information.filter((_, index) => index % 3 === 1),
      version_information.filter((_, index) => index % 3 === 2)
    ];
    draw_modules_at(0, (10 - 1) * 4 + 21 - 7 - 1 - 3, SIZE, context, version_information_array);
    var t_version_information_array = version_information_array[0].map((_, index) =>
      version_information_array.map(row => row[index])
    );
    //could do a "draw queue" instead of doing this everytime
    draw_modules_at((10 - 1) * 4 + 21 - 7 - 1 - 3, 0, SIZE, context, t_version_information_array);
  }, [canvasRef, dataBits]);

  var Spotify = window.cordova.plugins.SpotifyPlugin;

  if (encodedBinary && !dataBits) {
    //This is done twice, which we don't want.
    let qr_chunks = comeplete_qr_code(encodedBinary); // length is correct
    //converts the byte chunks into integer, necessary for EC calculations (QR-related), these are the coefficients
    let integer_chunks = qr_chunks.map(chunk => parseInt(chunk, 2));
    let message_polynomial = integer_chunks.map(
      (integer, index) => `${integer}x${integer_chunks.length - (1 + index) + 18}`
    );
    var generator_poly_new = generator_poly.replace(/\s/g, "");
    var generator_poly_new = generator_poly.split("+");
    //Bytes divided into bytes and groups as per the QR specification for 10-L
    var group_one = [integer_chunks.splice(0, 68), integer_chunks.splice(0, 68)];
    var group_two = [integer_chunks.splice(0, 69), integer_chunks.splice(0, 69)];
    // the error correction codewords for each block (4 blocks, in order)

    var EC_codewords = [
      longDivision(message_polynomial.splice(0, 68), generator_poly_new),
      longDivision(message_polynomial.splice(0, 68), generator_poly_new),
      longDivision(message_polynomial.splice(0, 69), generator_poly_new),
      longDivision(message_polynomial.splice(0, 69), generator_poly_new)
    ];

    //Interleave the message blocks,
    var interleaved = [];
    var interleaved_ec = [];
    while (group_two[0].length > 0) {
      if (group_one[0].length > 0) {
        interleaved.push(group_one[0].shift());
        interleaved.push(group_one[1].shift());
      }
      interleaved.push(group_two[0].shift());
      interleaved.push(group_two[1].shift());
      //interleave EC blocks
      if (EC_codewords[0].length > 0) {
        interleaved_ec.push(EC_codewords[0].shift());
        interleaved_ec.push(EC_codewords[1].shift());
        interleaved_ec.push(EC_codewords[2].shift());
        interleaved_ec.push(EC_codewords[3].shift());
      }
    }

    var combined_interleaved = [...interleaved, ...interleaved_ec].map(item => number_to_binary(item));
    var complete_message = combined_interleaved.join("");

    console.log(complete_message.length);

    //it is larger than 274 sinc we're adding the EC correction.
    setDataBits(complete_message);
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
            console.log(res);
            setDataBits("");
            setEncodedBinary(
              res
                .split("")
                .map(char => {
                  return [hex_to_binary(characters_to_hex(char))];
                })
                .join(" ")
            );
            // convert back from binary and compare it against res
            var binary_string = res
              .split("")
              .map(char => {
                return [hex_to_binary(characters_to_hex(char))];
              })
              .join(" ");

            var converted_string = binary_string
              .split(" ")
              .map(byte => hex_to_character(binary_to_hex(byte)))
              .join("");
            //console.log(converted_string);
            //console.log(res);
            console.assert(res === converted_string, ["FAILED STRING COMPARISON"]);
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
          }
          // This is when we want to retrieve token manually
          //Spotify.getToken(
          //  function(res) {
          //    // This tests that the decoded binary value is correct debugging purposes
          //    let temp = encodedBinary
          //      .split(" ")
          //      .map(binary => {
          //        return hex_to_character(binary_to_hex(binary));
          //      })
          //      .join("");
          //    console.log(res === temp);
          //  },
          //  function(error) {
          //    alert(error);
          //  }
          //);
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
      <h1>{"Hello"}</h1>
      <div style={{ display: "block", marginLeft: "auto", marginRight: "auto" }}>
        <canvas
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            marginLeft: "-150px",
            marginTop: "-100px"
          }}
          ref={canvasRef}
          width={400}
          height={400}
        />
      </div>
    </div>
  );
}

export default App;
