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
    "options":[
        {
            "key"         : "apiKey",
            "name"        : "API Key",
            "description" : "DNSDB API key",
            "type"        : "text",
            "userCanEdit" : false,
            "adminOnly"    : false
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