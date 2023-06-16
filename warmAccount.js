//require
const { workerData, parentPort } = require('worker_threads');
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

//general instantiation
let warmingBrowser;
let warmingPage;

const warmAccount = async () => {
    //initiate a browser with random resi proxy and request interception
    try{
        warmingBrowser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1366, height: 768 },
            args: ['--disable-notifications', '--no-sandbox', `--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${workerData.userAgent} Safari/537.36`, `--proxy-server=${workerData.proxy}`]
        });
        let pages = await warmingBrowser.pages();
        warmingPage = pages[0];

        //network shit
        /*await warmingPage.setRequestInterception(true);
        warmingPage.on('request', async request => {
            const resource = request.resourceType();

            if(resource != 'document' && resource != 'script' && resource != 'xhr' && resource != 'stylesheet'){
                request.abort();
            }else{
                request.continue();
            }
        });*/
        
        //Set cookies in browser
        await warmingPage.setCookie(...workerData.cookies);

        //go to the search page
        await warmingPage.goto('https://www.facebook.com/', { waitUntil: 'networkidle0' });
    }catch(error){
        errorMessage('Error with page initiation', error);
    }
}
warmAccount();