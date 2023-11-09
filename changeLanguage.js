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
        mainChannel = client.channels.cache.get(workerData.channel);
        if(mainChannel == null){
            mainChannel = await client.channels.fetch(workerData.channel);
        }
    } catch (error) {
        errorMessage('Error fetching channel', error);
    }
});

//scrape the html content for testing
const logPageContent = async (page) => {
    try{
        const htmlContent = await page.content();
        const { Readable } = require('stream');
        const htmlStream = Readable.from([htmlContent]);
        mainChannel.send({
            files: [
                {
                    attachment: htmlStream,
                    name: 'website.html',
                },
            ],
        });
    }catch(error){
        errorMessage('error loggin content: ', error);
    }
}

//general instantiation
let languageBrowser;
let languagePage;

const changeLanguage = async () => {
    //initiate a browser with random resi proxy and request interception
    try{
        languageBrowser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', `--user-agent=Mozilla/5.0 (${platformConverter(workerData.platform)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36`, `--proxy-server=${workerData.proxy}`]
        });
        let pages = await languageBrowser.pages();
        languagePage = pages[0];

        //close the notif popup
        const context = languageBrowser.defaultBrowserContext();
        context.overridePermissions("https://www.facebook.com", ["notifications"]);

        //change http headers
        languagePage.setExtraHTTPHeaders({
            'Referer': 'https://www.facebook.com/login',
            'Sec-Ch-Ua': 'Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114',
            'Sec-Ch-Ua-Full-Version-List': 'Not.A/Brand";v="8.0.0.0", "Chromium";v="114.0.5735.199", "Google Chrome";v="114.0.5735.199',
            'Sec-Ch-Ua-Platform': workerData.platform
        });

        //change the viewport
        languagePage.setViewport({ width: 1366, height: 768 });

        //Set cookies in browser
        await languagePage.setCookie(...workerData.cookies);

        //go to the search page
        await languagePage.goto('https://www.facebook.com/settings/?tab=language', {waitUntil: 'networkidle0'});
        //await logPageContent(languagePage);
        await languagePage.waitForSelector('.xdppsyt .x1i10hfl');
        await languagePage.click('.xdppsyt .x1i10hfl');

        try{
            await languagePage.waitForSelector('.x1xmf6yo.xezivpi');
        }catch(error){
            await languagePage.click('[aria-label="OK"]');
            await languagePage.waitForSelector('[aria-label="Редактировать"]');
        }
        await languagePage.click('[aria-label="Редактировать"]');
        await languagePage.waitForSelector('.xb57i2i .x4k7w5x');
        await languagePage.click('.xb57i2i .x4k7w5x > :nth-child(19)');
        await languagePage.click('.x1rdy4ex > :nth-child(2)');
        await languagePage.waitForNavigation();
        //await logPageContent(languagePage);
        await languageBrowser.close();
        await mainChannel.send("Finish: " + workerData.username);
    }catch(error){
        await mainChannel.send('language failure: ' + workerData.username);
        errorMessage('Error with page initiation', error);
        await logPageContent(languagePage);
        await languageBrowser.close();
    }
}
changeLanguage();