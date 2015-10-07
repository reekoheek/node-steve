# Steve

Steve is a jobs manager.

Job can run and invoke Steve procedure, example to add new job

## How to install

```
npm install -g node-steve
```

or use as library

```
npm install node-steve
```

and use it in your app.js

```javascript
var steve = require('node-steve');
var http = require('http');

var app = steve();
var server = http.createServer(app.callback());
server.listen(3000);
```

and then, run

```
node --harmony app.js
```
