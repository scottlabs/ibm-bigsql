var Q = require('q');
var path = require('path');
var fs = require('fs');
var jdbc = new ( require('jdbc') );
var getVersion = require('./lib/getVersion');
var parseDriver = require('./lib/parseDriver');

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

    function handleError(err) {
        if ( err.type ) {
            // this error has already been parsed by us.
            // it's probably moving on down the promise
            // chain.
            return err;
        } else if ( err.message ) {
            var message = err.message.replace(/\t/g,'').split('\n');
            var description = message.shift();
            var exception = message.shift().split(':');
            var stack = message.join('\n');
            var error = {};

            switch(exception[0].trim()) {
                case 'java.sql.SQLException' :
                    if ( exception[1].trim().indexOf('No suitable driver found') !== -1 ) {
                        error = {
                            type: 'No suitable driver found',
                            target: exception[1].split('No suitable driver found for').pop().trim(),
                            message: exception[1].trim()
                        };
                    } else if ( exception[1].trim().indexOf('Could not establish connection to') !== -1 ) {
                        error = {
                            type: 'Could not establish connection',
                            target: exception[1].split('Could not establish connection to').pop().trim(),
                            message: exception[1].trim()
                        };
                    } else {
                        error = {
                            type: 'unknown',
                            target: '',
                            message: exception[1].trim()
                        };
                    }
                    break;
                case 'com.ibm.db2.jcc.am.SqlSyntaxErrorException':
                    switch( exception[1].trim() ) {
                        case 'DB2 SQL Error':
                            error = {
                                type: 'SQL Syntax Error',
                                code: '-104',
                                exception: exception.splice(2).join(': ')
                            };
                            break;
                        default:
                            error = {
                                type: 'SQL Syntax Error',
                                code: '',
                                exception: exception.splice(2).join(': ')
                            }
                            break;
                    };
                    break;
                case 'com.ibm.db2.jcc.am.SqlException':
                    if ( exception[1].indexOf('Method executeQuery cannot be used for update') !== -1 ) {
                        error = {
                            type: 'Wrong query type, need update',
                            code: '-4476',
                            message: exception[1].trim()
                        };
                    } else if ( exception[1].indexOf('Method executeUpdate cannot be used for query') !== -1 ) {
                        error = {
                            type: 'Wrong query type, need execute',
                            code: '-4476',
                            message: exception[1].trim()
                        };
                    } else {
                        error = {
                            type: 'unknown',
                            target: '',
                            message: exception[1].trim()
                        };
                    }
                    break;
                default:
                    error = exception.join(': ');
                    break;
            }

            error.java = {
                message: description,
                stack: stack
            };

            return error;
        } else {
            return err;
        }
    };

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
                        dfd.resolve(conn);
                    } else {
                        dfd.reject(handleError(err));
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
                //if ( err.message.indexOf('query did not generate a result set!') !== -1) {
                    //dfd.resolve([]);
                //} else {
                dfd.reject(handleError(err));
                //}
            } else {
                dfd.reject(handleError(err));
            }
        } else {
            dfd.resolve(results);
        }

        jdbc.close(function(err) {
            if(err) {
                // not sure how to handle this
                console.error('Error closing JDBC connection');
                console.error(err);
            }
        });
    };

    function executeQuery(statement, func) {
        var dfd = Q.defer();
        if ( ! statement ) { dfd.reject('You must provide a query statement'); }
        else { 
            getConn(params).then(function(conn) {
                // attach the connection to jdbc
                jdbc._conn = conn;
                jdbc[func](statement, function(err, results) {
                    queryCallback(err, results, dfd);
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
        version: version
    }
};

module.exports = bigSQL;
