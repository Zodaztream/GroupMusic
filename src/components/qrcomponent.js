import React, { useState, useEffect } from "react";
import * as qr from "./qr.js";
const SIZE = 4;
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

function QrComponent(props) {
  const canvasRef = React.useRef(null);

  const draw_modules_at = (x, y, modules) => {
    const context = canvasRef.current.getContext("2d");
    modules.forEach((subarray, i) => {
      subarray.forEach((module, j) => {
        if (module === 1) context.fillRect(j * SIZE + x * SIZE, i * SIZE + y * SIZE, SIZE, SIZE);
        // need special case for -1,
        if ((x === -1 && j === 0) || (y === -1 && i === 0)) return; //skip
        blacklist.push(j + x + (y + i) * 57);
      });
    });
  };

  const drawCodeWords = dataBits => {
    var i = 0; //bit index
    var size = 10 * 4 + 17; //version size, v = 10,

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
            draw_modules_at(x, y, [[Number(bit)]]);
            i++;
          }
        }
      }
    }
  };

  const drawPatterns = () => {
    draw_modules_at(-1, -1, finder_pattern);
    draw_modules_at((10 - 1) * 4 + 21 - 7 - 1, -1, finder_pattern);
    draw_modules_at(-1, (10 - 1) * 4 + 21 - 7 - 1, finder_pattern);
    draw_modules_at(6 - 2, 28 - 2, alignment_pattern); //(VERSION 10 alignment patterns)
    draw_modules_at(28 - 2, 28 - 2, alignment_pattern);
    draw_modules_at(28 - 2, 6 - 2, alignment_pattern);
    draw_modules_at(28 - 2, 50 - 2, alignment_pattern);
    draw_modules_at(50 - 2, 50 - 2, alignment_pattern);
    draw_modules_at(50 - 2, 28 - 2, alignment_pattern);
  };

  const drawTimingPatterns = () => {
    var i;
    const context = canvasRef.current.getContext("2d");
    for (i = 0; i < 50; i++) {
      blacklist.push(6 + i + 6 * 57);
      blacklist.push(6 + (6 + i) * 57);
      if (i % 2 === 0) {
        context.fillRect((6 + i) * SIZE, 6 * SIZE, SIZE, SIZE);
        context.fillRect(6 * SIZE, (6 + i) * SIZE, SIZE, SIZE);
      }
    }
  };

  const reserveVersionAreas = () => {
    let upper_left = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    draw_modules_at(0, 8, [upper_left]);
    let upper_left_transpose = upper_left.map(col => [col]);
    draw_modules_at(8, 0, upper_left_transpose);
    let upper_right = [0, 0, 0, 0, 0, 0, 0, 0];
    draw_modules_at((10 - 1) * 4 + 21 - 7 - 1, 8, [upper_right]);
    let lower_left = upper_right.map(col => [col]);
    draw_modules_at(8, (10 - 1) * 4 + 21 - 7 - 1, lower_left);

    //reserve version area
    let version_area = [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]];
    draw_modules_at(0, (10 - 1) * 4 + 21 - 7 - 1 - 3, version_area);

    let version_area_transpose = version_area[0].map((_, index) => version_area.map(row => row[index]));
    draw_modules_at((10 - 1) * 4 + 21 - 7 - 1 - 3, 0, version_area_transpose);
  };

  const drawVersionAreas = () => {
    //For mask pattern 0, L
    var final_format_string = [..."111011111000100"].map(item => Number(item));
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
    draw_modules_at(0, 8, [upper_left_format[0]]);
    draw_modules_at(7, 8, [upper_left_format[1]]);
    draw_modules_at(8, 0, upper_left_format[2]);
    draw_modules_at(8, 7, upper_left_format[3]);
    draw_modules_at((10 - 1) * 4 + 21 - 7 - 1, 8, [upper_right_format]);
    draw_modules_at(8, (10 - 1) * 4 + 21 - 7, bottom_left_format);

    // Fill in the 6 x 3 version information (from QR-code specification)
    var version_information = [..."001010010011010011"].map(bit => Number(bit)).reverse();
    var version_information_array = [
      version_information.filter((_, index) => index % 3 === 0),
      version_information.filter((_, index) => index % 3 === 1),
      version_information.filter((_, index) => index % 3 === 2)
    ];
    draw_modules_at(0, (10 - 1) * 4 + 21 - 7 - 1 - 3, version_information_array);
    var t_version_information_array = version_information_array[0].map((_, index) =>
      version_information_array.map(row => row[index])
    );
    //could do a "draw queue" instead of doing this everytime
    draw_modules_at((10 - 1) * 4 + 21 - 7 - 1 - 3, 0, t_version_information_array);
  };

  useEffect(() => {
    const context = canvasRef.current.getContext("2d");
    // props.res to access the access token
    var binaryMessage = props.res
      .split("")
      .map(char => {
        return [qr.hex_to_binary(qr.characters_to_hex(char))];
      })
      .join(" ");

    var completeMessage = qr.createFullMessage(binaryMessage);

    //Clear QRCODE & Reset necessary variables.
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    context.beginPath();
    blacklist = [];

    drawPatterns();
    drawTimingPatterns();
    //Dark module for V=10
    draw_modules_at(8, 4 * 10 + 9, [[1]]);
    reserveVersionAreas();
    drawCodeWords(completeMessage);
    drawVersionAreas();
  }, [props, canvasRef]);

  return (
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
  );
}

export default QrComponent;
