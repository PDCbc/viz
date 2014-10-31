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
ENV PROVIDER_URL https://hub-api:8080
# User Authorization URL
ENV USER_AUTHORIZATION_URL https://localhost:8080/oauth/authorize
ENV CALLBACK_URL https://127.0.0.1:8081/auth/callback
# Allow Self Signed SSL Certs
ENV NODE_TLS_REJECT_UNAUTHORIZED 0


# Setup nodemon - So it can reload if the file changes.
RUN npm install -g supervisor

# Set directory to the volume.m

VOLUME ["/app"]
WORKDIR /app

# Install Dependencies then start
CMD npm install --no-bin-links && supervisor --watch . -i node_modules init.js
