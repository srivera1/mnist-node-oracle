/* Copyright (c) 2015, 2023, Oracle and/or its affiliates. */
/* Copyright (c) 2024, Sergio Rivera.                      */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   webapp.js
 *
 * DESCRIPTION
 *   A web based application displaying MNIST model front end.
 *
 *   The script creates an HTTP server listening on port 7000 and accepts a URL
 *   parameter for the MNIST image, for example: http://localhost:7000/0,0,1,0, ...
 *
 *   In some networks forced pool termination may hang unless you have
 *   'disable_oob=on' in sqlnet.ora, see
 *   https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#limiting-the-time-taken-to-execute-statements
 *
 *   In production applications, set poolMin=poolMax (and poolIncrement=0)
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

// Note: if you use Thick mode, and you increase poolMax, then you must also
// increase UV_THREADPOOL_SIZE before Node.js starts its thread pool.  If you
// set UV_THREADPOOL_SIZE too late, the value is ignored and the default size
// of 4 is used.
//
// On Windows you must set the UV_THREADPOOL_SIZE environment variable
// externally before running your application.
//
// Increasing UV_THREADPOOL_SIZE is not needed if you use Thin mode.
//
// process.env.UV_THREADPOOL_SIZE = 10; // set threadpool size to 10 for 10 connections


const http = require('http');
const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
var fs = require('fs');

// This example runs in both node-oracledb Thin and Thick modes.
//
// Optionally run in node-oracledb Thick mode
if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {

  // Thick mode requires Oracle Client or Oracle Instant Client libraries.
  // On Windows and macOS Intel you can specify the directory containing the
  // libraries at runtime or before Node.js starts.  On other platforms (where
  // Oracle libraries are available) the system library search path must always
  // include the Oracle library path before Node.js starts.  If the search path
  // is not correct, you will get a DPI-1047 error.  See the node-oracledb
  // installation documentation.
  let clientOpts = {};
  // On Windows and macOS Intel platforms, set the environment
  // variable NODE_ORACLEDB_CLIENT_LIB_DIR to the Oracle Client library path
  if (process.platform === 'win32' || (process.platform === 'darwin' && process.arch === 'x64')) {
    clientOpts = { libDir: process.env.NODE_ORACLEDB_CLIENT_LIB_DIR };
  }
  oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode
}

console.log(oracledb.thin ? 'Running in thin mode' : 'Running in thick mode');

const httpPort = 7000;

function printNumber(id) {
  for (var i = 0; i < 28; i++) {
    var tmp = "";
    for (var j = 0; j < 28; j++) {
      if (id[j + i * 28] > 0)
        tmp += " "
      else
        tmp += "·"
    }
    console.log(tmp)
  }
}

// If additionally using Database Resident Connection Pooling (DRCP), then set a connection class:
// oracledb.connectionClass = 'MYAPPNAME';

// Main entry point.  Creates a connection pool and an HTTP server
// that executes a query based on the URL parameter given.
// The pool values shown are the default values.
async function init() {
  try {
    await oracledb.createPool({
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: dbConfig.connectString,
    });
    // Create HTTP server and listen on port httpPort
    const server = http.createServer();
    server.on('error', (err) => {
      console.log('HTTP server problem: ' + err);
    });
    server.on('request', (request, response) => {
      if ("/favicon.ico" != request.url)
        handleRequest(request, response);
    });
    await server.listen(httpPort);
    console.log("Server is running at http://localhost:" + httpPort);
  } catch (err) {
    console.error("init() error: " + err.message);
  }
}

