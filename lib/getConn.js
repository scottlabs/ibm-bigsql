var Q = require('q');
var jdbc = new ( require('jdbc') );
var config = require('../config');

// The default drivers for various Jars
// hive: 'org.apache.hive.jdbc.HiveDriver'
// big sql driver: 'com.ibm.biginsights.bigsql.jdbc.BigSQLDriver'

function getConn(database) {
    var dfd = Q.defer();

    if ( ! database ) {
        database = config.database;
    }

    var url = [
        'jdbc:bigsql://bi-hadoop-prod-',
        config.id,
        '.services.dal.bluemix.net:7052/',
        database].join('');

    var params = {
        user: config.user,
        password: config.password,
        url: url,
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

module.exports = getConn;
