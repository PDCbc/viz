# Run this build by doing something like:
#   docker run --name #{VIS_NAME} --link #{VISDB_NAME}:mongo -p #{VIS_PORT}:8081 -d -v /vagrant/vis:/app -e 'CONSUMER_KEY=test' -e 'CONSUMER_SECRET=test' visualizer
FROM node

### Configuration Parameters ###
# Configure Port
ENV PORT 8081
# Configure Secret
ENV SECRET Test Secret
# Configure MONGO_URI
ENV MONGO_URI mongodb://visualizerdb/visualizer
# Request Token URL
ENV REQUEST_TOKEN_URL https://queryengine:8080/oauth/request_token
# Access Token URL
ENV ACCESS_TOKEN_URL https://queryengine:8080/oauth/access_token
# User Authorization URL
ENV USER_AUTHORIZATION_URL https://localhost:8080/oauth/authorize
ENV CALLBACK_URL https://127.0.0.1:8081/auth/callback


# Setup nodemon - So it can reload if the file changes.
RUN npm install -g supervisor

### OAuth Keys
# These aren't populated by default. Passing an environment variable is preferred.
# Consumer Key
ENV CONSUMER_KEY visualizer
# Consumer Secret
ENV CONSUMER_SECRET specialsecret

# Set directory to the volume.
VOLUME ["/app"]
WORKDIR /app

# Install Dependencies then start
CMD npm install && supervisor --watch . -i node_modules init.js 
