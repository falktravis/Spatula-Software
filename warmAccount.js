//require
const { workerData } = require('worker_threads');
const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(stealthPlugin());

//discord.js
const { Client, GatewayIntentBits } = require('discord.js');
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

//general instantiation
let warmingBrowser;
let warmingPage;

let itemPage;

const warmAccount = async () => {
    //initiate a browser with random resi proxy and request interception
    try{
        warmingBrowser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', `--user-agent=Mozilla/5.0 (${platformConverter(workerData.platform)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36`, `--proxy-server=${workerData.proxy}`]
        });
        let pages = await warmingBrowser.pages();
        itemPage = pages[0];

        //change http headers
        itemPage.setExtraHTTPHeaders({
            'Referer': 'https://www.facebook.com/login',
            'Sec-Ch-Ua': 'Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114',
            'Sec-Ch-Ua-Full-Version-List': 'Not.A/Brand";v="8.0.0.0", "Chromium";v="114.0.5735.199", "Google Chrome";v="114.0.5735.199',
            'Sec-Ch-Ua-Platform': workerData.platform
        });

        //change the viewport
        itemPage.setViewport({ width: 1366, height: 768 });

        //Set cookies in browser
        await itemPage.setCookie(...workerData.cookies);

        //go to the search page
        //await warmingPage.goto('https://www.facebook.com/', { waitUntil: 'networkidle0' });
    }catch(error){
        errorMessage('Error with page initiation', error);
    }

    //!initiate the new page for collecting data
    let itemPageFullLoad = false;
    try{
        await itemPage.setRequestInterception(true);
        itemPage.on('request', async request => {
            const resource = request.resourceType();
            if(itemPageFullLoad){
                if(resource != 'document' && resource != 'script' && resource != 'other' && resource != 'media'){
                    request.abort();
                }else{
                    request.continue();
                }
            }else{
                if(resource != 'document'){
                    request.abort();
                }else{
                    request.continue();
                }
            }
        });
        await itemPage.goto('https://www.facebook.com/marketplace/item/1438147333629041/', { waitUntil: 'domcontentloaded' });
    }catch(error){
        errorMessage('Error with product page initiation, no message', error);
    }

    //get post data
    try{
        //check for video
        let isVideo = false;
        if(await itemPage.$('.xpz12be[aria-label="Loading..."]') != null){
            console.log('video sequence: ' + 'https://www.facebook.com/marketplace/item/1438147333629041/');
            itemPageFullLoad = true;
            await itemPage.reload({ waitUntil: 'domcontentloaded' });
            isVideo = true;
        }

        //set post data obj
        postObj = await itemPage.evaluate((isVideo) => {
            return {
                img: isVideo ? document.querySelector('[aria-label="Thumbnail 1"] img').src : document.querySelector('img').src,
                title: document.querySelector('div.xyamay9 h1').innerText,
                date: document.querySelector('[aria-label="Buy now"]') != null ? (document.querySelector('div.xyamay9 div.x6ikm8r > :nth-child(2)') != null ? document.querySelector('div.xyamay9 div.x6ikm8r > :nth-child(2)').innerText : " ") : document.querySelector('div.x1yztbdb span.x1cpjm7i.x1sibtaa').innerText,
                description: document.querySelector('div.xz9dl7a.x4uap5.xsag5q8.xkhd6sd.x126k92a span') != null ? document.querySelector('div.xz9dl7a.x4uap5.xsag5q8.xkhd6sd.x126k92a span').innerText : ' ',
                shipping: document.querySelector('[aria-label="Buy now"]') != null ? (document.querySelector('div.xyamay9 div.x6ikm8r') != null ? document.querySelector('div.xyamay9 div.x6ikm8r span').innerText : document.querySelector('div.xod5an3 div.x1gslohp span').innerText) : ' ',
                price: document.querySelector('div.xyamay9 div.x1xmf6yo').innerText.charAt(0) + document.querySelector('div.xyamay9 div.x1xmf6yo').innerText.split(document.querySelector('div.xyamay9 div.x1xmf6yo').innerText.charAt(0))[1]
            };
        }, isVideo);

        //await itemPage.close();
    } catch(error){
        errorMessage(`Error with getting item data at https://www.facebook.com/marketplace/item/1438147333629041/`, error);
    }
}
warmAccount();