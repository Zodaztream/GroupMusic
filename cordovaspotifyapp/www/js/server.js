var cors = require("cors");
var querystring = require("querystring");
var cookieParser = require("cookie-parser");

var express = require("express"); // Express web server framework
var request = require("request"); // "Request" library

const keys = require("../../data.json");
var client_id = "d5a94039038d4a12b5816fd9bf1e6af5"; // Your client id
var client_secret = keys["secret_key"]; // Your secret
var redirect_uri = "com.example.cordovaspotifyapp://callback"; // Your redirect uri, but will this redirect the page back, or will it perform a chained call to this redirect uri, subsequently be thrown
// back?
// if window.cordova then do redirect uri else url.  but sicne we have two separate files, we could jst change the one for the WWW to redict uri instead of url.
var app = express();
var stateKey = "spotify_auth_state";
// localstorage instead of db, would not work accross devices. but WebSql works for android
app
  .use(express.static(__dirname + "../../public"))
  .use(cors())
  .use(cookieParser());

// set up SQ-lite database
const sqlite3 = require("sqlite3").verbose();
let db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    return console.log(err.message);
  }
  console.log("Connected to DB");
});

const sql = `
CREATE TABLE IF NOT EXISTS rooms 
(
  code TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL
);
`;

db.run(sql);

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function (length) {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

app.get("/login", (req, res) => {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // request authentication
  var scope = "user-read-private user-read-email user-modify-playback-state";
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
      })
  );
});

//think this is a get request
app.get("/callback", (req, res) => {
  var code = req.query.code || null; // request code
  var state = req.query.state || null; // ?
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect("/#" + querystring.stringify({ error: "state_mismatch" })); // this might redirect elsewhere ( if it is supposed to redirect me) or return the string or something clever like that
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code",
      },
      headers: {
        Authorization:
          "Basic " +
          new Buffer(client_id + ":" + client_secret).toString("base64"),
      },
      json: true,
    };
  }

  // post
  request.post(authOptions, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token,
        refresh_token = body.refresh_token;

      // This is an example to access api
      var options = {
        url: "https://api.spotify.com/v1/me",
        headers: { Authorization: "Bearer " + access_token },
        json: true,
      };

      var roomCode = createRoom(generateRandomString(6), access_token);

      // then we use "options" to access stuff /perhaps save the token in localstorage or something?

      request.get(options, (error, response, body) => {
        //console.log(body);
      });

      // or pass the token to browser
      res.redirect(
        "http://" +
          req.hostname +
          ":3000?" +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token,
            roomCode: roomCode,
          })
      );
    }
  });
});

app.get("/refresh_token", (req, res) => {
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: "https://accounts.spotify.com/api/token",
    headers: {
      Authorization:
        "Basic " +
        new Buffer(client_id + ":" + client_secret).toString("base64"),
    },
    form: {
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    },
    json: true,
  };

  request.post(authOptions, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        access_token: access_token,
      });
    }
  });
});

app.get("/join", (req, res) => {
  var code = req.query.code;

  const sql = `
  SELECT token FROM rooms WHERE code=?;
  `;
  db.get(sql, [code], (err, row) => {
    if (!row) {
      res.redirect(
        "http://" +
          req.hostname +
          ":3000?" +
          querystring.stringify({
            error: true,
          })
      );
      return;
    }
    console.log("successfully selected");
    res.redirect(
      "http://" +
        req.hostname +
        ":3000?" +
        querystring.stringify({
          access_token: row.token,
        })
    );
  });
});

function createRoom(roomCode, access_token) {
  const sql = `
  INSERT OR IGNORE INTO rooms(code, token) VALUES(?, ?);
  `;
  db.run(sql, [roomCode, access_token], (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log(`Successfully created room with code ${roomCode}`);
  });
  // this would return roomCode and then the code would be tagged in the url
  return roomCode;
}

// add app.get for room code here to put the user into the correct room with the correct token
app.listen(8888);
