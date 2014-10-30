# Run this build by doing something like:
#   docker run --name #{VIS_NAME} --link #{VISDB_NAME}:mongo -p #{VIS_PORT}:8081 -d visualizer
FROM node

# Set directory to the volume.
VOLUME ["/app"]
WORKDIR /app

# Install dependencies (--no-bin-links for Winders compat)
RUN npm install --no-bin-links

### Configuration Parameters ###
# Configure Port
ENV PORT 8081
# Configure Secret
ENV SECRET Test Secret
# Configure MONGO_URI
ENV MONGO_URI mongodb://visualizerdb/visualizer
# Allow Self Signed SSL Certs
ENV NODE_TLS_REJECT_UNAUTHORIZED 0

# Install Dependencies then start
CMD npm start
