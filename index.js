var bigSQL = function(params) {
    this.params = params;

    return {
        query: require('./lib/query')
    }
};

module.exports = bigSQL;
