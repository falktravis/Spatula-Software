//require
require('dotenv').config();
const { workerData, parentPort } = require('worker_threads');
const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(stealthPlugin());
const { createCursor } = require("ghost-cursor");

//discord.js
const { Client, GatewayIntentBits } = require('discord.js');
const { Page } = require('puppeteer');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.login(process.env.DISCORD_BOT_TOKEN);

//for fetching pics from the database
const fetch = require('node-fetch');
const fs = require('fs/promises');

//init chatgpt
const OpenAI = require("openai");
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

//error message send function
const errorMessage = (message, error) => {
    console.log(message + ': ' + error);
    Channel.send(message + ': ' + error);
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

let Channel;
client.on('ready', async () => {
    try {
        if(workerData.channel != null){
            Channel = client.channels.cache.get(workerData.channel);
            if(Channel == null){
                Channel = await client.channels.fetch(workerData.channel);
            }
        }else{
            Channel = client.channels.cache.get('1196915422042259466');
            if(Channel == null){
                Channel = await client.channels.fetch('1196915422042259466');
            }
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
        Channel.send({
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

//pause for a random interval to simulate user behavior, magnitude input of 1-3 in order to have longer/shorter pauses
const pause = async (magnitude) => {
    if(magnitude == 1){
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * (1500)) + 500)); //.5s - 2s
    }else if(magnitude == 2){
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * (1500)) + 2000)); // 2s - 3.5s
    }else{
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * (3000)) + 3000)); //3s - 6s
    }
}

// Function to simulate typing with randomized speed
async function typeWithRandomSpeed(page, text) {
    for (const char of text) {
        // Increase pause for punctuation
        if(char == '!' || char == '.' || char == '?'){
            await page.keyboard.type(char, { delay: Math.floor(Math.random() * 150) + 150 });
        }else{
            await page.keyboard.type(char, { delay: Math.floor(Math.random() * 150) + 60 });
        }
    }
}

const login = async () => {
    try {
        Channel.send("Re-Login Required: " + burnerUsername);

        //check for this weird shit
        if(await initiationPage.$('[title="Allow all cookies"]') != null){
            await pause(2);
            await initiationCursor.click('[title="Allow all cookies"]');
            try {
                await initiationPage.waitForNavigation();
            } catch (error) {}
        }

        await initiationCursor.click('[name="email"]');
        await pause(1);
        await typeWithRandomSpeed(initiationPage, burnerUsername);
        await pause(1);
        await initiationCursor.click('[name="pass"]');
        await pause(1);
        await typeWithRandomSpeed(initiationPage, burnerPassword);
        await pause(1);
        await initiationCursor.click('[name="login"]');

        try{
            await initiationPage.waitForNavigation();
        }catch (error) {}

        //update burnerCookies
        burnerCookies = await initiationPage.cookies();
        parentPort.postMessage({cookies: await initiationPage.cookies()});
        return true;
    } catch (error) {
        await Channel.send('error with re-login + ban: ' + error);
        parentPort.postMessage({action: 'ban', username: burnerUsername});
        await initiationBrowser.close();
        await initiationPage.close();
        process.exit();
    }
}

//general instantiation
let initiationBrowser;
let initiationPage;
let initiationCursor;

