# Developer Notes

## User Interface

The following provides color palette and font guidelines for the user interface: 
 
### Colors

The UI has two main colors, blue and yellow. 

Blues (in order of dark to light), hex codes:

* 1C2D3E
* 335579 <- Primary blue
* 4D83BD
* 65B0FF
* A6D3FF
* D0E7FF

Yellows/Brown (dark to light), hex codes:

* 2A1F0E
* 71521F
* 926927
* D99B37 <- Primary yellow
* FDB53F
* FECE7A

The following colors are used for ratio visualizations: 

* D99B37 - clinician data
* 4D83BD - group data
* 1C2D3E - network data

The following colors are used for demographics pyramid visualization:

* 335579 - male
* A6D3FF - undifferentiated
* 71521F - female
* FECE7A - undefined

The following colors are used for buttons: 

* EBEBEB - unselected button
* D0E7FF - unselected button hover
* 65B0FF - selected button
* 4D83BD - selected button hover

### Fonts

Different font classes are as follows: 

* Title - 20pt Helvetica Bold
* Subtitle - 16pt Helvetica Bold
* Body - 14pt Helvetica Thin
* Secondary - 12pt Helvetica Bold
* Footnote - 12pt Helvetica Light

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
