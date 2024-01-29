//require
require('dotenv').config();
const { workerData } = require('worker_threads');
const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(stealthPlugin());
const { createCursor } = require("ghost-cursor");

//discord.js
const { Client, GatewayIntentBits } = require('discord.js');
const { Page } = require('puppeteer');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
client.login(process.env.DISCORD_BOT_TOKEN);

//for fetching pics from the database
const fetch = require('node-fetch');
const fs = require('fs/promises');

//init chatgpt
const OpenAI = require("openai");
const { channel } = require('diagnostics_channel');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

//error message send function
const errorMessage = (message, error) => {
    console.log(message + ': ' + error);
    //mainChannel.send(message + ': ' + error);
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

//general instantiation
let languageBrowser;
let languagePage;
let languageCursor;

const start = async () => {
    //initiate a browser with random resi proxy and request interception
    try{
        languageBrowser = await puppeteer.launch({
            headless: false,
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

        await languagePage.setRequestInterception(true);
        languagePage.on('response', async response => {
            //detect redirection
            if ([300, 301, 302, 303, 307, 308].includes(response.status())) {
                const redirectURL = response.headers()['location'];
                console.log(`Redirected to: ${redirectURL}`);

                if(await languagePage.$('[href="https://m.facebook.com/terms.php"]') != null && await languagePage.$('[aria-label="Dismiss"]') != null){
                    console.log("checkpointed")
                    await pause(1);
                    await languageCursor.click('[aria-label="Dismiss"]');
                }
            }
        });

        //create cursor
        languageCursor = createCursor(languagePage);

        //change the viewport
        languagePage.setViewport({ width: 1366, height: 768 });

        //Set cookies in browser
        await languagePage.setCookie(...workerData.cookies);

        console.log(workerData.username);

        await languagePage.goto('https://www.facebook.com', {waitUntil: 'load'});

        //detect accounts that need login
        if(await languagePage.$('[name="login"]') != null){
            console.log("account is fucked");
            return false;
        }else{
            return true;
        }
    }catch(error){
        errorMessage('Error with page initiation', error);
    }
}

//** Works */
const changeLanguage = async () => {
    //initiate a browser with random resi proxy and request interception
    try{
        //go to the search page
        await languageCursor.click('div.x1i10hfl.x1qjc9v5.xjbqb8w.xjqpnuy.xa49m3k.xqeqjp1.x2hbi6w.x13fuv20.xu3j5b3.x1q0q8m5.x26u7qi.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xdl72j9.x2lah0s.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x2lwn1j.xeuugli.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1n2onr6.x16tdsg8.x1hl2dhg.xggy1nq.x1ja2u2z.x1t137rt.x1o1ewxj.x3x9cwd.x1e5q0jg.x13rtm0m.x1q0g3np.x87ps6o.x1lku1pv.x1a2a7pz.xzsf02u.x1rg5ohu > div > svg > g > image');
        await languagePage.waitForSelector('.x1oo3vh0.x1rdy4ex');
        await pause(1);
        await languageCursor.click('.x1oo3vh0.x1rdy4ex > :nth-child(1)');
        await languagePage.waitForSelector('div.x1y1aw1k > div > div:nth-child(1) > a > div.x6s0dn4.x1q0q8m5 > div.x6s0dn4.xkh2ocl.x1q0q8m5 > div');
        await pause(1);
        await languageCursor.click('div.x1y1aw1k > div > div:nth-child(1) > a > div.x6s0dn4.x1q0q8m5 > div.x6s0dn4.xkh2ocl.x1q0q8m5 > div');
        await languagePage.waitForSelector('[href*="language"]');
        await pause(2);

        if(await languagePage.$('div.xpvyfi4.xc9qbxq.xyamay9.x1pi30zi.x1l90r2v.x1swvt13.x1n2onr6.xq1dxzn > div > div > div.x6s0dn4.x78zum5.xl56j7k.x1608yet.xljgi0e.x1e0frkt > div') != null){
            console.log("click");
            await languageCursor.click('div.xpvyfi4.xc9qbxq.xyamay9.x1pi30zi.x1l90r2v.x1swvt13.x1n2onr6.xq1dxzn > div > div > div.x6s0dn4.x78zum5.xl56j7k.x1608yet.xljgi0e.x1e0frkt > div');
            await pause(2);
        }

        await languageCursor.click('[href*="language"]');
        await pause(2);

        if(await languagePage.$('div.x9f619.x1n2onr6.x1ja2u2z.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.x78zum5.x1t2pt76 > div > div > div > div > div:nth-child(2) > div > div > div:nth-child(1) > div:nth-child(2) > div > div.xezivpi') != null){
            if(await languagePage.$('div.x1uvtmcs.x4k7w5x > div > div > div > div.xpvyfi4.xc9qbxq > div > div') != null){
                await languageCursor.click('div.x1uvtmcs.x4k7w5x > div > div > div > div.xpvyfi4.xc9qbxq > div > div');
            }
            await languageCursor.click('div.x9f619.x1n2onr6.x1ja2u2z.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.x78zum5.x1t2pt76 > div > div > div > div > div:nth-child(2) > div > div > div:nth-child(1) > div:nth-child(2) > div > div.xezivpi');
            //click button drop down
            await languagePage.waitForSelector('div.x9f619.x1n2onr6.x1ja2u2z.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.x78zum5.x1t2pt76 > div > div > div > div > div:nth-child(2) > div > div > div:nth-child(1) > div:nth-child(2) > div > div > div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x2lah0s.x193iq5w.xyamay9.x1l90r2v > div > div > div');
            await languageCursor.click('div.x9f619.x1n2onr6.x1ja2u2z.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.x78zum5.x1t2pt76 > div > div > div > div > div:nth-child(2) > div > div > div:nth-child(1) > div:nth-child(2) > div > div > div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x2lah0s.x193iq5w.xyamay9.x1l90r2v > div > div > div');

            //click english 
            await languagePage.waitForSelector('div.xu96u03.xm80bdy.x10l6tqk.x13vifvy > div.x1n2onr6 > div > div > div > div > div.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6 > div');
            const languageArr = await languagePage.$$('div.xu96u03.xm80bdy.x10l6tqk.x13vifvy > div.x1n2onr6 > div > div > div > div > div.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6 > div > div');
            for (const element of languageArr) {
              const elementText = await languagePage.evaluate(el => el.textContent, element);
          
              if (elementText === 'English (US)') {
                await element.click();
                break;
              }
            }

            //click submit
            await languagePage.waitForSelector('div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x2lah0s.x193iq5w.x1gryazu.xezivpi > div > div:nth-child(2) > div.x1i10hfl.xjbqb8w.x6umtig.x1b1mbwd.xaqea5y.xav7gou.x1ypdohk.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1o1ewxj.x3x9cwd.x1e5q0jg.x13rtm0m.x87ps6o.x1lku1pv.x1a2a7pz.x9f619.x3nfvp2.xdt5ytf.xl56j7k.x1n2onr6.xh8yej3');
            await languageCursor.click('div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x2lah0s.x193iq5w.x1gryazu.xezivpi > div > div:nth-child(2) > div.x1i10hfl.xjbqb8w.x6umtig.x1b1mbwd.xaqea5y.xav7gou.x1ypdohk.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1o1ewxj.x3x9cwd.x1e5q0jg.x13rtm0m.x87ps6o.x1lku1pv.x1a2a7pz.x9f619.x3nfvp2.xdt5ytf.xl56j7k.x1n2onr6.xh8yej3');

        }else{
            await languageCursor.click('div.x9f619.x1n2onr6.x1ja2u2z.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.x78zum5.x1t2pt76 > div > div > div > div > div > div > div:nth-child(2) > div > div > div:nth-child(2) > div > div > div > div > div > div > div > div > div.x9f619.x1n2onr6.x1ja2u2z.xdt5ytf.x2lah0s.x193iq5w.xeuugli.x78zum5 > div > div');
            //click english
            await languagePage.waitForSelector('div.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6.xaci4zi.x129vozr > div > div > div:nth-child(4) > div > div.x6s0dn4.x1q0q8m5.x1qhh985.xu3j5b3.xcfux6l.x26u7qi.xm0m39n.x13fuv20.x972fbf.x9f619.x78zum5.x1q0g3np.x1iyjqo2.xs83m0k.x1qughib.xat24cr.x11i5rnm.x1mh8g0r.xdj266r.xeuugli.x18d9i69.x1sxyh0.xurb0ha.xexx8yu.x1n2onr6.x1ja2u2z.x1gg8mnh > div');
            await languageCursor.click('div.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6.xaci4zi.x129vozr > div > div > div:nth-child(4) > div > div.x6s0dn4.x1q0q8m5.x1qhh985.xu3j5b3.xcfux6l.x26u7qi.xm0m39n.x13fuv20.x972fbf.x9f619.x78zum5.x1q0g3np.x1iyjqo2.xs83m0k.x1qughib.xat24cr.x11i5rnm.x1mh8g0r.xdj266r.xeuugli.x18d9i69.x1sxyh0.xurb0ha.xexx8yu.x1n2onr6.x1ja2u2z.x1gg8mnh > div');
            //submit
            await languagePage.waitForSelector('div.x1uvtmcs.x4k7w5x.x1h91t0o.x1beo9mf.xaigb6o.x12ejxvf.x3igimt.xarpa2k.xedcshv.x1lytzrv.x1t2pt76.x7ja8zs.x1n2onr6.x1qrby5j.x1jfb8zj > div > div > div > div > div > div > div.x1jx94hy.xh8yej3.x1hlgzme.xvcs8rp.x1bpvpm7.xefnots.x13xjmei.xv7j57z > div > div > div > div > div:nth-child(1) > div > div');
            await languageCursor.click('div.x1uvtmcs.x4k7w5x.x1h91t0o.x1beo9mf.xaigb6o.x12ejxvf.x3igimt.xarpa2k.xedcshv.x1lytzrv.x1t2pt76.x7ja8zs.x1n2onr6.x1qrby5j.x1jfb8zj > div > div > div > div > div > div > div.x1jx94hy.xh8yej3.x1hlgzme.xvcs8rp.x1bpvpm7.xefnots.x13xjmei.xv7j57z > div > div > div > div > div:nth-child(1) > div > div');
        }
        await languagePage.waitForNavigation({ waitUntil: 'load' });
        await mainChannel.send("Finish: " + workerData.username);
    }catch(error){
        errorMessage('Error with page initiation', error);
        //await logPageContent(languagePage);
    }
}

const fillProfile = async() => {
    try {
        // Navigate to the account settings page
        await languagePage.waitForSelector('[aria-label="Your profile"]');
        await languageCursor.click('[aria-label="Your profile"]');
        await pause(1);
        await languagePage.waitForSelector('[href="/me/"]');
        await languageCursor.click('[href="/me/"]');
        await languagePage.waitForSelector('[aria-label="Edit profile"]');
        await pause(2);
        await languageCursor.click('[aria-label="Edit profile"]');
        await languagePage.waitForSelector('[aria-label="Add profile picture"]');
        await pause(1);

        //**Profile pic */
        if(await languagePage.evaluate(() => {return document.querySelector(`[aria-label="Add profile picture"]`).innerText}) == 'Add'){
            await languageCursor.click('[aria-label="Add profile picture"]');
            await languagePage.waitForSelector('[role="dialog"] input[type="file"]');
            await pause(1);
            let fileInput = await languagePage.$('[role="dialog"] input[type="file"]');
    
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
            await fileInput.uploadFile(destination);
            
            await languagePage.waitForSelector('[aria-label="Save"]');
            await pause(1);
            await languageCursor.click('[aria-label="Save"]');
            await languagePage.waitForFunction(() => !document.querySelector('[aria-label="Save"]'));

            await fs.unlink(destination);
            await pause(1);
            await languageCursor.click('[aria-label="Edit profile"]');
            await languagePage.waitForSelector('div.x1q0g3np > [aria-label="Add cover photo"]');
            await pause(1);
        }

        //**Cover pic */
        if(await languagePage.evaluate(() => {return document.querySelector(`div.x1q0g3np > [aria-label="Add cover photo"]`).innerText}) == 'Add'){
            await languageCursor.click('div.x1q0g3np > [aria-label="Add cover photo"]');
            await languagePage.waitForSelector('[role="dialog"] input[type="file"]');
            await pause(1);
            fileInput = await languagePage.$('[role="dialog"] input[type="file"]');
    
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
            await fileInput.uploadFile(destination);
    
            //await upload
            await languagePage.waitForSelector('[aria-label="Save"]'); // Adjust the timeout as needed
            await pause(1);
            await languageCursor.click('[aria-label="Save"]');
            await fs.unlink(destination);
            await languagePage.waitForFunction(() => !document.querySelector('[aria-label="Save"]'));
            await pause(2);
        }

        //**Avatar */
        if(await languagePage.$(`[aria-label="Create avatar"]`) != null){
            await languageCursor.click('[aria-label="Create avatar"]');
            await languagePage.waitForSelector('[aria-label="Choice in Avatar Editor"] > .x1ypdohk');
            const avatars = await languagePage.$$('[aria-label="Choice in Avatar Editor"]');
            await pause(2);
            await languageCursor.click(avatars[Math.floor(Math.random() * avatars.length)]);//!Who tf knows if this will work
            await pause(2);
            await languageCursor.click('.xozqiw3.xcfux6l');
            await languagePage.waitForSelector('.x6s0dn4.xwnonoy.x1npaq5j.x1c83p5e.x1enjb0b.x199158v.x14ctfv.x78zum5.x5yr21d.xl56j7k.x1199peq.xh8yej3.xbryuvx.x1mq3mr6');
            await pause(2);
            await languageCursor.click('[aria-label="Close avatar editor"] > svg');
            await languagePage.waitForSelector('[aria-label="Edit profile"]');
            await pause(1);
            await languageCursor.click('[aria-label="Edit profile"]');
            await languagePage.waitForSelector('[aria-label="Edit profile"] [aria-label="Add bio"]');
        }

        //**Bio */
        if(await languagePage.evaluate(() => {return document.querySelector(`[aria-label="Edit profile"] [aria-label="Add bio"]`).innerText}) == 'Add'){
            await pause(2);
            await languageCursor.click('[aria-label="Edit profile"] [aria-label="Add bio"]');
            await languagePage.waitForSelector('[aria-label="Enter bio text"]');
            await pause(1);
    
            //generate a bio, with chatbdt  Average guy trying to make an impact on the world.
            const chat = await openai.chat.completions.create({
                messages: [{ role: 'user', content: `Imagine you are a middle age person using Facebook to interact with your friends and family. You are filling out your profile information and you want to write a bio. Here are some good examples of bios: "Make an impact on the world.", "Bringing the world closer together.", "Preserving nature.", "Co-chair, Bill and Melinda Gates Foundation Founder, Breakthrough Energy", "Just your average guy.". Write a bio similar to the ones you were provided. Your post should be no more then 100 charecters and should not cut off any words.` }],
                model: 'gpt-3.5-turbo',
            });
            console.log((chat.choices[0].message.content).replace(/['"]/g, ''));
    
            await languageCursor.click('[aria-label="Enter bio text"]');
            await typeWithRandomSpeed(languagePage, (chat.choices[0].message.content).replace(/['"]/g, ''));
            await pause(2);
            await languageCursor.click('[aria-label="Save"]');
            await languagePage.waitForSelector('[aria-label="Share now"]');
        }

        //**Other Info */
        await pause(3);
        await languageCursor.click('[aria-label="Edit your About info"]');
        await languagePage.waitForSelector('.xqmdsaz > div > div > .x1hq5gj4 span.x1qq9wsj');
        await pause(1);
        const inputs = await languagePage.$$('.xqmdsaz > div > div > .x1hq5gj4 span.x1qq9wsj');
        
        for (const input of inputs) {
            const option = await languagePage.evaluate(el => el.textContent, input);
        
            //college
            if(option.includes('college')){
                let college = await fetch(`http://universities.hipolabs.com/search?country=United%20States&limit=1&offset=${Math.floor(Math.random() * 2284 + 1)}`);
                college = await college.json();
                console.log(college);

                await languagePage.evaluate(() => {
                    const element = document.querySelector('div.x6s0dn4 > div > div > div > div:nth-child(1) > div > div > div > div > div.x1iyjqo2 > div > div');
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'center',
                    });
                });

                await languageCursor.click(input);
                await languagePage.waitForSelector('[aria-label="School"]');
                await pause(1);
                await languageCursor.click('[aria-label="School"]');
                await typeWithRandomSpeed(languagePage, college[0].name);
                await pause(2);
                await languagePage.click('[aria-label*="suggested search"] > :nth-child(1)');
                await pause(2);
                await languageCursor.click('[aria-label="Save"]');
            }

            //current city
            if(option.includes('current city')){
                let currentTown = await fetch(`https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/us-cities-demographics/records?limit=1&offset=${Math.floor(Math.random() * 2891 + 1)}`);
                currentTown = await currentTown.json();
                console.log(currentTown);

                await languagePage.evaluate(() => {
                    const element = document.querySelector('div.x6s0dn4 > div > div > div > div:nth-child(1) > div > div > div > div > div.x1iyjqo2 > div > div');
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'center',
                    });
                });

                console.log("1");
                await languageCursor.click(input);
                console.log("2");
                await languagePage.waitForSelector('[aria-label="Current city"]');
                await pause(1);
                await languageCursor.click('[aria-label="Current city"]');
                await typeWithRandomSpeed(languagePage, currentTown.results[0].city + ", " + currentTown.results[0].state);
                await pause(2);
                await languagePage.click('[aria-label*="suggested search"] > :nth-child(1)');
                await pause(2);
                await languageCursor.click('[aria-label="Save"]');
            }

            //hometown
            if(option.includes('hometown')){
                let hometown = await fetch(`https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/us-cities-demographics/records?limit=1&offset=${Math.floor(Math.random() * 2891 + 1)}`);
                hometown = await hometown.json();
                console.log(hometown);

                await languagePage.evaluate(() => {
                    const element = document.querySelector('div.x6s0dn4 > div > div > div > div:nth-child(1) > div > div > div > div > div.x1iyjqo2 > div > div');
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'center',
                    });
                });

                await languageCursor.click(input);
                await languagePage.waitForSelector('[aria-label="Hometown"]');
                await pause(1);
                await languageCursor.click('[aria-label="Hometown"]');
                await typeWithRandomSpeed(languagePage, hometown.results[0].city + ", " + hometown.results[0].state);
                await languagePage.waitForSelector('[aria-label*="suggested search"]');
                await pause(2);
                await languagePage.click('[aria-label*="suggested search"] > :nth-child(1)');
                await pause(2);
                await languageCursor.click('[aria-label="Save"]');
            }

            //relationship status
            if(option.includes('relationship')){
                await languagePage.evaluate(() => {
                    const element = document.querySelector('div.x6s0dn4 > div > div > div > div:nth-child(1) > div > div > div > div > div.x1iyjqo2 > div > div');
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'center',
                    });
                });

                await languageCursor.click(input);
                await languagePage.waitForSelector('[aria-haspopup="listbox"][role="combobox"]');
                await pause(1);
                await languageCursor.click('[aria-haspopup="listbox"][role="combobox"]');
                await languagePage.waitForSelector('.xdt5ytf.x1iyjqo2 > .x12ejxvf');
                await pause(2);
                await languageCursor.click(`.xdt5ytf.x1iyjqo2 > .x12ejxvf > :nth-child(${Math.floor(Math.random() * 4 + 1)})`);
                await pause(3);
                await languageCursor.click('[aria-label="Save"]');
            }
        }
    } catch (error) {
        errorMessage('Error filling in info', error);
        //await logPageContent(languagePage);
    }
}

//main function
(async () => {
    try {
        if(await start()){
            //Change Language
            const language = await languagePage.evaluate(() => {return document.documentElement.lang});
            if (language !== 'en') {
                await changeLanguage();
            }

            //Change profile pic, cover photo, avatar, and bio
            await fillProfile();

        }

        console.log('finish');
    } catch (error) {
        errorMessage('Error with main function', error);
    }
})();