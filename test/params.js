var err = false;
var user = process.env.npm_package_config_user;
if ( ! user ) {
    err = true;
    console.log('You must specify a user for testing, like');
    console.log('npm config set ibm-bigsql:user foo');
}

var password = process.env.npm_package_config_password;
if ( ! password ) {
    err = true;
    console.log('You must specify a password for testing, like');
    console.log('npm config set ibm-bigsql:password bar');
}

var id = process.env.npm_package_config_id;
if ( ! id ) {
    err = true;
    console.log('You must specify an ID for testing.');
    console.log('The tests will take care of constructing appropriate IBM URL connections');
    console.log('npm config set ibm-bigsql:url 123');
}

if ( err ) {
    throw "Please fix above errors and try again.";
}

var params = {
    user: user,
    password: password,
    url: {
        bigsql_v1: 'jdbc:bigsql://bi-hadoop-prod-'+id+'.services.dal.bluemix.net:7052/default',
        bigsql: 'jdbc:db2://bi-hadoop-prod-'+id+'.services.dal.bluemix.net:51000/bigsql'
    },
    get: function(version) {
        if ( ! version ) { throw "You must provide a version"; }
        return {
            user: params.user,
            password: params.password,
            url: params.url[version]
        }
    }
};

module.exports = params;
