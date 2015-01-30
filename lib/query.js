var Q = require('q');
var java = require('../node_modules/jdbc/node_modules/java/');
var jdbc = new ( require('jdbc') );

require('./jarLoader'); // loads jars into class path
var getConn = require('./getConn');

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
        getConn().then(function(conn) {
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
module.exports = query;
