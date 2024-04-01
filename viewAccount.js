//require
const { workerData } = require('worker_threads');
const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(stealthPlugin());

//discord.js
const { Client, GatewayIntentBits } = require('discord.js');
const { Page } = require('puppeteer');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
client.login(process.env.DISCORD_BOT_TOKEN);

//error message send function
const errorMessage = (message, error) => {
    console.log(message + ': ' + error);
}

//convert platform string for a user agent
const platformConverter = (platform) => {
    if(platform === 'Windows'){
        return 'Windows NT 10.0; Win64; x64';
    }else if(platform === 'Linux'){
        return 'X11; Linux x86_64';
    }else if(platform === 'macOS'){
        return 'Macintosh; Intel Mac OS X 10_15_7';
    }
}


let mainChannel;
client.on('ready', async () => {
    try {
        /*mainChannel = client.channels.cache.get(workerData.channel);
        if(mainChannel == null){
            mainChannel = await client.channels.fetch(workerData.channel);
        }*/
    } catch (error) {
        errorMessage('Error fetching channel', error);
    }
});

//general instantiation
let warmingBrowser;
let warmingPage;

/*const warmAccount = async () => {
    //initiate a browser with random resi proxy and request interception
    try{
        warmingBrowser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', `--proxy-server=${workerData.proxy}`]//  
        });
        let pages = await warmingBrowser.pages();
        warmingPage = pages[0];

        //close the notif popup
        const context = warmingBrowser.defaultBrowserContext();
        context.overridePermissions("https://www.facebook.com", ["notifications"]);

        //change the viewport
        await warmingPage.setViewport({ width: 1366, height: 768 });

        //change http headers
        warmingPage.setUserAgent(`Mozilla/5.0 (${platformConverter(workerData.platform)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36`);
        warmingPage.setExtraHTTPHeaders({
            'Sec-Ch-Ua': 'Not.A/Brand";v="8", "Chromium";v="121", "Google Chrome";v="121',
            'SEC-CH-UA-ARCH': '"x86"',
            'Sec-Ch-Ua-Full-Version': "121.0.6167.185",
            'SEC-CH-UA-MOBILE':	'?0',
            'Sec-Ch-Ua-Platform': `"${workerData.platform}"`,
            'SEC-CH-UA-PLATFORM-VERSION': '15.0.0',
            'Referer': 'https://www.facebook.com/login'
        });

        //Set cookies in browser
        await warmingPage.setCookie(...workerData.cookies);

        await warmingPage.setRequestInterception(true);
        warmingPage.on('request', async request => {
            const resource = request.resourceType();
            if(resource != 'document' && resource != 'script' && resource != 'xhr' && resource != 'stylesheet' && resource != 'other'){
                request.abort();
            }else{
                request.continue();
            }
        });

        //testing pages
        await warmingPage.goto('https://facebook.com/', { waitUntil: 'domcontentloaded' });
        //https://whoer.net/
        //https://bot.sannysoft.com/
        //https://gologin.com/check-browser

        //console.log(await warmingPage.cookies());
    }catch(error){
        errorMessage('Error with page initiation', error);
    }
}*/

const warmAccount = async () => {
    //initiate the new page for collecting data

    try{
        warmingBrowser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox']//, `--proxy-server=${workerData.proxy}`
        });
        let pages = await warmingBrowser.pages();
        warmingPage = pages[0];

        //close the notif popup
        const context = warmingBrowser.defaultBrowserContext();
        context.overridePermissions("https://www.facebook.com", ["notifications"]);

        //change http headers
        warmingPage.setUserAgent(`Mozilla/5.0 (${platformConverter(workerData.platform)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36`);
        warmingPage.setExtraHTTPHeaders({
            'Sec-Ch-Ua': 'Not.A/Brand";v="8", "Chromium";v="121", "Google Chrome";v="121',
            'SEC-CH-UA-ARCH': '"x86"',
            'Sec-Ch-Ua-Full-Version': "121.0.6167.185",
            'SEC-CH-UA-MOBILE':	'?0',
            'Sec-Ch-Ua-Platform': `"${workerData.platform}"`,
            'SEC-CH-UA-PLATFORM-VERSION': '15.0.0',
            'Referer': 'https://www.facebook.com/login'
        });

        //Set cookies in browser
        //await warmingPage.setCookie(...workerData.cookies);

        //change the viewport
        warmingPage.setViewport({ width: 1366, height: 768 });

        await warmingPage.setRequestInterception(true);
        warmingPage.on('request', async request => {
            const resource = request.resourceType();
            //resource != 'document' && resource != 'script' && resource != 'other' && resource != 'media' && resource != 'fetch'
            if(resource != 'document' && resource != 'script' && resource != 'other' && resource != 'media' && resource != 'fetch'){//   && resource != 'xhr' && resource != 'websocket' && resource != 'eventsource'
                request.abort();
            }else{
                request.continue();
            }
        });

        await warmingPage.goto('https://www.facebook.com/marketplace/item/765340698906379/', { waitUntil: 'load' });
    }catch(error){
        errorMessage('Error with product page initiation, no message', error);
    }

    //get post data
    try{
        //check for video
        if(await warmingPage.$('.xcg96fm img') == null){
            console.log('video')
            //await warmingPage.reload({ waitUntil: 'load', timeout: 60000});
        }

        //set post data obj
        postObj = await warmingPage.evaluate(() => {

            return {
                img: (document.querySelector('.xcg96fm img').src).includes("video") ? document.querySelector('[aria-label="Thumbnail 1"] img').src : document.querySelector('.xcg96fm img').src,
                title: document.querySelector('div.xyamay9 h1').innerText,
                date: document.querySelector('[aria-label="Buy now"]') != null ? (document.querySelector('div.xyamay9 div.x6ikm8r > :nth-child(2)') != null ? document.querySelector('div.xyamay9 div.x6ikm8r > :nth-child(2)').innerText : " ") : (document.querySelector('div.x1yztbdb span.x1cpjm7i.x1sibtaa') != null ? document.querySelector('div.x1yztbdb span.x1cpjm7i.x1sibtaa').innerText : document.querySelector('div.x1xmf6yo > div > div:nth-child(2) span').innerText),
                description: document.querySelector('div.xz9dl7a.x4uap5.xsag5q8.xkhd6sd.x126k92a span') != null ? document.querySelector('div.xz9dl7a.x4uap5.xsag5q8.xkhd6sd.x126k92a span').innerText : ' ',
                shipping: document.querySelector('[aria-label="Buy now"]') != null ? (document.querySelector('div.xyamay9 div.x6ikm8r') != null ? document.querySelector('div.xyamay9 div.x6ikm8r span').innerText : document.querySelector('div.xod5an3 div.x1gslohp span').innerText) : ' ',
                price: ((document.querySelector('div.xyamay9 div.x1xmf6yo').innerText).match(/\d+/g)).join('')
            };
        });

        console.log(postObj);
        //await warmingPage.close();
    } catch(error){
        errorMessage('Error with getting item data', error);
    }
}
warmAccount();