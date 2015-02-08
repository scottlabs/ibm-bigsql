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
            case 'com.ibm.db2.jcc.am.SqlNonTransientConnectionException' :
                if ( exception[2].trim().indexOf('Connection is closed') !== -1 ) {
                    error = {
                        type: 'Connection closed',
                        code: '-4470',
                        message: [exception[1].trim(), exception[2].trim()].join('\n')
                    };
                } else {
                    error = {
                        type: 'unknown',
                        message: [exception[1].trim(), exception[2].trim()].join('\n')
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
            } else if ( exception[1].indexOf('Invalid operation: result set is closed') !== -1 ) {
                error = {
                    type: 'Result set closed',
                    code: '-4470',
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

module.exports = handleError;
