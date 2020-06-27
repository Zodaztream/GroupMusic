var cors = require("cors");
var querystring = require("querystring");
var cookieParser = require("cookie-parser");

var express = require("express"); // Express web server framework
var request = require("request"); // "Request" library

var client_id = ""; // Your client id
var client_secret = ""; // Your secret
var redirect_uri = "http://localhost:8888/callback"; // Your redirect uri, but will this redirect the page back, or will it perform a chained call to this redirect uri, subsequently be thrown
// back?

var app = express();
var stateKey = "spotify_auth_state";

app
  .use(express.static(__dirname + "../../public"))
  .use(cors())
  .use(cookieParser());

module.exports = { app };
/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
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
  var scope = "user-read-private user-read-email";
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state
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
        grant_type: "authorization_code"
      },
      headers: {
        Authorization:
          "Basic " +
          new Buffer(client_id + ":" + client_secret).toString("base64")
      },
      json: true
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
        json: true
      };

      // then we use "options" to access stuff /perhaps save the token in localstorage or something?

      request.get(options, (error, response, body) => {
        console.log(body);
      });

      // or pass the token to browser
      res.redirect(
        "http://localhost:3000/" +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
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
        new Buffer(client_id + ":" + client_secret).toString("base64")
    },
    form: {
      grant_type: "refresh_token",
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        access_token: access_token
      });
    }
  });
});

// listen on port 8888
app.listen(8888);
