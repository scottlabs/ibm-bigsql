var Q = require('q'); var path = require('path');
var fs = require('fs');
var jdbc = new ( require('jdbc') );
var getVersion = require('./lib/getVersion');
var parseDriver = require('./lib/parseDriver');
var handleError = require('./lib/handleError');

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
var java = require(__dirname + '/node_modules/jdbc/node_modules/java');

// add all our jars to the Java classpath
var jarPath = __dirname + '/jars';
var jars = fs.readdirSync(jarPath).map(function(file) {
    var jar = jarPath + '/' + file;
    java.classpath.push(jar);
});

// initialize log4j
var nullAppender = java.newInstanceSync("org.apache.log4j.varia.NullAppender");
java.callStaticMethod('org.apache.log4j.BasicConfigurator','configure', nullAppender);

var bigSQL = function(params) {
    if ( ! params ) { throw "You must provide some params."; }
    if ( ! params.user ) { throw "You must provide a user."; }
    if ( ! params.password ) { throw "You must provide a password."; }
    if ( ! params.url ) { throw "You must provide a URL to connect to."; }

    var version = getVersion(params.url);
    var drivername = parseDriver(version);
    var connection;
    var freeConnection = params.freeConnection || 30000; // after 30 seconds of inactivity
    var timers = {};


    function getConn(params) {
        var dfd = Q.defer();

        var params = {
            user: params.user,
            password: params.password,
            url: params.url,
            drivername: drivername
        };

        jdbc.initialize(params, function(err, res) {
            if (err) {
                dfd.reject(handleError(err));
            } else {
                jdbc.open(function(err, conn) {
                    if (conn) {
                        connection = conn;
                        dfd.resolve(conn);
                    } else {
                        dfd.reject(handleError(err));
                    }
                });
            }
        });

        return dfd.promise;
    };

    function close() {
        jdbc.close(function(err) {
            connection = null;
            if(err) {
                // not sure how to handle this
                console.error('Error closing JDBC connection');
                console.error(err);
            }
        });
    };

    function queryCallback(params) {
        var err = params.err;
        var results = params.results;
        var dfd = params.dfd;
        var statement = params.statement;
        var func = params.func;
        var attempts = params.attempts || 1;

        if (err) {
            err = handleError(err);
            if ( err.code === '-4470' && attempts < 3 ) {
                executeQuery(statement, func, dfd, attempts);
            } else {
                dfd.reject(err);
            }
        } else {
            dfd.resolve(results);
        }

        // always close a connection
        close();
    };

    function close() {
        jdbc.close(function(err) {
            if(err) {
                // not sure how to handle this
                console.error('Error closing JDBC connection');
                console.error(err);
            }
        });
    };

    function executeQuery(statement, func, dfd, attempts) {
        if ( ! dfd ) { dfd = Q.defer(); }
        if ( ! statement ) { dfd.reject('You must provide a query statement'); }
        else {
            getConn(params).then(function(conn) {
                // attach the connection to jdbc
                jdbc._conn = conn;
                jdbc[func](statement, function(err, results) {
                    queryCallback({
                        err: err,
                        results: results,
                        dfd: dfd,
                        statement: statement,
                        func: func,
                        attempts: attempts
                    });
                });
            }).fail(function(err) {
                dfd.reject(handleError(err));
            });
        }
        return dfd.promise;
    };

    function query(statement) { 
        return executeQuery(statement, 'executeQuery');
    };

    function update(statement) {
        return executeQuery(statement, 'executeUpdate');
    };

    return {
        query: query,
        update: update,
        version: version,
        close: close,
        getConn: getConn
    }
};

module.exports = bigSQL;
