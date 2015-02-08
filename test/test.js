var chai = require("chai");
chai.should();
chai.use(require('chai-things'));
var params = require('./params');
var fs = require('fs');
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var Q = require('q');

var BigSQL = require('../index');
var getVersion = require('../lib/getVersion');
var parseDriver = require('../lib/parseDriver');

describe('BigSQL', function() {

    it('should throw an error if missing arguments', function() {
        BigSQL.bind(null).should.throw();

        BigSQL.bind(null, {}).should.throw();

        BigSQL.bind(null, {
            user: 'foo'
        }).should.throw();

        BigSQL.bind(null, {
            user: 'foo',
            password: 'bar'
        }).should.throw();

        BigSQL.bind(null, {
            url: 'http://www.google.com',
            password: 'bar'
        }).should.throw();
    });

    it('should create a new BigSQL', function() {
        var bigSql = new BigSQL({
            user : 'foo',
            password : 'bar',
            url : 'jdbc:db2://bi-hadoop-prod-xxx.services.dal.bluemix.net:51000/bigsql'
        });

        bigSql.should.be.ok();
    });

    it('should return the correct version', function() {
        getVersion(params.url.bigsql).should.equal('bigsql');
        getVersion(params.url.bigsql_v1).should.equal('bigsql_v1');
    });

    it('should return the correct driver for a version', function() {
        parseDriver('bigsql').should.equal('com.ibm.db2.jcc.DB2Driver');
        parseDriver('bigsql_v1').should.equal('com.ibm.biginsights.bigsql.jdbc.BigSQLDriver');
    });

    it('it should set the version correctly internally', function() {
        var bigSql = new BigSQL(params.get('bigsql'));
        bigSql.version.should.equal('bigsql');
        bigSql = new BigSQL(params.get('bigsql_v1'));
        bigSql.version.should.equal('bigsql_v1');
    });

    describe('Errors', function() {
        var bigSql;
        before(function() {
        });

        it('should handle an initialize error', function(done) {
            console.log('not sure how to trigger this');
            done();
        });

        it('should handle a driver error', function(done) {
            bigSql = new BigSQL({
                user: 'user',
                password: 'bar',
                url: 'garbage'
            });

            bigSql.query('foo').fail(function(err) {
                err.java.should.be.ok();
                err.type.should.equal('No suitable driver found');
                err.target.should.equal('garbage');
                done();
            });
        });

        it('should handle a bad URL error', function(done) {
            this.timeout(5000);
            var badParams = params.get('bigsql_v1');
            badParams.url = 'jdbc:bigsql://bi-hadoop-prod-xxx.services.dal.bluemix.net:7052/foo';
            bigSql = new BigSQL(badParams);

            bigSql.query('foo').fail(function(err) {
                err.type.should.equal('Could not establish connection');
                err.target.should.equal('jdbc');
                done();
            });
        });

        it('should handle an authentication error', function(done) {
            this.timeout(15000);
            var badParams = params.get('bigsql_v1');
            badParams.user = 'foo';
            bigSql = new BigSQL(badParams);

            bigSql.query('foo').fail(function(err) {
                err.type.should.equal('Could not establish connection');
                err.target.should.equal('jdbc');
                done();
            });
        });

        it('should gracefully handle query errors as bigsql', function(done) {
            bigSql = new BigSQL(params.get('bigsql'));

            bigSql.query("garbage").fail(function(err) {
                err.type.should.equal('Wrong query type, need update');
                err.code.should.equal('-4476');
                done();
            });
        });

        it('should gracefully handle update errors as bigsql', function(done) {
            bigSql = new BigSQL(params.get('bigsql'));

            bigSql.update("garbage").fail(function(err) {
                err.type.should.equal('SQL Syntax Error');
                err.code.should.equal('-104');
                done();
            });
        });

        it('should retry on connection closed', function(done) {
            this.timeout(5000);

            var forceClose = true;
            var called = 0;

            bigSql = proxyquire('../index',{
                'jdbc': function() {
                    var jdbc = new (require('jdbc'));
                    var open = jdbc.open;
                    jdbc.open = function(callback) {
                        called += 1;
                        open.call(jdbc, function(err, conn) {
                            if ( forceClose ) {
                                jdbc.close(function(){}); // force a close
                                forceClose = false;
                            }
                            callback(err, conn);
                        });
                    };
                    return jdbc;
                }
            })(params.get('bigsql'));


            bigSql.update("garbage").then(done).fail(function(err) {
                called.should.equal(2);
                done();
            });
        });
    });

    describe('Queries', function() {
        var bigSql;
        var tableName = 'foo'+(new Date()).getTime();

        before(function(done) {
            this.timeout(30000);
            bigSql = new BigSQL(params.get('bigsql'));
            bigSql.update('DROP TABLE IF EXISTS '+tableName).then(function() {
                var createQuery = "CREATE HADOOP TABLE "+tableName+" (foo VARCHAR(255)) ROW FORMAT DELIMITED FIELDS TERMINATED BY ','";
                return bigSql.update(createQuery);
            }).then(function() {
                done();
            }).fail(done);
        });

        after(function(done) {
            this.timeout(30000);
            bigSql.update('DROP TABLE IF EXISTS '+tableName).then(function() {
                done();
            }).fail(done);
        });

        it('should be able to perform an update', function(done) {
            this.timeout(30000);
            var insertQuery = "INSERT INTO "+tableName+" VALUES('bar')";
            bigSql.update(insertQuery).then(function() {
                done();
            }).fail(done);
        });

        it('should be able to perform a query', function(done) {
            this.timeout(30000);
            var selectQuery = "SELECT * FROM "+tableName;
            bigSql.query(selectQuery).then(function(results) {
                results.length.should.equal(1);
                done();
            }).fail(done);
        });
    }); 

});