const start = async () => {
    //initiate a browser with random resi proxy and request interception
    try{
        initiationBrowser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', `--proxy-server=${workerData.proxy}`]
        });
        let pages = await initiationBrowser.pages();
        initiationPage = pages[0];

        //close the notif popup
        const context = initiationBrowser.defaultBrowserContext();
        context.overridePermissions("https://www.facebook.com", ["notifications"]);

        //change the viewport
        initiationPage.setViewport({ width: 1366, height: 768 });

        //redirect management
        initiationPage.on('response', async response => {
            //detect redirection
            if ([300, 301, 302, 303, 307, 308].includes(response.status())) {
                const redirectURL = response.headers()['location'];
                console.log(`Redirected to: ${redirectURL}`);

                if(await initiationPage.$('[aria-label="Dismiss"]') != null){
                    await pause(2);
                    await initiationCursor.click('[aria-label="Dismiss"]');
                }

                if(redirectURL.includes('/checkpoint/')){
                    await Channel.send('Account banned: ' + burnerUsername);
            
                    //message the main script to delete the burner account
                    parentPort.postMessage({action: 'ban', username: burnerUsername});
                    await initiationPage.close();
                    await initiationBrowser.close();
                    process.exit();
                }else if(redirectURL.includes('/login/?next')){
                    try{
                        await initiationPage.waitForSelector('[name="email"]');
                    }catch(error){}

                    await login();
                }
            }
        });

        //change http headers
        initiationPage.setUserAgent(`Mozilla/5.0 (${platformConverter(workerData.platform)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36`);
        initiationPage.setExtraHTTPHeaders({
            'Sec-Ch-Ua': 'Not.A/Brand";v="8", "Chromium";v="121", "Google Chrome";v="121',
            'SEC-CH-UA-ARCH': '"x86"',
            'Sec-Ch-Ua-Full-Version': "121.0.6167.185",
            'SEC-CH-UA-MOBILE':	'?0',
            'Sec-Ch-Ua-Platform': `"${workerData.platform}"`,
            'SEC-CH-UA-PLATFORM-VERSION': '15.0.0',
            'Referer': 'https://www.facebook.com/login'
        });

        //create cursor
        initiationCursor = createCursor(initiationPage);

        //Set cookies in browser
        await initiationPage.setCookie(...workerData.cookies);

        await initiationPage.goto('https://www.facebook.com', {waitUntil: 'domcontentloaded'});

        //detect accounts that need login
        if(await initiationPage.$('[name="login"]') != null){
            Channel.send("account is fucked");
            return login();
        }else{
            parentPort.postMessage({cookies: await initiationPage.cookies()});
            return true;
        }
    }catch(error){
        errorMessage('Error with page initiation', error);
    }
}

const randomChance = (chance) => {
    if(Math.random() < chance){
        return true;
    }else{
        return false;
    }
}

