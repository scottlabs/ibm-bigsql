This is a wrapper around IBM's Big SQL interface.

## Install

    npm install ibm-bigsql

If things don't work, make sure all child dependencies have been installed. ibm-bigsql requires jdbc which in turn requires java.

## Use

```
var BigSQL = require('ibm-bigsql');

var bigSQL = new BigSQL({
    user: 'foo',
    password: 'bar',
    url: 'jdbc:hive2://host:port/database'
});

bigSQL.query('query').then(function(results) {
    console.log(results);
});
```

BigSQL will automatically detect bigsql or bigsql_v1 syntax based on the incoming URL.

You must specifically use the respective query or update methods depending on the statements.
