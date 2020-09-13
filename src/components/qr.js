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

/**
 * Takes 1 character and outputs it's hex value (without 0x)
 * @param {string} input
 */
export function characters_to_hex(input) {
  return input.charCodeAt(0).toString(16);
}
/**
 * Takes a hex value (integer part) and converts into 1 byte
 * @param {string} input
 */
export function hex_to_binary(input) {
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
export function binary_to_hex(input) {
  return parseInt(input, 2).toString(16);
}

/**
 * Takes a string of hex (without 0x) and converts into character
 * as per the ISO standard
 * @param {string} input
 */
export function hex_to_character(input) {
  return String.fromCharCode("0x" + input);
}

export function number_to_binary(input) {
  var byte = "00000000";
  var binary = parseInt(input, 10).toString(2);
  byte = byte.slice(0, 8 - binary.length);
  byte += binary;
  return byte;
}

export function binary_to_number(input) {
  return parseInt(input, 2);
}

export function comeplete_qr_code(encoded) {
  // this takes all bits rearrenges them into a complete QR code order and returns them into equal chunks of 8 bits long
  let all_bits = `${mode_length}${encoded}${terminator_bits}${subsequent_bits}`;
  return all_bits.replace(/\s+/g, "").match(/.{1,8}/g); //returns array of 8 bit chunks (strings)
  //.join(" ");
}

export const binary_poly_division = (input, divide) => {
  var byte = Array(input.length).join("0");
  byte = byte.slice(0, input.length - divide.length);
  divide += byte;
  //assert the same size
  console.assert(input.length === divide.length, [input.length, divide.length]);
  var XOR = parseInt(binary_to_number(input) ^ binary_to_number(divide), 10).toString(2);

  return XOR;
};

export function longDivision(message_poly, generator_poly) {
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

export function createFullMessage(encodedBinary) {
  let qr_chunks = comeplete_qr_code(encodedBinary);
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
  return complete_message;
}
