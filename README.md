# Developer Notes

## Security 

### Preventing HTML Injection

* To prevent HTML injection attacks, ensure that all text rendered to the page has any special html characters escaped. 
* See disscussion on HTML injection: [http://stackoverflow.com/a/3793406](http://stackoverflow.com/a/3793406)
* When using handlebarjs to render text, if the `{{ text }}` syntax is used, the `text` will be passed through an `escapeExpression()` function that replaces HTML special characters. When using the `{{{ text }}}` no escape function is called. When in doubt, use `{{ }}`. 
  * See discussion about `handlebars.escapeExpression(String)` at [http://handlebarsjs.com/reference.html](http://handlebarsjs.com/reference.html). 
# Setup

## Dependencies

Before starting, you should ensure you have the following available on your machine:

* An active MongoDB instance.
* Node.js

On Mac OS X or a RHEL/Fedora derivative you can install it like so:

```bash
cd $PROJECT_DIRECTORY
./setup.sh
```

If you're on Windows, or feel like having a VM to work on, install [Vagrant](https://www.vagrantup.com/) try using our `Vagrantfile`:

```bash
cd $PROJECT_DIRECTORY
vagrant up      # Start the VM.
vagrant ssh     # Shell into the VM.
vagrant halt    # Stop the VM.
vagrant destroy # Delete the VM.
```

## Starting

```bash
cd $PROJECT_DIRECTORY
npm install # Install Dependencies into `.node_modules/`.
npm start   # Start the application.
```

### Settings

It is possible to configure some settings for the server using Node's `process.env.VARIABLE` construct. Any environement variables are available through this. The Visualizer utilizes the following environment variables, if they are not specified a default value is choosen.

* `HUBAPI_URL` - the URL to the HAPI component. Defaults to `https://hubapi:3005`.
* `AUTH_MAIN_URL` - the URL to the Auth main component. Defaults to `https://auth:3005`.
* `AUTH_CONTROL_URL` - the URL to the Auth main component. Defaults to `https://auth:3006`.
* `AUTH_MAIN_URL` - the URL to the Auth main component. Defaults to `https://auth:3005`.
* `PORT` - the URL to the Auth main component. Defaults to `3004`.
* `NODE_TLS_REJECT_UNAUTHORIZED` - the URL to the Auth main component.
* `PORT_VIZ_HTTP` - The port to service HTTP requests on, redirects to HTTPS. Defaults `3008`.

# Deploy

There is a `Dockerfile` for use in deployment, however your mileage may vary.

# Troubleshooting

## Making certificates

In order to not have to accept a new cert every time, bake your own. [Source](https://library.linode.com/security/ssl-certificates/self-signed).

```bash
mkdir ./cert
openssl req -new -x509 -days 365 -nodes -out ./cert/server.crt -keyout ./cert/server.key
chmod 600 ./cert/*
```