const changeLanguage = async () => {
    //initiate a browser with random resi proxy and request interception
    try{
        //go to the search page
        await initiationCursor.click('div.x1i10hfl.x1qjc9v5.xjbqb8w.xjqpnuy.xa49m3k.xqeqjp1.x2hbi6w.x13fuv20.xu3j5b3.x1q0q8m5.x26u7qi.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xdl72j9.x2lah0s.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x2lwn1j.xeuugli.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1n2onr6.x16tdsg8.x1hl2dhg.xggy1nq.x1ja2u2z.x1t137rt.x1o1ewxj.x3x9cwd.x1e5q0jg.x13rtm0m.x1q0g3np.x87ps6o.x1lku1pv.x1a2a7pz.xzsf02u.x1rg5ohu > div > svg > g > image');
        await initiationPage.waitForSelector('.x1oo3vh0.x1rdy4ex');
        await pause(1);
        await initiationCursor.click('.x1oo3vh0.x1rdy4ex > :nth-child(1)');
        await initiationPage.waitForSelector('div.x1y1aw1k > div > div:nth-child(1) > a > div.x6s0dn4.x1q0q8m5 > div.x6s0dn4.xkh2ocl.x1q0q8m5 > div');
        await pause(1);
        await initiationCursor.click('div.x1y1aw1k > div > div:nth-child(1) > a > div.x6s0dn4.x1q0q8m5 > div.x6s0dn4.xkh2ocl.x1q0q8m5 > div');
        await initiationPage.waitForSelector('[href*="language"]');
        await pause(2);

        if(await initiationPage.$('div.xpvyfi4.xc9qbxq.xyamay9.x1pi30zi.x1l90r2v.x1swvt13.x1n2onr6.xq1dxzn > div > div > div.x6s0dn4.x78zum5.xl56j7k.x1608yet.xljgi0e.x1e0frkt > div') != null){
            console.log("click");
            await initiationCursor.click('div.xpvyfi4.xc9qbxq.xyamay9.x1pi30zi.x1l90r2v.x1swvt13.x1n2onr6.xq1dxzn > div > div > div.x6s0dn4.x78zum5.xl56j7k.x1608yet.xljgi0e.x1e0frkt > div');
            await pause(2);
        }

        await initiationCursor.click('[href*="language"]');
        await pause(2);

        if(await initiationPage.$('div.x9f619.x1n2onr6.x1ja2u2z.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.x78zum5.x1t2pt76 > div > div > div > div > div:nth-child(2) > div > div > div:nth-child(1) > div:nth-child(2) > div > div.xezivpi') != null){
            if(await initiationPage.$('div.x1uvtmcs.x4k7w5x > div > div > div > div.xpvyfi4.xc9qbxq > div > div') != null){
                await initiationCursor.click('div.x1uvtmcs.x4k7w5x > div > div > div > div.xpvyfi4.xc9qbxq > div > div');
            }
            await initiationCursor.click('div.x9f619.x1n2onr6.x1ja2u2z.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.x78zum5.x1t2pt76 > div > div > div > div > div:nth-child(2) > div > div > div:nth-child(1) > div:nth-child(2) > div > div.xezivpi');
            //click button drop down
            await initiationPage.waitForSelector('div.x9f619.x1n2onr6.x1ja2u2z.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.x78zum5.x1t2pt76 > div > div > div > div > div:nth-child(2) > div > div > div:nth-child(1) > div:nth-child(2) > div > div > div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x2lah0s.x193iq5w.xyamay9.x1l90r2v > div > div > div');
            await pause(1);
            await initiationCursor.click('div.x9f619.x1n2onr6.x1ja2u2z.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.x78zum5.x1t2pt76 > div > div > div > div > div:nth-child(2) > div > div > div:nth-child(1) > div:nth-child(2) > div > div > div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x2lah0s.x193iq5w.xyamay9.x1l90r2v > div > div > div');

            //click english 
            await initiationPage.waitForSelector('div.xu96u03.xm80bdy.x10l6tqk.x13vifvy > div.x1n2onr6 > div > div > div > div > div.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6 > div');
            await pause(1);
            const languageArr = await initiationPage.$$('div.xu96u03.xm80bdy.x10l6tqk.x13vifvy > div.x1n2onr6 > div > div > div > div > div.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6 > div > div');
            for (const element of languageArr) {
              const elementText = await initiationPage.evaluate(el => el.textContent, element);
          
              if (elementText === 'English (US)') {
                await element.click();
                break;
              }
            }

            //click submit
            await initiationPage.waitForSelector('div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x2lah0s.x193iq5w.x1gryazu.xezivpi > div > div:nth-child(2) > div.x1i10hfl.xjbqb8w.x1ypdohk.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1o1ewxj.x3x9cwd.x1e5q0jg.x13rtm0m.x87ps6o.x1lku1pv.x1a2a7pz.x9f619.x3nfvp2.xdt5ytf.xl56j7k.x1n2onr6.xh8yej3 > div > div.x6s0dn4.x78zum5.xl56j7k.x1608yet.xljgi0e.x1e0frkt > div > span > span');
            await pause(1);
            await initiationCursor.click('div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x2lah0s.x193iq5w.x1gryazu.xezivpi > div > div:nth-child(2) > div.x1i10hfl.xjbqb8w.x1ypdohk.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1o1ewxj.x3x9cwd.x1e5q0jg.x13rtm0m.x87ps6o.x1lku1pv.x1a2a7pz.x9f619.x3nfvp2.xdt5ytf.xl56j7k.x1n2onr6.xh8yej3 > div > div.x6s0dn4.x78zum5.xl56j7k.x1608yet.xljgi0e.x1e0frkt > div > span > span');

            //await initiationCursor.click('div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x2lah0s.x193iq5w.x1gryazu.xezivpi > div > div:nth-child(2) > div.x1i10hfl.xjbqb8w.x6umtig.x1b1mbwd.xaqea5y.xav7gou.x1ypdohk.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1o1ewxj.x3x9cwd.x1e5q0jg.x13rtm0m.x87ps6o.x1lku1pv.x1a2a7pz.x9f619.x3nfvp2.xdt5ytf.xl56j7k.x1n2onr6.xh8yej3');


        }else{
            await initiationCursor.click('div.x9f619.x1n2onr6.x1ja2u2z.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.x78zum5.x1t2pt76 > div > div > div > div > div > div > div:nth-child(2) > div > div > div:nth-child(2) > div > div > div > div > div > div > div > div > div.x9f619.x1n2onr6.x1ja2u2z.xdt5ytf.x2lah0s.x193iq5w.xeuugli.x78zum5 > div > div');
            //click english
            await initiationPage.waitForSelector('div.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6.xaci4zi.x129vozr > div > div > div:nth-child(4) > div > div.x6s0dn4.x1q0q8m5.x1qhh985.xu3j5b3.xcfux6l.x26u7qi.xm0m39n.x13fuv20.x972fbf.x9f619.x78zum5.x1q0g3np.x1iyjqo2.xs83m0k.x1qughib.xat24cr.x11i5rnm.x1mh8g0r.xdj266r.xeuugli.x18d9i69.x1sxyh0.xurb0ha.xexx8yu.x1n2onr6.x1ja2u2z.x1gg8mnh > div');
            await pause(1);
            await initiationCursor.click('div.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6.xaci4zi.x129vozr > div > div > div:nth-child(4) > div > div.x6s0dn4.x1q0q8m5.x1qhh985.xu3j5b3.xcfux6l.x26u7qi.xm0m39n.x13fuv20.x972fbf.x9f619.x78zum5.x1q0g3np.x1iyjqo2.xs83m0k.x1qughib.xat24cr.x11i5rnm.x1mh8g0r.xdj266r.xeuugli.x18d9i69.x1sxyh0.xurb0ha.xexx8yu.x1n2onr6.x1ja2u2z.x1gg8mnh > div');
            //submit
            await initiationPage.waitForSelector('div.x1uvtmcs.x4k7w5x.x1h91t0o.x1beo9mf.xaigb6o.x12ejxvf.x3igimt.xarpa2k.xedcshv.x1lytzrv.x1t2pt76.x7ja8zs.x1n2onr6.x1qrby5j.x1jfb8zj > div > div > div > div > div > div > div.x1jx94hy.xh8yej3.x1hlgzme.xvcs8rp.x1bpvpm7.xefnots.x13xjmei.xv7j57z > div > div > div > div > div:nth-child(1) > div > div');
            await pause(1);
            await initiationCursor.click('div.x1uvtmcs.x4k7w5x.x1h91t0o.x1beo9mf.xaigb6o.x12ejxvf.x3igimt.xarpa2k.xedcshv.x1lytzrv.x1t2pt76.x7ja8zs.x1n2onr6.x1qrby5j.x1jfb8zj > div > div > div > div > div > div > div.x1jx94hy.xh8yej3.x1hlgzme.xvcs8rp.x1bpvpm7.xefnots.x13xjmei.xv7j57z > div > div > div > div > div:nth-child(1) > div > div');
        }
        try {
            await initiationPage.waitForNavigation({ waitUntil: 'load' });
        } catch (error) {}
        await pause(1);
        await initiationCursor.click('[href="/"]')
        parentPort.postMessage({languageChange: true})
        await Channel.send("Finish: " + workerData.username);
    }catch(error){
        errorMessage('Error with page initiation', error);
        await logPageContent(initiationPage);
    }
}

