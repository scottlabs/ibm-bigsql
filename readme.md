This is a wrapper around IBM's Big SQL interface.

## Install

    npm install ibm-bigsql

## Use

```
var BigSQL = require('ibm-bigsql');

var bigSQL = new BigSQL({
    user: 'foo',
    password: 'bar',
    url: 'jdbc:hive2://host:port/database'
});

bigSQL.query('SHOW TABLES').then(function(results) {
    console.log(results);
});
```
