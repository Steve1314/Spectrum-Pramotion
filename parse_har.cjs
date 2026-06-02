const fs = require('fs');
const har = JSON.parse(fs.readFileSync('cpartner.spectrum.com.har', 'utf8'));
const entries = har.log.entries.filter(e => e.request.url.includes('/offers/address') && e.response.status === 200);
if (entries.length > 0) {
    const entry = entries[0];
    console.log("Content object structure:");
    console.log(Object.keys(entry.response.content));
    console.log("Has text? ", !!entry.response.content.text);
    if (entry.response.content.text) {
        console.log("Text length: ", entry.response.content.text.length);
    }
} else {
    console.log("Not found");
}