async function handleRequest(request, response) {

  // console.log("request.url: " + request.url)
  const urlparts = request.url.split("/");
  if (request.url.includes('style.css')) {
    response.setHeader('Content-type', 'text/css');
    response.write(fs.readFileSync('./src/style.css'));
    response.end();
    return;
  } else if (request.url.includes('script.js')) {
    response.setHeader('X-Content-Type-Options', 'text/script');
    response.write(fs.readFileSync('./src/script.js'));
    response.end();
    return;
  } else if (urlparts[1] == "canvas" || urlparts[1].length < 2) {
    return getCanvas(request, response);
  }

  var id = urlparts[1];
  id = id.split(",")
  let connection;
  try {
    if (id.length == 784) {
      // Checkout a connection from the default pool
      connection = await oracledb.getConnection();
      await connection.execute(
        `BEGIN
          DBMS_OUTPUT.ENABLE(NULL);
        END;`);

      console.log("Sending query...");
      printNumber(id);

      // Send predictor query to ORACLE server
      const result = await connection.execute(
        `SELECT prediction(DEEP_LEARNING_MODEL USING
          :idbv as PX1, :idbv as PX2, :idbv as PX3, :idbv as PX4, :idbv as PX5, :idbv as PX6, :idbv as PX7, :idbv as PX8, :idbv as PX9, :idbv as PX10, :idbv as PX11, :idbv as PX12, :idbv as PX13, :idbv as PX14, :idbv as PX15, :idbv as PX16, :idbv as PX17, :idbv as PX18, :idbv as PX19, :idbv as PX20, :idbv as PX21, :idbv as PX22, :idbv as PX23, :idbv as PX24, :idbv as PX25, :idbv as PX26, :idbv as PX27, :idbv as PX28, :idbv as PX29, :idbv as PX30, :idbv as PX31, :idbv as PX32, :idbv as PX33, :idbv as PX34, :idbv as PX35, :idbv as PX36, :idbv as PX37, :idbv as PX38, :idbv as PX39, :idbv as PX40, :idbv as PX41, :idbv as PX42, :idbv as PX43, :idbv as PX44, :idbv as PX45, :idbv as PX46, :idbv as PX47, :idbv as PX48, :idbv as PX49, :idbv as PX50, :idbv as PX51, :idbv as PX52, :idbv as PX53, :idbv as PX54, :idbv as PX55, :idbv as PX56, :idbv as PX57, :idbv as PX58, :idbv as PX59, :idbv as PX60, :idbv as PX61, :idbv as PX62, :idbv as PX63, :idbv as PX64, :idbv as PX65, :idbv as PX66, :idbv as PX67, :idbv as PX68, :idbv as PX69, :idbv as PX70, :idbv as PX71, :idbv as PX72, :idbv as PX73, :idbv as PX74, :idbv as PX75, :idbv as PX76, :idbv as PX77, :idbv as PX78, :idbv as PX79, :idbv as PX80, :idbv as PX81, :idbv as PX82, :idbv as PX83, :idbv as PX84, :idbv as PX85, :idbv as PX86, :idbv as PX87, :idbv as PX88, :idbv as PX89, :idbv as PX90, :idbv as PX91, :idbv as PX92, :idbv as PX93, :idbv as PX94, :idbv as PX95, :idbv as PX96, :idbv as PX97, :idbv as PX98, :idbv as PX99, :idbv as PX100, :idbv as PX101, :idbv as PX102, :idbv as PX103, :idbv as PX104, :idbv as PX105, :idbv as PX106, :idbv as PX107, :idbv as PX108, :idbv as PX109, :idbv as PX110, :idbv as PX111, :idbv as PX112, :idbv as PX113, :idbv as PX114, :idbv as PX115, :idbv as PX116, :idbv as PX117, :idbv as PX118, :idbv as PX119, :idbv as PX120, :idbv as PX121, :idbv as PX122, :idbv as PX123, :idbv as PX124, :idbv as PX125, :idbv as PX126, :idbv as PX127, :idbv as PX128, :idbv as PX129, :idbv as PX130, :idbv as PX131, :idbv as PX132, :idbv as PX133, :idbv as PX134, :idbv as PX135, :idbv as PX136, :idbv as PX137, :idbv as PX138, :idbv as PX139, :idbv as PX140, :idbv as PX141, :idbv as PX142, :idbv as PX143, :idbv as PX144, :idbv as PX145, :idbv as PX146, :idbv as PX147, :idbv as PX148, :idbv as PX149, :idbv as PX150, :idbv as PX151, :idbv as PX152, :idbv as PX153, :idbv as PX154, :idbv as PX155, :idbv as PX156, :idbv as PX157, :idbv as PX158, :idbv as PX159, :idbv as PX160, :idbv as PX161, :idbv as PX162, :idbv as PX163, :idbv as PX164, :idbv as PX165, :idbv as PX166, :idbv as PX167, :idbv as PX168, :idbv as PX169, :idbv as PX170, :idbv as PX171, :idbv as PX172, :idbv as PX173, :idbv as PX174, :idbv as PX175, :idbv as PX176, :idbv as PX177, :idbv as PX178, :idbv as PX179, :idbv as PX180, :idbv as PX181,
          :idbv as PX182, :idbv as PX183, :idbv as PX184, :idbv as PX185, :idbv as PX186, :idbv as PX187, :idbv as PX188, :idbv as PX189, :idbv as PX190, :idbv as PX191, :idbv as PX192, :idbv as PX193, :idbv as PX194, :idbv as PX195, :idbv as PX196, :idbv as PX197, :idbv as PX198, :idbv as PX199, :idbv as PX200, :idbv as PX201, :idbv as PX202, :idbv as PX203, :idbv as PX204, :idbv as PX205, :idbv as PX206, :idbv as PX207, :idbv as PX208, :idbv as PX209, :idbv as PX210, :idbv as PX211, :idbv as PX212, :idbv as PX213, :idbv as PX214, :idbv as PX215, :idbv as PX216, :idbv as PX217, :idbv as PX218, :idbv as PX219, :idbv as PX220, :idbv as PX221, :idbv as PX222, :idbv as PX223, :idbv as PX224, :idbv as PX225, :idbv as PX226, :idbv as PX227, :idbv as PX228, :idbv as PX229, :idbv as PX230, :idbv as PX231, :idbv as PX232, :idbv as PX233, :idbv as PX234, :idbv as PX235, :idbv as PX236, :idbv as PX237, :idbv as PX238, :idbv as PX239, :idbv as PX240, :idbv as PX241, :idbv as PX242, :idbv as PX243, :idbv as PX244, :idbv as PX245, :idbv as PX246, :idbv as PX247, :idbv as PX248, :idbv as PX249, :idbv as PX250, :idbv as PX251, :idbv as PX252, :idbv as PX253, :idbv as PX254, :idbv as PX255, :idbv as PX256, :idbv as PX257, :idbv as PX258, :idbv as PX259, :idbv as PX260, :idbv as PX261, :idbv as PX262, :idbv as PX263, :idbv as PX264, :idbv as PX265, :idbv as PX266, :idbv as PX267, :idbv as PX268, :idbv as PX269, :idbv as PX270, :idbv as PX271, :idbv as PX272, :idbv as PX273, :idbv as PX274, :idbv as PX275, :idbv as PX276, :idbv as PX277, :idbv as PX278, :idbv as PX279, :idbv as PX280, :idbv as PX281, :idbv as PX282, :idbv as PX283, :idbv as PX284, :idbv as PX285, :idbv as PX286, :idbv as PX287, :idbv as PX288, :idbv as PX289, :idbv as PX290, :idbv as PX291, :idbv as PX292, :idbv as PX293, :idbv as PX294, :idbv as PX295, :idbv as PX296, :idbv as PX297, :idbv as PX298, :idbv as PX299, :idbv as PX300, :idbv as PX301, :idbv as PX302, :idbv as PX303, :idbv as PX304, :idbv as PX305, :idbv as PX306, :idbv as PX307, :idbv as PX308, :idbv as PX309, :idbv as PX310, :idbv as PX311, :idbv as PX312, :idbv as PX313, :idbv as PX314, :idbv as PX315, :idbv as PX316, :idbv as PX317, :idbv as PX318, :idbv as PX319,
          :idbv as PX320, :idbv as PX321, :idbv as PX322, :idbv as PX323, :idbv as PX324, :idbv as PX325, :idbv as PX326, :idbv as PX327, :idbv as PX328, :idbv as PX329, :idbv as PX330, :idbv as PX331, :idbv as PX332, :idbv as PX333, :idbv as PX334, :idbv as PX335, :idbv as PX336, :idbv as PX337, :idbv as PX338, :idbv as PX339, :idbv as PX340, :idbv as PX341, :idbv as PX342, :idbv as PX343, :idbv as PX344, :idbv as PX345, :idbv as PX346, :idbv as PX347, :idbv as PX348, :idbv as PX349, :idbv as PX350, :idbv as PX351, :idbv as PX352, :idbv as PX353, :idbv as PX354, :idbv as PX355, :idbv as PX356, :idbv as PX357, :idbv as PX358, :idbv as PX359, :idbv as PX360, :idbv as PX361, :idbv as PX362, :idbv as PX363, :idbv as PX364, :idbv as PX365, :idbv as PX366, :idbv as PX367, :idbv as PX368, :idbv as PX369, :idbv as PX370, :idbv as PX371, :idbv as PX372, :idbv as PX373, :idbv as PX374, :idbv as PX375, :idbv as PX376, :idbv as PX377, :idbv as PX378, :idbv as PX379, :idbv as PX380, :idbv as PX381, :idbv as PX382, :idbv as PX383, :idbv as PX384, :idbv as PX385, :idbv as PX386, :idbv as PX387, :idbv as PX388, :idbv as PX389, :idbv as PX390, :idbv as PX391, :idbv as PX392, :idbv as PX393, :idbv as PX394, :idbv as PX395, :idbv as PX396, :idbv as PX397, :idbv as PX398, :idbv as PX399, :idbv as PX400, :idbv as PX401, :idbv as PX402, :idbv as PX403, :idbv as PX404, :idbv as PX405, :idbv as PX406, :idbv as PX407, :idbv as PX408, :idbv as PX409, :idbv as PX410, :idbv as PX411, :idbv as PX412, :idbv as PX413, :idbv as PX414, :idbv as PX415, :idbv as PX416, :idbv as PX417, :idbv as PX418, :idbv as PX419, :idbv as PX420, :idbv as PX421, :idbv as PX422, :idbv as PX423, :idbv as PX424, :idbv as PX425, :idbv as PX426, :idbv as PX427, :idbv as PX428, :idbv as PX429, :idbv as PX430, :idbv as PX431, :idbv as PX432, :idbv as PX433, :idbv as PX434, :idbv as PX435, :idbv as PX436, :idbv as PX437, :idbv as PX438, :idbv as PX439, :idbv as PX440, :idbv as PX441, :idbv as PX442, :idbv as PX443, :idbv as PX444, :idbv as PX445, :idbv as PX446, :idbv as PX447, :idbv as PX448, :idbv as PX449, :idbv as PX450, :idbv as PX451, :idbv as PX452, :idbv as PX453, :idbv as PX454, :idbv as PX455, :idbv as PX456, :idbv as PX457, :idbv as PX458, :idbv as PX459, :idbv as PX460, :idbv as PX461, :idbv as PX462, :idbv as PX463, :idbv as PX464, :idbv as PX465, :idbv as PX466, :idbv as PX467, :idbv as PX468, :idbv as PX469, :idbv as PX470, :idbv as PX471, :idbv as PX472, :idbv as PX473, :idbv as PX474, :idbv as PX475, :idbv as PX476, :idbv as PX477, :idbv as PX478, :idbv as PX479, :idbv as PX480, :idbv as PX481, :idbv as PX482, :idbv as PX483, :idbv as PX484, :idbv as PX485, :idbv as PX486, :idbv as PX487, :idbv as PX488, :idbv as PX489,
          :idbv as PX490, :idbv as PX491, :idbv as PX492, :idbv as PX493, :idbv as PX494, :idbv as PX495, :idbv as PX496, :idbv as PX497, :idbv as PX498, :idbv as PX499, :idbv as PX500, :idbv as PX501, :idbv as PX502, :idbv as PX503, :idbv as PX504, :idbv as PX505, :idbv as PX506, :idbv as PX507, :idbv as PX508, :idbv as PX509, :idbv as PX510, :idbv as PX511, :idbv as PX512, :idbv as PX513, :idbv as PX514, :idbv as PX515, :idbv as PX516, :idbv as PX517, :idbv as PX518, :idbv as PX519, :idbv as PX520, :idbv as PX521, :idbv as PX522, :idbv as PX523, :idbv as PX524, :idbv as PX525, :idbv as PX526, :idbv as PX527, :idbv as PX528, :idbv as PX529, :idbv as PX530, :idbv as PX531, :idbv as PX532, :idbv as PX533, :idbv as PX534, :idbv as PX535, :idbv as PX536, :idbv as PX537, :idbv as PX538, :idbv as PX539, :idbv as PX540, :idbv as PX541, :idbv as PX542, :idbv as PX543, :idbv as PX544, :idbv as PX545, :idbv as PX546, :idbv as PX547, :idbv as PX548, :idbv as PX549, :idbv as PX550, :idbv as PX551, :idbv as PX552, :idbv as PX553, :idbv as PX554, :idbv as PX555, :idbv as PX556, :idbv as PX557, :idbv as PX558, :idbv as PX559, :idbv as PX560, :idbv as PX561, :idbv as PX562, :idbv as PX563, :idbv as PX564, :idbv as PX565, :idbv as PX566, :idbv as PX567, :idbv as PX568, :idbv as PX569, :idbv as PX570, :idbv as PX571, :idbv as PX572, :idbv as PX573, :idbv as PX574, :idbv as PX575, :idbv as PX576, :idbv as PX577, :idbv as PX578, :idbv as PX579, :idbv as PX580, :idbv as PX581, :idbv as PX582, :idbv as PX583, :idbv as PX584, :idbv as PX585, :idbv as PX586, :idbv as PX587, :idbv as PX588, :idbv as PX589, :idbv as PX590, :idbv as PX591, :idbv as PX592, :idbv as PX593, :idbv as PX594, :idbv as PX595, :idbv as PX596, :idbv as PX597, :idbv as PX598, :idbv as PX599, :idbv as PX600, :idbv as PX601, :idbv as PX602, :idbv as PX603, :idbv as PX604, :idbv as PX605, :idbv as PX606, :idbv as PX607, :idbv as PX608, :idbv as PX609, :idbv as PX610, :idbv as PX611, :idbv as PX612, :idbv as PX613, :idbv as PX614, :idbv as PX615, :idbv as PX616, :idbv as PX617, :idbv as PX618, :idbv as PX619, :idbv as PX620, :idbv as PX621, :idbv as PX622, :idbv as PX623, :idbv as PX624, :idbv as PX625, :idbv as PX626, :idbv as PX627, :idbv as PX628,
          :idbv as PX629, :idbv as PX630, :idbv as PX631, :idbv as PX632, :idbv as PX633, :idbv as PX634, :idbv as PX635, :idbv as PX636, :idbv as PX637, :idbv as PX638, :idbv as PX639, :idbv as PX640, :idbv as PX641, :idbv as PX642, :idbv as PX643, :idbv as PX644, :idbv as PX645, :idbv as PX646, :idbv as PX647, :idbv as PX648, :idbv as PX649, :idbv as PX650, :idbv as PX651, :idbv as PX652, :idbv as PX653, :idbv as PX654, :idbv as PX655, :idbv as PX656, :idbv as PX657, :idbv as PX658, :idbv as PX659, :idbv as PX660, :idbv as PX661, :idbv as PX662, :idbv as PX663, :idbv as PX664, :idbv as PX665, :idbv as PX666, :idbv as PX667, :idbv as PX668, :idbv as PX669, :idbv as PX670, :idbv as PX671, :idbv as PX672, :idbv as PX673, :idbv as PX674, :idbv as PX675, :idbv as PX676, :idbv as PX677, :idbv as PX678, :idbv as PX679, :idbv as PX680, :idbv as PX681, :idbv as PX682, :idbv as PX683, :idbv as PX684, :idbv as PX685, :idbv as PX686, :idbv as PX687, :idbv as PX688, :idbv as PX689, :idbv as PX690, :idbv as PX691, :idbv as PX692, :idbv as PX693, :idbv as PX694, :idbv as PX695, :idbv as PX696, :idbv as PX697, :idbv as PX698, :idbv as PX699, :idbv as PX700, :idbv as PX701, :idbv as PX702, :idbv as PX703, :idbv as PX704, :idbv as PX705, :idbv as PX706, :idbv as PX707, :idbv as PX708, :idbv as PX709, :idbv as PX710, :idbv as PX711, :idbv as PX712, :idbv as PX713, :idbv as PX714, :idbv as PX715, :idbv as PX716, :idbv as PX717, :idbv as PX718, :idbv as PX719, :idbv as PX720, :idbv as PX721, :idbv as PX722, :idbv as PX723, :idbv as PX724, :idbv as PX725, :idbv as PX726, :idbv as PX727, :idbv as PX728, :idbv as PX729, :idbv as PX730, :idbv as PX731, :idbv as PX732, :idbv as PX733, :idbv as PX734, :idbv as PX735, :idbv as PX736, :idbv as PX737, :idbv as PX738, :idbv as PX739, :idbv as PX740, :idbv as PX741, :idbv as PX742, :idbv as PX743, :idbv as PX744, :idbv as PX745, :idbv as PX746, :idbv as PX747, :idbv as PX748, :idbv as PX749, :idbv as PX750, :idbv as PX751, :idbv as PX752, :idbv as PX753, :idbv as PX754, :idbv as PX755, :idbv as PX756, :idbv as PX757, :idbv as PX758, :idbv as PX759, :idbv as PX760, :idbv as PX761, :idbv as PX762, :idbv as PX763, :idbv as PX764, :idbv as PX765, :idbv as PX766, :idbv as PX767, :idbv as PX768, :idbv as PX769, :idbv as PX770, :idbv as PX771, :idbv as PX772, :idbv as PX773, :idbv as PX774, :idbv as PX775, :idbv as PX776, :idbv as PX777, :idbv as PX778, :idbv as PX779, :idbv as PX780, :idbv as PX781, :idbv as PX782, :idbv as PX783, :idbv as PX784
          ) pred FROM dual`,
        id);
      console.log("Result from db: ");
      console.log(result);

      displayResults(response, result);

    } else {
      console.log(id);
      console.log("Not an MNIST image!");
    }
  } catch (err) {
    handleError(response, "handleRequest() error", err);
  } finally {
    if (connection) {
      try {
        // Release the connection back to the connection pool
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

function getCanvas(request, response) {
  response.writeHead(200, { "Access-Control-Allow-Origin": "*" });
  response.write('<!DOCTYPE html>');
  response.write('');
  response.write('<!-- edited from https://maneprajakta.github.io/Digit_Recognition_Web_App/   -->');
  response.write('');
  response.write('<!-- MIT License   -->');
  response.write('');
  response.write('<!-- Copyright (c) 2020 Prajakta Mane   -->');
  response.write('');
  response.write('<!-- Permission is hereby granted, free of charge, to any person obtaining a copy   -->');
  response.write('<!-- of this software and associated documentation files (the "Software"), to deal   -->');
  response.write('<!-- in the Software without restriction, including without limitation the rights   -->');
  response.write('<!-- to use, copy, modify, merge, publish, distribute, sublicense, and/or sell   -->');
  response.write('<!-- copies of the Software, and to permit persons to whom the Software is   -->');
  response.write('<!-- furnished to do so, subject to the following conditions:   -->');
  response.write('');
  response.write('<!-- The above copyright notice and this permission notice shall be included in all   -->');
  response.write('<!-- copies or substantial portions of the Software.   -->');
  response.write('');
  response.write('<!-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR   -->');
  response.write('<!-- IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,   -->');
  response.write('<!-- FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE   -->');
  response.write('<!-- AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER   -->');
  response.write('<!-- LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,   -->');
  response.write('<!-- OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE   -->');
  response.write('<!-- SOFTWARE.   -->');
  response.write('');
  response.write('');
  response.write('<head>');
  response.write('  <title>Digit Recognition WebApp</title>');
  response.write('');
  response.write('  <meta name="viewport" content="width=device-width">');
  response.write('  <!-- GoogleFont -->');
  response.write('  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@600&display=swap" rel="stylesheet">');
  response.write('  <link href="https://fonts.googleapis.com/css2?family=Varela+Round&display=swap" rel="stylesheet">');
  response.write('  <link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@500&display=swap" rel="stylesheet">');
  response.write('  <link href="https://fonts.googleapis.com/css?family=Calistoga|Josefin+Sans:400,700|Pacifico&display=swap" rel="stylesheet">');
  response.write('  <!-- bootstrap -->');
  response.write('  <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">');
  response.write('  <!-- stylesheet -->');
  response.write('  <link rel="stylesheet" href="style.css">');
  response.write('  <!-- fontawesome -->');
  response.write('  <script src="https://kit.fontawesome.com/b3aed9cb07.js" crossorigin="anonymous"></script>');
  response.write('  ');
  response.write('  <script src="https://code.jquery.com/jquery-3.3.1.slim.min.js" integrity="sha384-q8i/X+965DzO0rT7abK41JStQIAqVgRVzpbzo5smXKp4YfRvH+8abtTE1Pi6jizo" crossorigin="anonymous"></script>');
  response.write('  <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js" integrity="sha384-UO2eT0CpHqdSJQ6hJty5KVphtPhzWj9WO1clHTMGa3JDZwrnQq4sF86dIHNDz0W1" crossorigin="anonymous"></script>');
  response.write('  <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js" integrity="sha384-JjSmVgyd0p3pXB1rRibZUAYoIIy6OrQ6VrjIEaFf/nJGzIxFDsf4x0xIM+B07jRM" crossorigin="anonymous"></script>');
  response.write('  <script src= ');
  response.write('"https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js"> ');
  response.write('    </script> ');
  response.write('</head>');
  response.write('');
  response.write('<body onload="init()">');
  response.write('');
  response.write(' ');
  response.write('  <section id="title">');
  response.write('    <h1 class="heading">Handwritten Digit Recognition Web App with ORACLE backend</h1>');
  response.write('');
  response.write('  </section>');
  response.write('');
  response.write('  <section id="content">');
  response.write('    <div id="sketchpadapp">');
  response.write('');
  response.write('      <div class="row">');
  response.write('        <div class="leftside">');
  response.write('');
  response.write('          <div class="">');
  response.write('            <canvas id="sketchpad" height="400" width="400">');
  response.write('            </canvas>');
  response.write('          </div>');
  response.write('');
  response.write('          <div class="buttons_div">');
  response.write('            <button type="button" class="btn btn-dark" id="predict_button">Predict</button>');
  response.write('            <button type="button" class="btn btn-dark" id="clear_button">&nbsp Clear &nbsp</button>');
  response.write('          </div>');
  response.write('        </div>');
  response.write('');
  response.write('        <div class="predicted_answer col-sm-6">');
  response.write('          <h2 id="prediction_heading">Prediction</h2>');
  response.write('          <h1 id="result">-</h1>');
  response.write('          <p id="floatValue">float value: -</p>');
  response.write('        </div>');
  response.write('      </div>');
  response.write('    </div>');
  response.write('  </section>  ');
  response.write('  <script src="script.js" charset="utf-8">');
  response.write('  </script>');
  response.write('</body>');
  response.write('</html>  ');
  response.end();
}

// Display query results -> send results as XML
function displayResults(response, result) {
  response.writeHead(200, { "Access-Control-Allow-Origin": "*" });
  for (let row = 0; row < result.rows.length; row++) {
    for (let col = 0; col < result.rows[row].length; col++) {
      response.write("<resultado>" + result.rows[row][col] + "</resultado>");
    }
  }
  response.end();
}

// Report an error
function handleError(response, text, err) {
  if (err) {
    text += ": " + err.message;
  }
  console.error(text);
  response.writeHead(500, { "Content-Type": "text/html" });
  response.write(text);
  response.end();
}

async function closePoolAndExit() {
  console.log("\nTerminating");
  try {
    // Get the pool from the pool cache and close it when no
    // connections are in use, or force it closed after 10 seconds.
    // If this hangs, you may need DISABLE_OOB=ON in a sqlnet.ora file.
    // This setting should not be needed if both Oracle Client and Oracle
    // Database are 19c (or later).
    await oracledb.getPool().close(10);
    console.log("Pool closed");
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

process
  .once('SIGTERM', closePoolAndExit)
  .once('SIGINT', closePoolAndExit);

init();
