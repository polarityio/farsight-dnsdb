'use strict';

let request = require('request');
let _ = require('lodash');
let util = require('util');
let net = require('net');
let async = require('async');
var log = null;
let requestWithDefaults;

const BASE_URI = 'https://api.dnsdb.info/lookup/rrset/name/';
const IP_URI = 'https://api.dnsdb.info/lookup/rdata/ip/';
//const THROTTLE_INTERVAL = 3000;
//const THROTTLE_MAX_REQUESTS = 1;

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

    if(typeof(options.apiKey) !== 'string' || options.apiKey.length === 0){
        cb("The API key is not set.");
        return;
    }

    async.each(entities, function (entityObj, next) {
        if (_.includes(blacklist, entityObj.value)) {
                rnext(null);
        }
        else if (entityObj.isDomain && options.lookupDomain)
         {
            _lookupEntity(entityObj, options, function (err, result) {
                if (err) {
                    next(err);
                } else {
                    lookupResults.push(result); log.debug({result: result}, "Checking the result values ");
                    next(null);
                }
            });
        } else if (options.lookupIp && entityObj.isIPv4 || entityObj.isIPv6)
        {
            _lookupEntityIP(entityObj, options, function (err, result) {
                if (err) {
                    next(err);
                } else {
                    lookupResults.push(result); log.debug({result: result}, "Checking the result values ");
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


function _lookupEntity(entityObj, options, cb) {

    if(entityObj.value)
        request({
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
        }, function (err, response, body) {
            if (err) {
                cb(err);
                return;
            }

    requestWithDefaults(requestOptions, function (err, response, body) {
        let errorObject = _isApiError(err, response, body, entityObj.value);
        if (errorObject) {
                }));
                return;
            }

            if (response.statusCode !== 200) {
                cb(body);
                return;
            }
            log.debug({body: body}, "Printing out the results of Body ");


            if( body.length < 2){
                return;
            }
            let splitBody = body.split("\n");

            let bodyObjects = _.map(splitBody, function(row){
                if(row.length > 3)
                    return JSON.parse(row);
                else
                    return {};
            });

            log.debug({bodyObj: bodyObjects}, "parsed data");



            bodyObjects.forEach(function(obj){
                obj.time_first = obj.time_first*1000;
                obj.time_last = obj.time_last*1000;
            });

            // The lookup results returned is an array of lookup objects with the following format
            cb(null, {
                // Required: This is the entity object passed into the integration doLookup method
                entity: entityObj,
                // Required: An object containing everything you want passed to the template
                data: {
                    // Required: this is the string value that is displayed in the template
                    entity_name: entityObj.value,
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

    if(entityObj.value)
        request({
            uri: IP_URI + entityObj.value,
            method: 'GET',
            headers: {
                'X-API-Key': options.apiKey,
                'Accept': 'application/json'
            },
            json: true
    requestWithDefaults(requestOptions, function (err, response, body) {
            if (err) {
                cb(err);
                return;
            }

            if(response.statusCode === 429){
                cb(_createJsonErrorPayload("Daily DNSDB API Lookup Limit Reached", null, '429', '2A', 'Lookup Limit Reached', {
                    err: err
                }));
                return;
            }

            if(response.statusCode === 503){
                cb(_createJsonErrorPayload("Limit of number of concurrent connections is exceeded for DNSDB", null, '503', '2A', 'Concurrent Connections Exceeded', {
                    err: err
                }));
                return;
            }

            if(response.statusCode === 400){
                cb(_createJsonErrorPayload("URL formatted incorrectly", null, '400', '2A', 'Bad Request', {
                    err: err
                }));
                return;
            }

            if(response.statusCode === 500){
                cb(_createJsonErrorPayload("Error processing your request", null, '500', '2A', 'Internal Server Error', {
                    err: err,
                    entity: entityObj.value
                }));
                return;
            }


            if(response.statusCode === 403){
                cb(_createJsonErrorPayload("You do not have permission to access DNSDB. Please check your API key", null, '403', '2A', 'Permission Denied', {
                    err: err
                }));
                return;
            }

            if(response.statusCode === 404){
                cb(_createJsonErrorPayload("Entity not found in DNSDB", null, '404', '2A', 'Entity not found', {
                    err: err,
                    entity: entityObj.value
                }));
                return;
            }

            if (response.statusCode !== 200) {
                cb(body);
                return;
            }
            log.debug({body: body}, "Printing out the results of Body ");



            let splitBody = body.split("\n");

            let bodyObjects = _.map(splitBody, function(row){
                if(row.length > 3)
                    return JSON.parse(row);
                else
                    return {};
            });

            log.debug({bodyObj: bodyObjects}, "parsed data");

            log.debug({bodyObjTest: bodyObjects[1]}, "Body objects 1 test");


            log.debug({bodyOBject: bodyObjects}, "bodyobjects new");

            bodyObjects.forEach(function(obj){
                obj.time_first = obj.time_first*1000;
                obj.time_last = obj.time_last*1000;
                obj.rdata = [obj.rdata];
            });

            // The lookup results returned is an array of lookup objects with the following format
            cb(null, {
                // Required: This is the entity object passed into the integration doLookup method
                entity: entityObj,
                // Required: An object containing everything you want passed to the template
                data: {
                    // Required: this is the string value that is displayed in the template
                    entity_name: entityObj.value,
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

function validateOptions(userOptions, cb) {
    let errors = [];
    if(typeof userOptions.apiKey.value !== 'string' ||
        (typeof userOptions.apiKey.value === 'string' && userOptions.apiKey.value.length === 0)){
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