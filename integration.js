'use strict';

let request = require('request');
let _ = require('lodash');
let util = require('util');
let net = require('net');
let config = require('./config/config');
let async = require('async');
let fs = require('fs');
let log = null;
let requestWithDefaults;

const DOMAIN_URI = 'https://api.dnsdb.info/lookup/rrset/name/';
const IP_URI = 'https://api.dnsdb.info/lookup/rdata/ip/';

function startup(logger) {
    log = logger;
    let defaults = {};

    if (typeof config.request.cert === 'string' && config.request.cert.length > 0) {
        defaults.cert = fs.readFileSync(config.request.cert);
    }

    if (typeof config.request.key === 'string' && config.request.key.length > 0) {
        defaults.key = fs.readFileSync(config.request.key);
    }

    if (typeof config.request.passphrase === 'string' && config.request.passphrase.length > 0) {
        defaults.passphrase = config.request.passphrase;
    }

    if (typeof config.request.ca === 'string' && config.request.ca.length > 0) {
        defaults.ca = fs.readFileSync(config.request.ca);
    }

    if (typeof config.request.proxy === 'string' && config.request.proxy.length > 0) {
        defaults.proxy = config.request.proxy;
    }

    requestWithDefaults = request.defaults(defaults);
}

function doLookup(entities, options, cb) {

    var blacklist = options.blacklist;
    log.trace({blacklist: blacklist}, "checking to see what blacklist looks like");

    let entitiesWithNoData = [];
    let lookupResults = [];

    if (typeof(options.apiKey) !== 'string' || options.apiKey.length === 0) {
        cb("The API key is not set.");
        return;
    }

    async.each(entities, function (entityObj, next) {
        if (_.includes(blacklist, entityObj.value)) {
            rnext(null);
        }
        else if (entityObj.isDomain && options.lookupDomain) {
            _lookupEntityDomain(entityObj, options, function (err, result) {
                if (err) {
                    next(err);
                } else {
                    lookupResults.push(result);
                    log.debug({result: result}, "Checking the result values ");
                    next(null);
                }
            });
        } else if (options.lookupIp && entityObj.isIPv4 || entityObj.isIPv6) {
            _lookupEntityIP(entityObj, options, function (err, result) {
                if (err) {
                    next(err);
                } else {
                    lookupResults.push(result);
                    log.debug({result: result}, "Checking the result values ");
                    next(null);
                }
            });
        } else {
            lookupResults.push({entity: entityObj, data: null}); //Cache the missed results
            next(null);
        }
    }, function (err) {
        cb(err, lookupResults);
    });
}

function _lookupEntityDomain(entityObj, options, cb) {
    let requestOptions = {
        uri: DOMAIN_URI + entityObj.value.toLowerCase(),
        method: 'GET',
        qs: {
            limit: 10,
            time_last_after: -31536000
        },
        headers: {
            'X-API-Key': options.apiKey,
            'Accept': 'application/json'
        },
        json: true
    };

    requestWithDefaults(requestOptions, function (err, response, body) {
        let errorObject = _isApiError(err, response, body, entityObj.value);
        if (errorObject) {
            cb(errorObject);
            return;
        }

        if (_isLookupMiss(response)) {
            cb(null, {
                entity: entityObj,
                data: null
            });
            return;
        }

        log.debug({body: body}, "Printing out the results of Body ");

        let bodyObjects = _processRequestBody(body);

        // this will only happen if all JSON rows couldn't be parsed so we'll treat it as an error
        if(bodyObjects.length === 0){
            cb(_createJsonErrorPayload("Unable to parse result body into JSON", null, '500', '6', 'JSON Parse Failure', {
                responseBody: body
            }));
            return;
        }

        log.debug({bodyObj: bodyObjects}, "parsed data");

        _mutateBodyObjects(bodyObjects);

        // The lookup results returned is an array of lookup objects with the following format
        cb(null, {
            // Required: This is the entity object passed into the integration doLookup method
            entity: entityObj,
            // Required: An object containing everything you want passed to the template
            data: {
                // Required: These are the tags that are displayed in your template
                summary: [bodyObjects[1].rrname],
                // Data that you want to pass back to the notification window details block
                details: {
                    bodyObjects: bodyObjects
                }
            }
        });
    });
}

