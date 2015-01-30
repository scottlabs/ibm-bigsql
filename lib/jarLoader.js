/********
 * This section sets up Java.
 *
 * This loads our jars into the Java class path
 * and sets up initialization for the jars
 * that need them.
 *
 * This enables interacting with the 
 * JDBC connector to BigSQL
 *
 ******/
var path = require('path');
var fs = require('fs');
var java = require(path.resolve('./node_modules/jdbc/node_modules/java'));

// add all our jars to the Java classpath
var jars = fs.readdirSync(path.resolve('./lib/db/jars')).map(function(file) {
    var jar = path.resolve('./lib/db/jars/' + file);
    if ( fs.existsSync(jar)) {
        java.classpath.push(jar);
    }
});

// initialize log4j
var nullAppender = java.newInstanceSync("org.apache.log4j.varia.NullAppender");
java.callStaticMethod('org.apache.log4j.BasicConfigurator','configure', nullAppender);
