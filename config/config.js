module.exports = {
    name: "Farsight DNSDB",
    acronym: "PDNS",
    logging: {
        level: "debug"
    },
    description: "Farsight DNSDB Passive DNS API integration",
    entityTypes: ['domain', 'IPv4', 'IPv6'],
    styles: [
        "./styles/dnsdb.less"
    ],
    block: {
        component: {
            file: "./components/dnsdb-block.js"
        },
        template: {
            file: "./templates/dnsdb-block.hbs"
        }
    },
    summary: {
        component: {
            file: "./components/dnsdb-summary.js"
        },
        template: {
            file: "./templates/dnsdb-summary.hbs"
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
    options: [
        {
            key: "apiKey",
            name: "API Key",
            description: "DNSDB API key",
            type: "text",
            default: "",
            userCanEdit: false,
            adminOnly: false
        },
        {
            key: "blacklist",
            name: "IP or Domain Blacklist",
            description: "List of domains or IPs (space delimited) that you never want to send to DNSDB",
            default: "",
            type: "text",
            userCanEdit: false,
            adminOnly: false
        },
        {
            key: "timeLastAfter",
            name: "Time Last After",
            description: "Filters out results where the last seen time is after the given time.  The parameters expects an integer (Unix/Epoch time) with seconds granularity or a relative time in seconds (preceded by -). The default is to return results within the last year.",
            default: -31536000,
            type: "number",
            userCanEdit: false,
            adminOnly: true
        },
        {
            key: "limit",
            name: "Lookup Limit",
            description: "The maximum number of results to return per IP or Domain lookup.",
            default: 10,
            type: "number",
            userCanEdit: false,
            adminOnly: true
        },
        {
            key: "maxTags",
            name: "Maximum Number of Tags to Display",
            description: "Set the maximum number of unique summary tags to display in the notification overlay.",
            default: 3,
            type: "number",
            userCanEdit: true,
            adminOnly: false
        },
        {
            key: "lookupDomain",
            name: "Lookup Domains",
            description: "If checked, the integration will lookup Domains",
            default: true,
            type: "boolean",
            userCanEdit: true,
            adminOnly: false
        },
        {
            key: "lookupIp",
            name: "Lookup IPv4 and IPv6 Addresses",
            description: "If checked, the integration will lookup IPv4 and IPv6 addresses",
            default: true,
            type: "boolean",
            userCanEdit: true,
            adminOnly: false
        }
    ]
};