function _lookupEntityIP(entityObj, options, cb) {
    let requestOptions = {
        uri: IP_URI + entityObj.value,
        method: 'GET',
        qs: {
            limit: 10
        },
        headers: {
            'X-API-Key': options.apiKey,
            'Accept': 'application/json'
        },
        json: true
    };

    requestWithDefaults(requestOptions, function (err, response, body) {
        let errorObject = _isApiError(err, response, body, entityObj.value);
        if (errorObject) {
            cb(errorObject);
            return;
        }

        if (_isLookupMiss(response)) {
            cb(null, {
                entity: entityObj,
                data: null
            });
            return;
        }

        log.debug({body: body}, "Request Body for IP Lookup");

        let bodyObjects = _processRequestBody(body);

        // this will only happen if all JSON rows couldn't be parsed so we'll treat it as an error
        if(bodyObjects.length === 0){
            cb(_createJsonErrorPayload("Unable to parse result body into JSON", null, '500', '6', 'JSON Parse Failure', {
                responseBody: body
            }));
            return;
        }

        log.debug({bodyObj: bodyObjects}, "parsed data");
        log.debug({bodyObjTest: bodyObjects[1]}, "Body objects 1 test");
        log.debug({bodyObject: bodyObjects}, "bodyobjects new");

        // Mutates the body objects to modify some properties and make them easier to render
        _mutateBodyObjects(bodyObjects);

        // The lookup results returned is an array of lookup objects with the following format
        cb(null, {
            // Required: This is the entity object passed into the integration doLookup method
            entity: entityObj,
            // Required: An object containing everything you want passed to the template
            data: {
                // Required: These are the tags that are displayed in your template
                summary: [bodyObjects[1].rrname],
                // Data that you want to pass back to the notification window details block
                details: {
                    bodyObjects: bodyObjects
                }
            }
        });
    });
}

/**
 * The response body from DNSDB is text consisting of JSON objects in string format that are newline delimited.
 * As a result, we have to manually parse this into a javascript object
 * @param body
 * @returns {*} A javascript array containing DNSDB data objects
 * @private
 */
function _processRequestBody(body){
    if(typeof body !== 'string' || body.length === 0){
        return [];
    }

    let splitBody = body.split("\n");

    let bodyObjects = splitBody.reduce((result, rowAsString) => {
        try{
            let parsedRow = JSON.parse(rowAsString);
            result.push(parsedRow);
        }catch(e){
            // invalid JSON so skip it
        }
        return result;
    }, []);

    return bodyObjects;
}

/**
 * Mutates body objects by modifying them to be suitable for passing to our template
 * @param object
 * @private
 */
function _mutateBodyObjects(bodyObjects){
    bodyObjects.forEach(function (obj) {
        if(obj.time_first){
            obj.time_first = obj.time_first * 1000;
        }

        if(obj.time_last){
            obj.time_last = obj.time_last * 1000;
        }

        if(obj.zone_time_first){
            obj.zone_time_first = obj.zone_time_first * 1000;
        }

        if(obj.zone_time_last){
            obj.zone_time_last = obj.zone_time_last * 1000;
        }

        if(obj.rdata && !Array.isArray(obj.rdata)) {
            obj.rdata = [obj.rdata];
        }
    });
}

function _isLookupMiss(response) {
    return response.statusCode === 404;
}

function _isApiError(err, response, body, entityValue) {
    if (err) {
        return err;
    }

    if (response.statusCode === 429) {
        return _createJsonErrorPayload("Daily DNSDB API Lookup Limit Reached", null, '429', '1', 'Lookup Limit Reached', {
            err: err
        });
    }

    if (response.statusCode === 503) {
        return _createJsonErrorPayload("Limit of number of concurrent connections is exceeded for DNSDB", null, '503', '2', 'Concurrent Connections Exceeded', {
            err: err
        });
    }

    if (response.statusCode === 400) {
        return _createJsonErrorPayload("URL formatted incorrectly", null, '400', '3', 'Bad Request', {
            err: err
        });
    }

    if (response.statusCode === 500) {
        return _createJsonErrorPayload("Error processing your request", null, '500', '4', 'Internal Server Error', {
            err: err,
            entity: entityValue
        });
    }


    if (response.statusCode === 403) {
        return _createJsonErrorPayload("You do not have permission to access DNSDB. Please check your API key", null, '403', '5', 'Permission Denied', {
            err: err
        });
    }

    // Any code that is not 200 and not 404 (missed response), we treat as an error
    if (response.statusCode !== 200 && response.statusCode !== 404) {
        return body;
    }

    return null;
}

function validateOptions(userOptions, cb) {
    let errors = [];
    if (typeof userOptions.apiKey.value !== 'string' ||
        (typeof userOptions.apiKey.value === 'string' && userOptions.apiKey.value.length === 0)) {
        errors.push({
            key: 'apiKey',
            message: 'You must provide a Farsight DNSDB API key'
        })
    }

    cb(null, errors);
}

// function that takes the ErrorObject and passes the error message to the notification window
var _createJsonErrorPayload = function (msg, pointer, httpCode, code, title, meta) {
    return {
        errors: [
            _createJsonErrorObject(msg, pointer, httpCode, code, title, meta)
        ]
    }
};

// function that creates the Json object to be passed to the payload
var _createJsonErrorObject = function (msg, pointer, httpCode, code, title, meta) {
    let error = {
        detail: msg,
        status: httpCode.toString(),
        title: title,
        code: 'DNSDB_' + code.toString()
    };

    if (pointer) {
        error.source = {
            pointer: pointer
        };
    }

    if (meta) {
        error.meta = meta;
    }

    return error;
};

module.exports = {
    doLookup: doLookup,
    startup: startup,
    validateOptions: validateOptions
};