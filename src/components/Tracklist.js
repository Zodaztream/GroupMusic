import React from "react";
import { useSelector } from "react-redux";
import DynamicList, { createCache } from "react-window-dynamic-list";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import { makeStyles } from "@material-ui/core/styles";
import PropTypes from "prop-types";
import { FixedSizeList } from "react-window";
import { Paper, TextareaAutosize, Avatar } from "@material-ui/core";

const useStyles = makeStyles(theme => ({
  root: {
    overflow: "auto",
    width: "100%",
    height: 400,
    maxWidth: 300,
    backgroundColor: theme.palette.background.paper
  }
}));

function generateListElement(track, index) {
  return (
    <ListItem button key={index}>
      <ListItemAvatar>
        <Avatar src={`${track["image"]["url"]}`} />
      </ListItemAvatar>
      <ListItemText primary={`${track["name"]}`} />
    </ListItem>
  );
}

function Tracklist() {
  const tracks = useSelector(state => state.tracks);
  const classes = useStyles();
  return (
    <div className={classes.style}>
      {tracks.length > 0 ? (
        <Paper className={classes.root}>
          <List>
            {tracks.map((track, index) => generateListElement(track, index))}
          </List>
        </Paper>
      ) : (
        ""
      )}
    </div>
  );
}

export default Tracklist;
