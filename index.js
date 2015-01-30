var Q = require('q');
var path = require('path');
var fs = require('fs');
var jdbc = new ( require('jdbc') );

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

    // The default drivers for various Jars
    // hive: 'org.apache.hive.jdbc.HiveDriver'
    // big sql driver: 'com.ibm.biginsights.bigsql.jdbc.BigSQLDriver'

    function getConn(params) {
        var dfd = Q.defer();

        if ( ! params.user ) { throw "You must provide a user."; }
        if ( ! params.password ) { throw "You must provide a password."; }
        if ( ! params.url ) { throw "You must provide a URL to connect to."; }

        var params = {
            user: params.user,
            password: params.password,
            url: params.url,
            drivername: 'com.ibm.biginsights.bigsql.jdbc.BigSQLDriver'
        };

        jdbc.initialize(params, function(err, res) {
            if (err) {
                dfd.reject({ error: err.message });
            } else {
                jdbc.open(function(err, conn) {
                    if (conn) {
                        dfd.resolve(conn);
                    } else {
                        dfd.reject({ error: err.message });
                    }
                });
            }
        });

        return dfd.promise;
    };
    function queryCallback(err, results, dfd) {
        if (err) {
            if ( err.message ) {
                // we don't always expect a response, so this is not an error
                if ( err.message.indexOf('query did not generate a result set!') !== -1) {
                    dfd.resolve([]);
                } else {
                    dfd.reject({ error: err.message });
                }
            } else {
                dfd.reject(err);
            }
        } else if (results) {
            dfd.resolve(results);
        } else {
            dfd.reject({ error: 'unknown message' });
        }

        jdbc.close(function(err) {
            if(err) {
                // not sure how to handle this
                console.error('Error closing JDBC connection');
                console.error(err);
            }
        });
    };

    function query(statement) { 
        var dfd = Q.defer();
        if ( ! statement ) { dfd.reject('You must provide a query statement'); }
        else { 
            getConn(params).then(function(conn) {
                // attach the connection to jdbc
                jdbc._conn = conn;
                jdbc.executeQuery(statement, function(err, results) {
                    queryCallback(err, results, dfd);
                });
            }).fail(function(err) {
                if ( err.message ) {
                    dfd.reject({ error: err.message });
                } else {
                    dfd.reject(err);
                }
            });
        }
        return dfd.promise;
    };
    return {
        query: query
    }
};

module.exports = bigSQL;
