const request = require('request');
const { pick } = require('lodash');
const { generateRandomIP, randomUserAgent } = require('./utils'); 
const copyHeaders = require('./copyHeaders');
const _0x4ca924 = require('./compress');
const bypass = require('./bypass');
const redirect = require('./redirect');
const shouldCompress = require('./shouldCompress');

// Array of predefined Via header values
const viaOptions = [
    '1.1 my-proxy-service.com (MyProxy/1.0)',
    '1.0 my-other-proxy.net (AnotherProxy/2.0)',
    '1.1 custom-proxy-system.org (CustomProxy/3.1)',
    '1.1 some-other-proxy.com (DynamicProxy/4.0)',
];

function getRandomViaHeader() {
    const randomIndex = Math.floor(Math.random() * viaOptions.length);
    return viaOptions[randomIndex];
}

// Function to generate a random delay between 100ms and 2000ms
function generateRandomDelay() {
    return Math.floor(Math.random() * 1900) + 100;
}

function proxy(req, res) {
    const { url, jpeg, bw, l } = req.query;

    // Handle the case where `url` is missing
    if (!url) {
        const randomIP = generateRandomIP();
        const userAgent = randomUserAgent();
        const headers = {
            ...pick(req.headers, ['cookie', 'dnt', 'referer']),
            'x-forwarded-for': randomIP,
            'user-agent': userAgent,
            'via': getRandomViaHeader(),
        };

        // Set headers and return an invalid request response
        Object.keys(headers).forEach(key => res.setHeader(key, headers[key]));
        req.params.randomIP = randomIP;
        return res.end(`Image Compression Service - IP: ${req.params.randomIP}`);
    }

    // Process and clean URL
    const urls = Array.isArray(url) ? url.join('&url=') : url;
    const cleanedUrl = urls.replace(/http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i, 'http://');

    // Setup request parameters
    req.params.url = cleanedUrl;
    req.params.webp = !jpeg;
    req.params.grayscale = bw !== '0';
    req.params.quality = parseInt(l, 10) || 40;

    const randomizedIP = generateRandomIP();
    const userAgent = randomUserAgent();
    const randomDelay = generateRandomDelay();

    // Add random delay before making the request
    setTimeout(() => {
        // Set up the request with the random Via header
        request.get({
            url: req.params.url,
            headers: {
                ...pick(req.headers, ['cookie', 'dnt', 'referer']),
                'user-agent': userAgent,
                'x-forwarded-for': randomizedIP,
                'via': getRandomViaHeader(),
            },
            timeout: 10000,
            maxRedirects: 5,
            encoding: null,
            strictSSL: false,
            gzip: true,
            jar: true,
        }, (err, origin, buffer) => {
            if (err || origin.statusCode >= 400) {
                return redirect(req, res);
            }

            copyHeaders(origin, res);
            res.setHeader('content-encoding', 'identity');
            req.params.originType = origin.headers['content-type'] || '';
            req.params.originSize = buffer.length;

            if (shouldCompress(req)) {
                _0x4ca924(req, res, buffer); // Obfuscated compress function call
            } else {
                bypass(req, res, buffer);
            }
        });
    }, randomDelay);
}

module.exports = proxy;