const checkNotifs = async () => {
    try {
        await initiationPage.waitForSelector('div.x1ja2u2z > div:nth-child(2) > span > span > div > a > svg');
        if(await initiationPage.$('div.x1ja2u2z > div:nth-child(2) > span > span > div > div > span > span') != null){//check for unread notifs
            await pause(1);
            await initiationCursor.click('div.x1ja2u2z > div:nth-child(2) > span > span > div > a > svg');
            try {
                await initiationPage.waitForSelector('div.x78zum5 > div:nth-child(3) > div.x4k7w5x.x1jfb8zj > div > div > div.x1n2onr6');
                await pause(3);
                //Chance to click on one notif 1-4 and click back to home
                if(randomChance(0.4)){
                    const notifs = await initiationPage.$$('div.x78zum5 > div:nth-child(3) > div.x4k7w5x.x1jfb8zj > div > div > div.x1n2onr6');
                    if(notifs.length < 5){
                        await initiationCursor.click(`div.x78zum5 > div:nth-child(3) > div.x4k7w5x.x1jfb8zj > div > div > div.x1n2onr6:nth-child(${Math.floor(Math.random() * 4 + 2)})`);
                    }else{
                        await initiationCursor.click(`div.x78zum5 > div:nth-child(3) > div.x4k7w5x.x1jfb8zj > div > div > div.x1n2onr6:nth-child(${Math.floor(Math.random() * (notifs.length - 1) + 2)})`);
                    }
                    await pause(3);
                    //scroll down
                    await initiationCursor.click('[href="/"]');
                }else{
                    await initiationCursor.click('div.x1ja2u2z > div:nth-child(2) > span > span > div > a > svg');
                }
                await pause(2);
            } catch (error) {
                Channel.send("notifs thing: " + error);
                await initiationCursor.click('div.x1ja2u2z > div:nth-child(2) > span > span > div > a > svg');
            }
        }
    } catch (error) {
        Channel.send("Notification Checking Error: " + error);
        await logPageContent(initiationPage);
    }
}

