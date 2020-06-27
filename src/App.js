import React, { useState } from "react";
import logo from "./logo.svg";
import "./App.css";
import { useModal } from "react-modal-hook";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import { useHistory, Redirect, Link } from "react-router-dom";
import { withRouter } from "react-router";

function App() {
  const history = useHistory();
  const [on, setOn] = useState(false);
  const [state, setState] = useState(null);
  const [showSpotify, hideSpotify] = useModal(
    () => (
      <Dialog open={on} onClose={() => setOn(false)}>
        <div>hello</div>
      </Dialog>
    ),
    [on, setOn]
  );

  return (
    <Button
      variant="contained"
      color="blue"
      onClick={() => {
        window.location.assign("http://localhost:8888/login");
      }}
    >
      Log in
    </Button>
  );
}

export default App;
