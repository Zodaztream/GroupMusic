// contains helper functions for networking
import queryString from "querystring";

export const handleAddQueue = (trackUri = null) => {
  if (!trackUri) trackUri = "spotify:track:3Fzlg5r1IjhLk2qRw667od";
  let headers = new Headers();

  const access_token = localStorage.getItem("access_token");
  const url = "https://api.spotify.com/v1/me/player/queue";

  headers.append("Authorization", "Bearer " + access_token);

  const PromiseAddQueue = fetch(
    url +
      "?" +
      queryString.stringify({
        uri: trackUri
      }),
    {
      method: "POST",
      mode: "cors",
      headers: headers,
      json: true
    }
  )
    .then(response => response.text())
    .then(responseData => console.log(responseData));

  return PromiseAddQueue;
};