const scrollFeed = async() => {
    try {
        await initiationPage.waitForSelector('div.x1hc1fzr.x1unhpq9 > div > div > div');

        //pick a feed and scroll through a random amount of post, interacting with a random amount of posts
        //scroll a random number of posts 5-20
        for(let i = 1; i < Math.floor(Math.random() * 8 + 5); i++){
            await pause(3);
            //scroll into view
            await initiationPage.waitForSelector(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i})`);
            await initiationPage.evaluate(i => {
                const element = document.querySelector(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i})`);
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'center',
                });
            }, i);

            //check what kind of container it is
            if(await initiationPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i}) [aria-label="hide post"]`) != null){//post
                await Channel.send('post');
                await interactWithPost(i);
            }else{
                await Channel.send("Non-Identified Container");
            }
        }

        await pause(2);
    } catch (error) {
        errorMessage('Error scrolling feed', error);
        await logPageContent(initiationPage);
    }
}

const interactWithPost = async(childNum) => {
    try {
        await pause(2);
        //like
        if(randomChance(0.12)){
            await Channel.send('like');
            await initiationCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) div.x5ve5x3 > div.x9f619.x1n2onr6 > div:nth-child(1)`);//Like
            await pause(2);
        }

        //If post is a fan page(Whatever it means to just be a public page), randomize value to follow it
        if(await initiationPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) h4 > span > div > span`) != null && randomChance(0.15)){
            await initiationCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) h4 > span > div > span`);
        }

        //Share opportunity
        if(randomChance(0.02)){
            await Channel.send('share');
            await initiationCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) div:nth-child(3) > div > div.xuxw1ft > div:nth-child(2)`);//share
            await initiationPage.waitForSelector(`div.x1qfuztq.xh8yej3 > div > div > :nth-child(1)`);
            await pause(1);
            await initiationCursor.click(`div.x1qfuztq.xh8yej3 > div > div > :nth-child(1)`);//share public to feed
            await pause(2);

            try {
                await initiationPage.waitForSelector('div.x6s0dn4.x9f619.x78zum5.x1qughib > div > div > div.x6s0dn4.x78zum5');
                await pause(2);
                await initiationCursor.click('div.x6s0dn4.x9f619.x78zum5.x1qughib > div > div > div.x6s0dn4.x78zum5');
            } catch (error) {
                await Channel.send("error clicning share thing: " + error);
                await initiationCursor.click('div.x9f619.x71s49j div:nth-child(1) > div.x1n2onr6 > div > div.x78zum5 > div > div > i')
            }
        }
    } catch (error) {
        errorMessage('Error interacting with post', error);
        await logPageContent(initiationPage);
    }
}

//main function
(async () => {
    try {
        if(await start()){
            //check notifs
            await checkNotifs();

            //scroll feed
            await scrollFeed();

            //Change Language
            if(workerData.changeLanguage == true){
                const initiation = await initiationPage.evaluate(() => {return document.documentElement.lang});
                if (initiation !== 'en') {
                    await changeLanguage();
                }
                await scrollFeed();
            }
        }

        console.log('finish');
        await initiationPage.close();
        await initiationBrowser.close();
        process.exit();
    } catch (error) {
        errorMessage('Error with main function', error);
    }
})();


const fillProfile = async() => {
    try {
        // Navigate to the account settings page
        await initiationPage.waitForSelector('[aria-label="Your profile"]');
        await initiationCursor.click('[aria-label="Your profile"]');
        await pause(1);
        await initiationPage.waitForSelector('[href="/me/"]');
        await initiationCursor.click('[href="/me/"]');
        await initiationPage.waitForSelector('[aria-label="Edit profile"]');
        await pause(2);
        await initiationCursor.click('[aria-label="Edit profile"]');
        await initiationPage.waitForSelector('[aria-label="Add profile picture"]');
        await pause(1);

        /**
         * get hair color, ethnicity from an array
         * Store each choice together, ie: choice 1-4 are blonde, 5-7 dark hair, 8-10 dark skin
         * 
         * other randomizers
         * eye color, hair length, curly/wavy/straight hair, 
         * */
        let ethnicity = ['Russian', 'French', 'Spanish', 'German', 'Swedish', 'Polish', 'American', 'French',  'Asian American', 'African American', 'Indian American'];
        let hairColor = ['blonde', 'brunette', 'black hair'];
        let charecterRandomizer = Math.floor(Math.random() * ethnicity.length);
        if(charecterRandomizer > 7){
            hairColor = hairColor[2];
        }else{
            hairColor = hairColor[Math.floor(Math.random() * hairColor.length)]
        }
        ethnicity = ethnicity[charecterRandomizer];

        //**Profile pic */
        if(await initiationPage.evaluate(() => {return document.querySelector(`[aria-label="Add profile picture"]`).innerText}) == 'Add'){
            await initiationCursor.click('[aria-label="Add profile picture"]');
            await initiationPage.waitForSelector('[role="dialog"] input[type="file"]');
            await pause(1);
            let fileInput = await initiationPage.$('[role="dialog"] input[type="file"]');
    
            //!Generate a prompt
            //age = Math.floor(Math.random() * 10 + 25)

            //!Rendernet.ai
            //1:1 aspect ratio
            let response = await fetch('https://api.unsplash.com/photos/random?query=family', {
                headers: {
                    'Authorization': `Client-ID 7PvN13wlYr41F2_p7FAv_yGoCIdJzUKPNE2NDkoaApQ`
                }
            });
            let data = await response.json();
            let photo = await fetch(data.urls.full);
            let buffer = await photo.buffer();
            let destination = `./${data.id}.jpg`;
            await fs.writeFile(destination, buffer);

            //Overwrite MetaData
            overWriteMetadata(destination);

            //upload file and save
            await fileInput.uploadFile(destination);
            await initiationPage.waitForSelector('[aria-label="Save"]');
            await pause(1);
            await initiationCursor.click('[aria-label="Save"]');
            await initiationPage.waitForFunction(() => !document.querySelector('[aria-label="Save"]'));

            await fs.unlink(destination);
            await pause(1);
            await initiationCursor.click('[aria-label="Edit profile"]');
            await initiationPage.waitForSelector('div.x1q0g3np > [aria-label="Add cover photo"]');
            await pause(1);
        }

        //**Cover pic */
        if(await initiationPage.evaluate(() => {return document.querySelector(`div.x1q0g3np > [aria-label="Add cover photo"]`).innerText}) == 'Add'){
            await initiationCursor.click('div.x1q0g3np > [aria-label="Add cover photo"]');
            await initiationPage.waitForSelector('[role="dialog"] input[type="file"]');
            await pause(1);
            fileInput = await initiationPage.$('[role="dialog"] input[type="file"]');
    
            //!We might have to find a different way to get this
            response = await fetch('https://api.unsplash.com/photos/random?query=nature', {
                headers: {
                    'Authorization': `Client-ID 7PvN13wlYr41F2_p7FAv_yGoCIdJzUKPNE2NDkoaApQ`
                }
            });
            data = await response.json();
            photo = await fetch(data.urls.full);
            buffer = await photo.buffer();
            destination = `./${data.id}.jpg`;
            await fs.writeFile(destination, buffer);

            //Overwrite MetaData
            overWriteMetadata(destination);
    
            //upload and save file
            await fileInput.uploadFile(destination);
            await initiationPage.waitForSelector('[aria-label="Save"]'); // Adjust the timeout as needed
            await pause(1);
            await initiationCursor.click('[aria-label="Save"]');
            await fs.unlink(destination);
            await initiationPage.waitForFunction(() => !document.querySelector('[aria-label="Save"]'));
            await pause(2);
        }

        //**Avatar */
        if(await initiationPage.$(`[aria-label="Create avatar"]`) != null){
            await initiationCursor.click('[aria-label="Create avatar"]');
            await initiationPage.waitForSelector('[aria-label="Choice in Avatar Editor"] > .x1ypdohk');
            await pause(2);

            //make avatar choice based on charecter design
            let avatarChoice;
            if(charecterRandomizer > 8){//dark skin
                avatarChoice = '15';
            }else{//base of hair color
                if(hairColor == 'blonde'){
                    avatarChoice = '7';
                }else{
                    avatarChoice = '29'
                }
            }

            await initiationCursor.click(`[aria-label="Choice in Avatar Editor"]:nth-child(${avatarChoice})`);
            await pause(2);
            await initiationCursor.click('.xozqiw3.xcfux6l');
            await initiationPage.waitForSelector('.x6s0dn4.xwnonoy.x1npaq5j.x1c83p5e.x1enjb0b.x199158v.x14ctfv.x78zum5.x5yr21d.xl56j7k.x1199peq.xh8yej3.xbryuvx.x1mq3mr6');
            await pause(2);
            await initiationCursor.click('[aria-label="Close avatar editor"] > svg');
            await initiationPage.waitForSelector('[aria-label="Edit profile"]');
            await pause(1);
            await initiationCursor.click('[aria-label="Edit profile"]');
            await initiationPage.waitForSelector('[aria-label="Edit profile"] [aria-label="Add bio"]');
        }

        //**Bio */
        if(await initiationPage.evaluate(() => {return document.querySelector(`[aria-label="Edit profile"] [aria-label="Add bio"]`).innerText}) == 'Add'){
            await pause(2);
            await initiationCursor.click('[aria-label="Edit profile"] [aria-label="Add bio"]');
            await initiationPage.waitForSelector('[aria-label="Enter bio text"]');
            await pause(1);
    
            //generate a bio, with chatbdt  Average guy trying to make an impact on the world.
            const chat = await openai.chat.completions.create({
                messages: [{ role: 'user', content: `Imagine you are a middle age person using Facebook to interact with your friends and family. You are filling out your profile information and you want to write a bio. Here are some good examples of bios: "Make an impact on the world.", "Bringing the world closer together.", "Preserving nature.", "Co-chair, Bill and Melinda Gates Foundation Founder, Breakthrough Energy", "Just your average guy.". Write a bio similar to the ones you were provided. Your post should be no more then 100 charecters and should not cut off any words.` }],
                model: 'gpt-3.5-turbo',
            });
    
            await initiationCursor.click('[aria-label="Enter bio text"]');
            await typeWithRandomSpeed(initiationPage, (chat.choices[0].message.content).replace(/['"]/g, ''));
            await pause(2);
            await initiationCursor.click('[aria-label="Save"]');
            await initiationPage.waitForSelector('[aria-label="Share now"]');
        }

        //**Other Info */
        await pause(3);
        await initiationCursor.click('[aria-label="Edit your About info"]');
        await initiationPage.waitForSelector('.xqmdsaz > div > div > .x1hq5gj4 span.x1qq9wsj');
        await pause(1);
        
        let i = 1;
        while(i < 7){
            console.log(i);
            if(await initiationPage.$(`.xqmdsaz > div > div :nth-child(${i}) div.x13faqbe span.x1qq9wsj`) != null){
                const option = await initiationPage.evaluate((i) => {return document.querySelector(`.xqmdsaz > div > div :nth-child(${i}) div.x13faqbe span.x1qq9wsj`).textContent}, i);
        
                //college
                if(option.includes('college')){
                    let college = await fetch(`http://universities.hipolabs.com/search?country=United%20States&limit=1&offset=${Math.floor(Math.random() * 2284 + 1)}`);
                    college = await college.json();
                    console.log(college);

                    await initiationPage.evaluate(() => {
                        const element = document.querySelector('div.x6s0dn4 > div > div > div > div:nth-child(1) > div > div > div > div > div.x1iyjqo2 > div > div');
                        element.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                            inline: 'center',
                        });
                    });

                    await initiationCursor.click(`.xqmdsaz > div > div :nth-child(${i}) div.x13faqbe span.x1qq9wsj`);
                    await initiationPage.waitForSelector('[aria-label="School"]');
                    await pause(1);
                    await initiationCursor.click('[aria-label="School"]');
                    await typeWithRandomSpeed(initiationPage, college[0].name);
                    await pause(2);
                    await initiationPage.click('[aria-label*="suggested search"] > :nth-child(1)');
                    await pause(2);
                    await initiationCursor.click('[aria-label="Save"]');
                    i = 0;
                    await pause(3);
                }else if(option.includes('current city')){//current city
                    console.log(option);
                    let currentTown = await fetch(`https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/us-cities-demographics/records?limit=1&offset=${Math.floor(Math.random() * 2891 + 1)}`);
                    currentTown = await currentTown.json();
                    console.log(currentTown);

                    await initiationPage.evaluate(() => {
                        const element = document.querySelector('div.x6s0dn4 > div > div > div > div:nth-child(1) > div > div > div > div > div.x1iyjqo2 > div > div');
                        element.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                            inline: 'center',
                        });
                    });

                    await initiationCursor.click(`.xqmdsaz > div > div :nth-child(${i}) div.x13faqbe span.x1qq9wsj`);
                    await initiationPage.waitForSelector('[aria-label="Current city"]');
                    await pause(1);
                    await initiationCursor.click('[aria-label="Current city"]');
                    await typeWithRandomSpeed(initiationPage, currentTown.results[0].city + ", " + currentTown.results[0].state);
                    await pause(2);
                    await initiationPage.click('[aria-label*="suggested search"] > :nth-child(1)');
                    await pause(2);
                    await initiationCursor.click('[aria-label="Save"]');
                    i = 0;
                    await pause(3);
                }else if(option.includes('home')){//hometown
                    let hometown = await fetch(`https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/us-cities-demographics/records?limit=1&offset=${Math.floor(Math.random() * 2891 + 1)}`);
                    hometown = await hometown.json();
                    console.log(hometown);

                    await initiationPage.evaluate(() => {
                        const element = document.querySelector('div.x6s0dn4 > div > div > div > div:nth-child(1) > div > div > div > div > div.x1iyjqo2 > div > div');
                        element.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                            inline: 'center',
                        });
                    });

                    await initiationCursor.click(`.xqmdsaz > div > div :nth-child(${i}) div.x13faqbe span.x1qq9wsj`);
                    await initiationPage.waitForSelector('[aria-label="Hometown"]');
                    await pause(1);
                    await initiationCursor.click('[aria-label="Hometown"]');
                    await typeWithRandomSpeed(initiationPage, hometown.results[0].city + ", " + hometown.results[0].state);
                    await initiationPage.waitForSelector('[aria-label*="suggested search"]');
                    await pause(2);
                    await initiationPage.click('[aria-label*="suggested search"] > :nth-child(1)');
                    await pause(2);
                    await initiationCursor.click('[aria-label="Save"]');
                    i = 0;
                    await pause(3);
                }else if(option.includes('relationship')){//relationship status
                    await initiationPage.evaluate(() => {
                        const element = document.querySelector('div.x6s0dn4 > div > div > div > div:nth-child(1) > div > div > div > div > div.x1iyjqo2 > div > div');
                        element.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                            inline: 'center',
                        });
                    });

                    await initiationCursor.click(`.xqmdsaz > div > div :nth-child(${i}) div.x13faqbe span.x1qq9wsj`);
                    await initiationPage.waitForSelector('[aria-haspopup="listbox"][role="combobox"]');
                    await pause(1);
                    await initiationCursor.click('[aria-haspopup="listbox"][role="combobox"]');
                    await initiationPage.waitForSelector('.xdt5ytf.x1iyjqo2 > .x12ejxvf');
                    await pause(2);
                    await initiationCursor.click(`.xdt5ytf.x1iyjqo2 > .x12ejxvf > :nth-child(${Math.floor(Math.random() * 4 + 1)})`);
                    await pause(3);
                    await initiationCursor.click('[aria-label="Save"]');
                    i = 0;
                    await pause(3);
                }else{
                    i++;
                }
            }else{
                i++;
            }
        }
    } catch (error) {
        errorMessage('Error filling in info', error);
        //await logPageContent(initiationPage);
    }
}