module.exports = {
    "name": "FarsightDNSDB",
    "acronym":"PDNS",
    "logging": { level: 'debug'},
    "description": "Farsight DNSDB Passive DNS api integration",
    "entityTypes": ['domain', 'IPv4', 'IPv6'],
    "styles":[
        "./styles/dnsdb.less"
    ],
    "block": {
        "component": {
            "file": "./components/dnsdb.js"
        },
        "template": {
            "file": "./templates/dnsdb.hbs"
        }
    },
    request: {
        // Provide the path to your certFile. Leave an empty string to ignore this option.
        // Relative paths are relative to the VT integration's root directory
        cert: "",
        // Provide the path to your private key. Leave an empty string to ignore this option.
        // Relative paths are relative to the VT integration's root directory
        key: "",
        // Provide the key passphrase if required.  Leave an empty string to ignore this option.
        // Relative paths are relative to the VT integration's root directory
        passphrase: "",
        // Provide the Certificate Authority. Leave an empty string to ignore this option.
        // Relative paths are relative to the VT integration's root directory
        ca: "",
        // An HTTP proxy to be used. Supports proxy Auth with Basic Auth, identical to support for
        // the url parameter (by embedding the auth info in the uri)
        proxy: ""
    },
        {
            "key"         : "blacklist",
            "name"        : "Blacklist Domains",
            "description" : "List of domains that you never want to send to DNSDB",
            "default"     : "default value",
            "type"        : "text",
            "userCanEdit" : false,
            "adminOnly"    : false
        },

        {
            "key": "lookupDomain",
            "name": "Lookup Domains",
            "description": "If checked, the integration will lookup Domains",
            "default": true,
            "type": "boolean",
            "userCanEdit": true,
            "adminOnly": false
        },
        {
            "key": "lookupIp",
            "name": "Lookup IPv4 and IPv6 Addresses",
            "description": "If checked, the integration will lookup IPv4 and IPv6 addresses",
            "default": true,
            "type": "boolean",
            "userCanEdit": true,
            "adminOnly": false
        }

    ]
};