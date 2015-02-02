function getVersion(url) {
    if ( url.indexOf('db2') !== -1 ) {
        return 'bigsql';
    } else {
        return 'bigsql_v1';
    }
};

module.exports = getVersion;
