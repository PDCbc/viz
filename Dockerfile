# Dockerfile for the PDC's Visualizer service
#
# Base image
#
FROM phusion/passenger-nodejs


# Update system, install Python 2.7
#
ENV DEBIAN_FRONTEND noninteractive
RUN echo 'Dpkg::Options{ "--force-confdef"; "--force-confold" }' \
      >> /etc/apt/apt.conf.d/local
RUN apt-get update; \
    apt-get upgrade -y; \
    apt-get install -y python2.7


# Create startup script and make it executable
#
RUN mkdir -p /etc/service/app/
RUN ( \
      echo "#!/bin/bash"; \
      echo "#"; \
      echo "set -e -o nounset"; \
      echo ""; \
      echo ""; \
      echo "# Environment variables"; \
      echo "#"; \
      echo "export PORT=\${PORT_VIZ}"; \
      echo "export AUTH_MAIN_URL=https://auth:\${PORT_AUTH_M}"; \
      echo "export AUTH_CONTROL_URL=https://auth:\${PORT_AUTH_C}"; \
      echo "export CALLBACK_URL=https://auth:\${PORT_AUTH_C}/auth/callback"; \
      echo "export HUBAPI_URL=\${URL_HAPI}"; \
      echo "export SECRET=\${NODE_SECRET}"; \
      echo "export DACS=\${DACS_STOREDIR}"; \
      echo ""; \
      echo ""; \
      echo "# Start service"; \
      echo "#"; \
      echo "cd /app/"; \
      echo "/sbin/setuser app npm start"; \
    )  \
      >> /etc/service/app/run
RUN chmod +x /etc/service/app/run


# Prepare /app/ folder
#
WORKDIR /app/
COPY . .
RUN npm config set python /usr/bin/python2.7
RUN npm install
RUN chown -R app:app /app/


# Run Command
#
CMD ["/sbin/my_init"]
