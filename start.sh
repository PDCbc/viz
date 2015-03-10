#!/bin/bash

# Exit on errors and trace (print) exections
#
set -e

npm install
HUBAPI_URL=https://localhost:3003 PORT=3004 NODE_TLS_REJECT_UNAUTHORIZED=0 npm start
