#!/usr/bin/env bash

# Exit on errors.
set -e

# Install the dependencies.
OSTYPE=$(uname -s)
case $OSTYPE in
    Darwin) # Mac
        printf "\e[31m -- This script assumes you already have Homebrew installed. See http://brew.sh -- \e[0m\n"
        brew install mongodb nodejs
        printf "\e[32m -- This scrpt does NOT enable MongoDB. Enable it yourself with \`launchctl load ~/Library/LaunchAgents/homebrew.mxcl.mongodb.plist\`\n"
        ;;

    Linux) # Linux
        printf "\e[31m -- This script assumes you are using a RHEL/Fedora derivative and is tested on Fedora 20 -- \e[0m\n"
        yum install -y mongodb nodejs npm
        printf "\e[32m -- This scrpt does NOT enable MongoDB. Enable it yourself with \`systemctl enable mongodb\`\n"
        ;;

    *) # Everything else
        printf "\e[31m -- It looks like you're using Windows or something else. You need MongoDB and Node.js installed. Good luck to you! -- \e[0m\n"
esac
