// The default drivers for various Jars
// hive: 'org.apache.hive.jdbc.HiveDriver'
// big sql driver: 'com.ibm.biginsights.bigsql.jdbc.BigSQLDriver'
//

function parseDriver(version) {
    if ( version === 'bigsql' ) {
        // this is Big SQL
        return 'com.ibm.db2.jcc.DB2Driver';
    } else if ( version === 'bigsql_v1' ) {
        // this is Big SQL 1.0
        return 'com.ibm.biginsights.bigsql.jdbc.BigSQLDriver';
    }
};

module.exports = parseDriver;
