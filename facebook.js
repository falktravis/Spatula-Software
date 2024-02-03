const { workerData, parentPort } = require('worker_threads');
const puppeteer = require('puppeteer-extra');
const { createCursor } = require("ghost-cursor");
const stealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(stealthPlugin());
const fs = require('fs/promises');

//discord.js
const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { log } = require('console');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.login(process.env.DISCORD_BOT_TOKEN);

//Closes browsers before terminating the task with facebook-delete command
parentPort.on('message', async (message) => {
    if(message.action === 'closeBrowsers') {
        await endTask();
    }
    else if(message.action === 'newAccount'){
        try {
            isDormant = false;
    
            //set all new account data
            burnerCookies = message.Cookies;
            burnerUsername = message.Username;
            burnerPassword = message.Password;
            burnerProxy = message.Proxy;
            burnerPlatform = message.Platform;
    
            //close browser
            if(mainBrowser != null){
                await mainBrowser.close();
                mainBrowser = null;
            }
            startError = false;
    
            //restart the main page
            await start();
            await setListingStorage();
    
            isDormant = true;
        } catch (error) {
            errorMessage("Error assigning new account: ", error);
        }
    }
});

client.on('ready', async () => {
    try {
        mainChannel = client.channels.cache.get(workerData.channel);
        if(mainChannel == null){
            mainChannel = await client.channels.fetch(workerData.channel);
        }

        logChannel = client.channels.cache.get('1091532766522376243');
        if(logChannel == null){
            logChannel = await client.channels.fetch('1091532766522376243');
        }
    } catch (error) {
        errorMessage('Error fetching channel', error);
    }

    //Start up
    try {
        isDormant = false;
        await start();
        
        if(startError == false){
            setListingStorage();
            accountRotation();
            interval(); 
        }/*else{
            await logChannel.send("Rotate Account for Start Error: " + burnerUsername);
            await mainBrowser.close();
            mainBrowser = null;
            parentPort.postMessage({action: 'rotateAccount', username: burnerUsername, cookies: burnerCookies});
        }*/

        isDormant = true;
    } catch (error) {
        errorMessage("Error starting up task", error);
    }
});

//!Try sigterm and sigint instead of this
// Add cleanup logic on worker exit
process.on('exit', async () => {
    await logChannel.send('Task Close: ' + workerData.name);
    await mainBrowser.close();
});

// Add cleanup logic on uncaught exception
process.on('uncaughtException', async (err) => {
    await logChannel.send('Uncaught Exception in ' + workerData.name + ': ' + err);
    if(mainBrowser != null){
        await mainBrowser.close();
    }
    process.exit(1); // Terminate the process
});

// Add cleanup logic on unhandled promise rejection
process.on('unhandledRejection', async (reason, promise) => {
    await logChannel.send('Unhandled Rejection in ' + workerData.name + ':' + reason);
    if(mainBrowser != null){
        await mainBrowser.close();
    }
    process.exit(1); // Terminate the process
});

//error message send function 
const errorMessage = (message, error) => {
    console.log(workerData.name + ': ' + message + ': ' + error);
    logChannel.send(workerData.name + ': ' + message + ': ' + error);
    //mainChannel.send(workerData.name + ': ' + message + ': ' + error); .... :)
}

const endTask = async () => {
    try {
        burnerCookies = await mainPage.cookies();
        console.log('close browsers');
        if(mainBrowser != null){
            await mainBrowser.close();
            mainBrowser = null;
        }
        if(itemBrowser != null){
            await itemBrowser.close();
            itemBrowser = null;
        }

        parentPort.postMessage({messageCookies: messageCookies, cookies: burnerCookies});
    } catch (error) {
        errorMessage("Error closing browser: ", error);
    }
}

//randomize time till post check
const getRandomInterval = () => {
    try {
        const minNumber = 520000; //9 mins
        const maxNumber = 720000; //12 mins
        const power = 1.5;
        const random = Math.random();
        const range = maxNumber - minNumber;
        const number = minNumber + Math.pow(random, power) * range;
        return Math.round(number);
    } catch (error) {
        errorMessage('error getting random interval', error);
    }
}

//send content of the page to discord
const logPageContent = async (page) => {
    try{
        //html
        const htmlContent = await page.content();
        const { Readable } = require('stream');
        const htmlStream = Readable.from([htmlContent]);
        await logChannel.send({
            files: [
                {
                    attachment: htmlStream,
                    name: 'website.html',
                },
            ],
        });

        //png
        await page.screenshot({ path: 'screenshot.png' });
        await logChannel.send({
            files: ['screenshot.png'],
        });
        await fs.unlink('screenshot.png');
    }catch(error){
        errorMessage('error login content: ', error);
    }
}

//pause for 0.5s-2s to humanize behavior
const pause = async () => {
    try {
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * (1200 - 500 + 1)) + 500));
    } catch (error) {
        errorMessage('error with pause', error);
    }
}

//convert platform string for a user agent
const platformConverter = (platform) => {
    try {
        if(platform === 'Windows'){
            return 'Windows NT 10.0; Win64; x64';
        }else if(platform === 'Linux'){
            return 'X11; Linux x86_64';
        }else if(platform === 'macOS'){
            return 'Macintosh; Intel Mac OS X 10_15_7';
        }
    } catch (error) {
        errorMessage('error with converting platform', error);
    }
}

// Function to simulate typing with randomized speed
async function typeWithRandomSpeed(page, text) {
    try {
        for (const char of text) {
            // Type a character
            await page.keyboard.type(char, { delay: Math.floor(Math.random() * (100 - 50 + 1)) + 50 });
        }
    } catch (error) {
        errorMessage('error with typing random speed', error);
    }
}

//generates an array of possible prices based on the max price
const getPrices = () => {
    let array = [];
    let arrayValue = workerData.maxPrice;

    try {
        const generateArray = async (range, inc) => {
            arrayValue = arrayValue + inc;
            while(arrayValue <= workerData.maxPrice + range){
                array.push(arrayValue);
                arrayValue = arrayValue + inc;
            }
        }

        if(workerData.maxPrice < 50){
            generateArray(16, 2);
        }else if(workerData.maxPrice < 100){
            generateArray(40, 5);
        }else if(workerData.maxPrice < 1000){
            generateArray(80, 10);
        }else if(workerData.maxPrice < 2500){
            generateArray(160, 20);
        }else if(workerData.maxPrice < 10000){
            generateArray(400, 50);
        }else if(workerData.maxPrice < 100000){
            generateArray(1000, 100);
        }else if(workerData.maxPrice < 500000){
            generateArray(10000, 1000);
        }
    } catch (error) {
        errorMessage('error with getting price array', error);
    }

    return array;
}

//timeout to rotate accounts
const accountRotation = () => {
    setTimeout(async () => {
        try {
            while(isDormant == false){
                console.log('task non dormant');
                await new Promise(r => setTimeout(r, 10000));
            }

            burnerCookies = await mainPage.cookies();

            //send message to main
            parentPort.postMessage({action: 'rotateAccount', username: burnerUsername, cookies: burnerCookies});
            accountRotation();
        } catch (error) {
            errorMessage("Error with account rotation: ", error);
        }
    }, (Math.random() * 7200000) + 10800000);//3-5 hours
}

const login = async () => {
    try {
        logChannel.send("Re-Login Required: " + burnerUsername);
        await mainCursor.click('[name="email"]');
        await pause();
        await typeWithRandomSpeed(mainPage, burnerUsername);
        await pause();
        await mainCursor.click('[name="pass"]');
        await pause();
        await typeWithRandomSpeed(mainPage, burnerPassword);
        await pause();
        await mainCursor.click('[name="login"]');

        try{
            await mainPage.waitForNavigation();
        }catch (error) {}

        if(!(mainPage.url()).includes('facebook.com/marketplace')){
            await logPageContent(mainPage);
            startError = true;
            await logChannel.send("Ban on Re-login: " + errorMsg);
            parentPort.postMessage({action: 'ban', username: burnerUsername});
        }else{
            //update burnerCookies
            burnerCookies = await mainPage.cookies();
            //burnerCookies = burnerCookies.filter(cookie => cookie.name === 'xs' || cookie.name === 'datr' || cookie.name === 'sb' || cookie.name === 'c_user');
        }
    } catch (error) {
        startError = true;
        await logChannel.send('error with re-login + ban: ' + error);
        parentPort.postMessage({action: 'ban', username: burnerUsername});
    }
}

const sendMessage = async (link) => {
    let messageCursor;

    //browser with static isp
    try {
        itemBrowser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', `--user-agent=Mozilla/5.0 (${platformConverter(workerData.messagePlatform)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36`, `--proxy-server=${workerData.messageProxy}`],
            timeout: 60000
        });
        let pages = await itemBrowser.pages();
        itemPage = pages[0];

        //close the notif popup
        const context = itemBrowser.defaultBrowserContext();
        context.overridePermissions("https://www.facebook.com", ["notifications"]);

        //create a cursor
        messageCursor = createCursor(itemPage);

        //change http headers
        itemPage.setExtraHTTPHeaders({
            'Referer': 'https://www.facebook.com/login',
            'Sec-Ch-Ua': 'Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114',
            'Sec-Ch-Ua-Full-Version-List': 'Not.A/Brand";v="8.0.0.0", "Chromium";v="114.0.5735.199", "Google Chrome";v="114.0.5735.199',
            'Sec-Ch-Ua-Platform': workerData.messagePlatform
        });

        //change the viewport
        itemPage.setViewport({ width: 1366, height: 768 });

        //set cookies/login if the login was a success
        await itemPage.setCookie(...messageCookies);

        //network shit
        await itemPage.setRequestInterception(true);
        itemPage.on('request', async request => {
            const resource = request.resourceType();
            if(resource == 'image'){//resource != 'document' && resource != 'script' && resource != 'xhr' && resource != 'stylesheet'
                request.abort();
            }else{
                request.continue();
            }
        });
    } catch (error) {
        errorMessage('Error with item page instantiation for cookie login', error);
    }

    try{
        //navigate to the product page
        await itemPage.goto(link, { waitUntil: 'networkidle0' }); 

        //Update cookies
        messageCookies = await itemPage.cookies();
        messageCookies = messageCookies.filter(cookie => cookie.name === 'xs' || cookie.name === 'datr' || cookie.name === 'sb' || cookie.name === 'c_user');

        //Send the message
        if(!itemPage.url().includes('facebook.com/login')){
            if(!itemPage.url().includes('unavailable_product')){
                if(await itemPage.$('div.x1daaz14 [aria-label="Send seller a message"]')){//regular, pickup listing
    
                    console.log("local pickup only message sequence");
                    if(workerData.message != null){
                        await pause();
                        await messageCursor.click('div.x1daaz14 [aria-label="Send seller a message"]');
                        await itemPage.keyboard.press('Backspace');
                        await typeWithRandomSpeed(itemPage, 'div.x1daaz14 [aria-label="Send seller a message"]', workerData.message);
                    }
                    await pause();
                    await messageCursor.click('div.x1daaz14 div.x14vqqas div.xdt5ytf');
                    await itemPage.waitForSelector('[aria-label="Message Again"]');
                    mainChannel.send("Message Sent!");
                }else if(await itemPage.$('[aria-label="Message"]') && await itemPage.$('span.x1xlr1w8.x1a1m0xk') == null){//shipping listing
                    console.log("shipping message sequence");
                    await pause();
                    await messageCursor.click('[aria-label="Message"]');
                    await itemPage.waitForSelector('[aria-label="Please type your message to the seller"]');
                    if(workerData.message != null){
                        await pause();
                        await messageCursor.click('[aria-label="Please type your message to the seller"]');
                        await typeWithRandomSpeed(itemPage, '[aria-label="Please type your message to the seller"]', workerData.message);
                    }
                    await pause();
                    //await itemPage.waitForSelector('[aria-label="Message Again"]'); //!Gotta test this
                    await messageCursor.click('[aria-label="Send Message"]');
                    await itemPage.waitForSelector('[aria-label="Message Again"]');
                    mainChannel.send("Message Sent!");
                }else if(await itemPage.$('span.x1xlr1w8.x1a1m0xk')){//check for a regular pending/sold listing
                    let listingConditionText = await itemPage.evaluate(() => {return document.querySelector('span.x1xlr1w8.x1a1m0xk').innerText});
                    mainChannel.send("Message Failed: item " + listingConditionText);
                }else if(await itemPage.$('span.xk50ysn.x1a1m0xk')){//Check for the weird out of stock thing //!I have no clue if this is actually a thing
                    let listingConditionText = await itemPage.evaluate(() => {return document.querySelector('span.xk50ysn.x1a1m0xk').innerText});
                    mainChannel.send("Message Failed: item " + listingConditionText);
                }else{
                    mainChannel.send("Message Failed");
                }
            }else{
                mainChannel.send("Product Unavailable");
            }
        }else{
            mainChannel.send("Cookies Expired\n\tUpdate the cookies and restart the task to use messaging");
        }
    } catch (error){
        errorMessage('Error with messaging', error);
    }

    try {
        if(workerData.messageType != 1){//if its not auto messaging
            await itemBrowser.close();
            itemBrowser = null;
        }
    } catch (error) {
        errorMessage('Error with closing itemBrowser', error);
    }
}

let startError = false; //stops script on error
let newPost;
let mainBrowser;
let mainPage;
let itemPage;
let itemBrowser;
let mainListingStorage;
let isDormant = true; //true if task can be deleted
let mainCursor;
let prices = getPrices(); //array of all possible prices for max price
let mainPageInitiate;
let mainChannel;
let logChannel;

//changeable account stuff
let messageCookies = workerData.messageCookies;
let burnerCookies = workerData.burnerCookies;
let burnerUsername = workerData.burnerUsername;
let burnerPassword = workerData.burnerPassword;
let burnerProxy = workerData.burnerProxy;
let burnerPlatform = workerData.burnerPlatform;

const start = async () => {
    try{
        mainPageInitiate = true;

        //initialize the static isp proxy page
        mainBrowser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', `--user-agent=Mozilla/5.0 (${platformConverter(burnerPlatform)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36`, `--proxy-server=${burnerProxy}`],
            timeout: 60000
        });

        //close the notif popup
        const context = mainBrowser.defaultBrowserContext();
        context.overridePermissions("https://www.facebook.com", ["notifications"]);

        //create the page
        let pages = await mainBrowser.pages();
        mainPage = pages[0];

        //create a cursor
        mainCursor = createCursor(mainPage);

        //network shit
        mainPage.on('response', async response => {

            //detect redirection
            if ([300, 301, 302, 303, 307, 308].includes(response.status())) {
                const redirectURL = response.headers()['location'];
                console.log(`Redirected to: ${redirectURL}`);
                logChannel.send(`${workerData.name} redirected to: ${redirectURL}`);

                startError = true;

                if(redirectURL.includes('privacy/consent/lgpd_migrated')){
                    //end the task and message myself containing the account name
                    logChannel.send('Account lgpd migrated: ' + burnerUsername);
                    console.log('Account lgpd migrated: ' + burnerUsername);
                }else if(redirectURL.includes('/checkpoint/')){
                    logChannel.send('Account banned: ' + burnerUsername);
                    console.log('Account banned: ' + burnerUsername);
            
                    //message the main script to delete the burner account
                    parentPort.postMessage({action: 'ban', username: burnerUsername});
                }else if(redirectURL.includes('/login/?next')){
                    try{
                        await mainPage.waitForSelector('[name="email"]');
                    }catch(error){}

                    await login();
                }else{
                    //message the main script to get a new accounts
                    logChannel.send("Rotate Account: " + burnerUsername);
                    burnerCookies = await mainPage.cookies();
                    await mainBrowser.close();
                    mainBrowser = null;
                    parentPort.postMessage({action: 'rotateAccount', username: burnerUsername, cookies: burnerCookies});
                }
            }
        });

        await mainPage.setRequestInterception(true);
        mainPage.on('request', async request => {
            const resource = request.resourceType();
            if(mainPageInitiate){
                if(resource != 'document' && resource != 'script' && resource != 'xhr' && resource != 'stylesheet' && resource != 'other'){
                    request.abort();
                }else{
                    request.continue();
                }
            }else{
                if((workerData.link).includes('propertyrentals')){
                    if(resource != 'document' && resource != 'script' && resource != 'stylesheet' && resource != 'other'){
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
            }
        });

        //change the viewport
        mainPage.setViewport({ width: 1366, height: 768 });

        //change http headers
        mainPage.setExtraHTTPHeaders({
            'Referer': 'https://www.facebook.com/login',
            'Sec-Ch-Ua': 'Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114',
            'Sec-Ch-Ua-Full-Version-List': 'Not.A/Brand";v="8.0.0.0", "Chromium";v="114.0.5735.199", "Google Chrome";v="114.0.5735.199',
            'Sec-Ch-Ua-Platform': burnerPlatform
        });
        
        //Set cookies in browser
        await mainPage.setCookie(...burnerCookies);

        //go to the search page
        try {
            await mainPage.goto(workerData.link, { waitUntil: 'networkidle2' });
        } catch (error) {await logChannel.send("Timeout on going to link")}

        //update burnerCookies
        burnerCookies = await mainPage.cookies();
        //burnerCookies = burnerCookies.filter(cookie => cookie.name === 'xs' || cookie.name === 'datr' || cookie.name === 'sb' || cookie.name === 'c_user');

        // Detect the current language
        const language = await mainPage.evaluate(() => document.documentElement.lang);
        if (language !== 'en') {
            logChannel.send('Language Wrong: ' + language + " -> " + burnerUsername);
            startError = true;
            parentPort.postMessage({action: 'languageWrong', username: burnerUsername});
        }

        //make sure the url is correct
        if(await mainPage.url().split('?')[0] != workerData.link.split('?')[0]){
            if(await mainPage.$('[name="login"]') != null){
                await logChannel.send("Login required: " + mainPage.url() + " at account: " + burnerUsername);

                if(await mainPage.$('[title="Allow all cookies"]') != null){
                    await pause();
                    await mainCursor.click('[title="Allow all cookies"]');
                    try {
                        await mainPage.waitForNavigation();
                    } catch (error) {}
                }

                await login();
            }else{
                await logChannel.send("Link is wrong: " + mainPage.url() + " at account: " + burnerUsername);
            }
        }
    
        //set distance
        if(startError == false){
            try {
                //apply a random element
                await mainPage.waitForSelector('div.x1y1aw1k.xl56j7k > div.x1iyjqo2', {visible: true});
                await pause();
                await mainCursor.click('div.x1y1aw1k.xl56j7k > div.x1iyjqo2');
                await mainPage.waitForSelector('div.x9f619.x14vqqas.xh8yej3', {visible: true});
                await pause();
                await mainCursor.click('div.x9f619.x14vqqas.xh8yej3');
                await pause();
                //click a random element
                await mainCursor.click(`[role="listbox"] div.x4k7w5x > :nth-child(${Math.floor(Math.random() * 11 + 1)})`);
                await pause();
                await mainCursor.click('[aria-label="Apply"]');

                //long pause
                await new Promise(r => setTimeout(r, Math.random() * 15000 + 5000));

                //apply real distance
                await mainCursor.click('div.x1y1aw1k.xl56j7k > div.x1iyjqo2');
                await mainPage.waitForSelector('div.x9f619.x14vqqas.xh8yej3', {visible: true});
                await pause();
                await mainCursor.click('div.x9f619.x14vqqas.xh8yej3');
                await pause();
                await typeWithRandomSpeed(mainPage, (workerData.distance).toString());
                await pause();
                await mainPage.keyboard.press("Enter");
                await pause();
                await mainCursor.click('[aria-label="Apply"]');
                //wait for the results to update, we aren't concerned about time
                await new Promise(r => setTimeout(r, 10000));

                /*
                //Check for kilometers
                try {
                    if((await mainPage.evaluate((distance) => {return document.querySelector(`[role="listbox"] div.x4k7w5x > :nth-child(${distance})`).innerText}, workerData.distance)).includes("kilo")){
                        logChannel.send("kilometers: " + burnerUsername + " : " + workerData.name);
                    }
                } catch (error) {logChannel.send("checking for kilo error: " + error);}
                */
            } catch (error) {
                await logPageContent(mainPage);
                errorMessage('Error with setting distance', error);
            }
        
            mainPageInitiate = false;
        }
    }catch(error){
        errorMessage('error with start', error);
    }
}

const setListingStorage = async () => {
    // Set listingStorage, run once in the begging of the day
    try{
        mainListingStorage = await mainPage.evaluate(() => {
            if(document.querySelector('div.xx6bls6') == null && document.querySelector('[aria-label="Browse Marketplace"]') == null){
                let links = [document.querySelector("div.x1xfsgkm > :nth-child(1) div > :nth-child(1) a"), document.querySelector("div.x1xfsgkm > :nth-child(1) div > :nth-child(2) a"), document.querySelector("div.x1xfsgkm > :nth-child(1) div > :nth-child(3) a")];
                return links.map((link) => {
                    if(link != null){
                        let href = link.href;
                        return href.substring(0, href.indexOf("?"));
                    }else{
                        return null;
                    }
                })
            }else{
                return [null, null, null];
            }
        });
        console.log("Main Storage: " + mainListingStorage);
    }catch (error){
        errorMessage('Error with setting listing storage', error);
    }
}

//the meat and cheese
function interval() {
    let reloadBlock = false;
    setTimeout(async () => {
        isDormant = false;

        //get a value from the start of the array
        let value;
        try {
            value = prices.splice((Math.floor(Math.random() * (prices.length - 6))), 1);
            prices.push(value[0]);
        } catch (error) {
            errorMessage('error with getting price value', error);
        }

        let resultsRefreshMaxAttempts = 0;
        const resultsRefresh = async () => {
            try {
                //change link for results change
                await mainPage.goto((workerData.link).replace(/maxPrice=([^&]+)/, `maxPrice=${value}`), {waitUntil: 'domcontentloaded', timeout: 60000});
                console.log(mainPage.url());
        
                //if the listings dont exist on the page, refresh
                if(await mainPage.$('.xbbxn1n .xqui205 [aria-label="Reload Page"]') != null){
                    reloadBlock = true;
                    burnerCookies = await mainPage.cookies();
                    parentPort.postMessage({action: 'rotateAccount', username: burnerUsername, cookies: burnerCookies});
                    logChannel.send("Reload block: " + workerData.name);
                }else if(await mainPage.$(".x1lliihq .x3ct3a4 a") == null && await mainPage.$('[aria-label="Browse Marketplace"]') == null && await mainPage.$('div.xx6bls6') == null){
                    await mainPage.reload({waitUntil: 'domcontentloaded'});
                    logPageContent(mainPage);
                    logChannel.send('Refresh for null .href error');
                }

                //check to make sure distance is correct
                let actualDistance = await mainPage.evaluate(() => {return document.querySelector('#seo_filters > div > div > div > span').innerText});
                if(!actualDistance.includes(" " + workerData.distance + " ")){
                    await logChannel.send("Distance is WRONG at: " + workerData.name + " Actual value: " + actualDistance + " Expected value: " + workerData.distance);


                }
            } catch(error) {
                if(error.message.includes('TargetCloseError')){
                    logChannel.send("Page Closed");
                    await mainBrowser.close();
                    mainBrowser = null;
                    await start();
                }else if(error.message.includes('ERR_TUNNEL_CONNECTION_FAILED') && resultsRefreshMaxAttempts < 3){
                    resultsRefreshMaxAttempts++;
                    await resultsRefresh();
                }else{
                    errorMessage('Error with results refresh', error);
                }
            }
        };
        await resultsRefresh();

        if(reloadBlock == false){
            try {
                //check for new posts
                newPost = await mainPage.evaluate(() => {
                    if(document.querySelector('div.xx6bls6') == null && document.querySelector('[aria-label="Browse Marketplace"]') == null){
                        let link = document.querySelector(".x3ct3a4 a").href;
                        return link.substring(0, link.indexOf("?"));
                    }else{
                        return null;
                    }
                });
            } catch (error) {
                errorMessage('Error with getting results', error);
            }
        
            //newPost is actually new
            if(mainListingStorage[0] != newPost && mainListingStorage[1] != newPost && mainListingStorage[2] != newPost && mainListingStorage[3] != newPost && newPost != null){

                let isNotification = false;
                let postNum = 1;
                let newPostExists = true;
                //get the price of the post
                let price;
                try {
                    price = await mainPage.evaluate(() => { return document.querySelector("div.x1xfsgkm > :nth-child(1) div > :nth-child(1) a span.x78zum5 span.x193iq5w").innerText });
                    if(price == 'FREE' || price == 'Free'){
                        price = 0;
                    }else{
                        const numbersOnly = price.match(/\d+/g);
                        price = parseInt(numbersOnly.join(''), 10);
                    }
                } catch (error) {
                    errorMessage('Error with getting price', error);
                }

                while(mainListingStorage[0] != newPost && mainListingStorage[1] != newPost && mainListingStorage[2] != newPost && mainListingStorage[3] != newPost && postNum  <= 20 && newPostExists){

                    //check if "The price is right"
                    if(price <= workerData.maxPrice){
                        console.log("New Post: " + newPost + " post num: " + postNum);
                        isNotification = true;

                        let postObj;
                        if(workerData.messageType == 1){//auto message
                            await sendMessage(newPost);
    
                            //get post data
                            try{
                                postObj = await itemPage.evaluate(() => {
                                    return {
                                        img: (document.querySelector('.xcg96fm img').src).includes("video") ? document.querySelector('[aria-label="Thumbnail 1"] img').src : document.querySelector('.xcg96fm img').src,
                                        date: document.querySelector('[aria-label="Buy now"]') != null ? (document.querySelector('div.xyamay9 div.x6ikm8r > :nth-child(2)') != null ? document.querySelector('div.xyamay9 div.x6ikm8r > :nth-child(2)').innerText : " ") : document.querySelector('div.x1yztbdb span.x1cpjm7i.x1sibtaa').innerText,
                                        description: document.querySelector('div.xz9dl7a.x4uap5.xsag5q8.xkhd6sd.x126k92a span') != null ? document.querySelector('div.xz9dl7a.x4uap5.xsag5q8.xkhd6sd.x126k92a span').innerText : ' ',
                                        shipping: document.querySelector('[aria-label="Buy now"]') != null ? (document.querySelector('div.xyamay9 div.x6ikm8r') != null ? document.querySelector('div.xyamay9 div.x6ikm8r span').innerText : document.querySelector('div.xod5an3 div.x1gslohp span').innerText) : ' ',
                                        price: ((document.querySelector('div.xyamay9 div.x1xmf6yo').innerText).match(/\d+/g)).join('')
                                    };
                                });
    
                                await itemBrowser.close();
                                itemBrowser = null;
                            } catch(error){
                                await logPageContent(itemPage);
                                await itemBrowser.close();
                                itemBrowser = null;
                                errorMessage('Error with getting item data', error);
                            }
                        }else{
                            let itemPageFullLoad = false;
                            try{
                                itemPage = await mainBrowser.newPage();
                                await itemPage.setRequestInterception(true);
                                itemPage.on('request', async request => {
                                    const resource = request.resourceType();
                                    if(itemPageFullLoad){
                                        if(resource != 'document' && resource != 'script' && resource != 'other' && resource != 'media' && resource != 'fetch'){
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
    
                                //change http headers
                                itemPage.setExtraHTTPHeaders({
                                    'Referer': 'https://www.facebook.com/login',
                                    'Sec-Ch-Ua': 'Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114',
                                    'Sec-Ch-Ua-Full-Version-List': 'Not.A/Brand";v="8.0.0.0", "Chromium";v="114.0.5735.199", "Google Chrome";v="114.0.5735.199',
                                    'Sec-Ch-Ua-Platform': burnerPlatform
                                });
    
                                //change the viewport
                                itemPage.setViewport({ width: 1366, height: 768 });
    
                                await itemPage.goto(newPost, { waitUntil: 'networkidle0' });
                            }catch(error){
                                errorMessage('Error with product page initiation, no message', error);
                            }
    
                            //get post data
                            try{

                                //check for video
                                if(await itemPage.$('.xcg96fm img') == null){
                                    itemPageFullLoad = true;
                                    await itemPage.reload({ waitUntil: 'networkidle0' });
                                }

                                //set post data obj
                                postObj = await itemPage.evaluate(() => {

                                    return {
                                        img: (document.querySelector('.xcg96fm img').src).includes("video") ? document.querySelector('[aria-label="Thumbnail 1"] img').src : document.querySelector('.xcg96fm img').src,
                                        title: document.querySelector('div.xyamay9 h1').innerText,
                                        date: document.querySelector('[aria-label="Buy now"]') != null ? (document.querySelector('div.xyamay9 div.x6ikm8r > :nth-child(2)') != null ? document.querySelector('div.xyamay9 div.x6ikm8r > :nth-child(2)').innerText : " ") : document.querySelector('div.x1yztbdb span.x1cpjm7i.x1sibtaa').innerText,
                                        description: document.querySelector('div.xz9dl7a.x4uap5.xsag5q8.xkhd6sd.x126k92a span') != null ? document.querySelector('div.xz9dl7a.x4uap5.xsag5q8.xkhd6sd.x126k92a span').innerText : ' ',
                                        shipping: document.querySelector('[aria-label="Buy now"]') != null ? (document.querySelector('div.xyamay9 div.x6ikm8r') != null ? document.querySelector('div.xyamay9 div.x6ikm8r span').innerText : document.querySelector('div.xod5an3 div.x1gslohp span').innerText) : ' ',
                                        price: ((document.querySelector('div.xyamay9 div.x1xmf6yo').innerText).match(/\d+/g)).join('')
                                    };
                                });
    
                                await itemPage.close();
                                itemPage = null;
                            } catch(error){
                                await logPageContent(itemPage);
                                await itemPage.close();
                                itemPage = null;
                                errorMessage(`Error with getting item data at ${newPost}`, error);
                            }
                        }

                        try {
                            if(postObj.description != null){
                                if(postObj.description.length > 700){
                                    postObj.description = (postObj.description).substring(0, 700) + '...';
                                }
                            }
                        } catch (error) {
                            logChannel.send("Error managing description");
                        }
                        
                        //Handle Discord messaging
                        if(workerData.messageType != 2){//if its not manual messaging
                            try{
                                mainChannel.send({ content: postObj.price + " - " + postObj.title, embeds: [new EmbedBuilder()
                                    .setColor(0x0099FF)
                                    .setTitle(postObj.price + " - " + postObj.title)
                                    .setURL(newPost)
                                    .setAuthor({ name: workerData.name })
                                    .setDescription(postObj.description)
                                    .addFields({ name: postObj.date, value: postObj.shipping })
                                    .setImage(postObj.img)
                                    .setTimestamp(new Date())
                                ]});
                            }catch(error){
                                errorMessage('Error with item notification', error);
                            }
                        }else{
                            let notification;
                            try{
                                notification = await mainChannel.send({ content: postObj.price + " - " + postObj.title, embeds: [new EmbedBuilder()
                                    .setColor(0x0099FF)
                                    .setTitle(postObj.price + " - " + postObj.title)
                                    .setURL(newPost)
                                    .setAuthor({ name: workerData.name })
                                    .setDescription(postObj.description)
                                    .addFields({ name: postObj.date, value: postObj.shipping })
                                    .setImage(postObj.img)
                                    .setTimestamp(new Date())
                                ], components: [new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder()
                                        .setCustomId('message-' + newPost)
                                        .setLabel('Message')
                                        .setStyle(ButtonStyle.Primary),
                                    )
                                ]});
                            }catch(error){
                                errorMessage('Error with new item notification with message button', error);
                            }
    
                            try {
                                const filter = i => i.customId.split("-")[0] == 'message';
                                const collector = await notification.createMessageComponentCollector({ filter, time: 14400000 }); //4 hours, I think
                                collector.on('collect', async i => {
                                    i.reply("Sending...");
    
                                    sendMessage(i.customId.split("-")[1]);
        
                                    collector.stop();
                                });
                                collector.on('end', () => {
                                    notification.edit({ components: [] });
                                });
                            } catch (error) {
                                errorMessage('Error collecting new item notification button', error);
                            }
                        }
                    }else{
                        console.log("\n\nThe Price is Wrong, price: " + price + " max: " + workerData.maxPrice + "\n\n");
                        if(price == NaN){
                            logChannel.send("Price NaN: " + newPost);
                        }
                    }

                    //Update newPost
                    postNum++;
                    try {
                        //check if there is another listing that exists
                        if(await mainPage.$(`div.x1xfsgkm > :nth-child(1) div > :nth-child(${postNum}) a`) != null){
                            newPost = await mainPage.evaluate((num) => {
                                let link = document.querySelector(`div.x1xfsgkm > :nth-child(1) div > :nth-child(${num}) a`).href;
                                return link.substring(0, link.indexOf("?"));
                            }, postNum);

                            price = await mainPage.evaluate((num) => {return document.querySelector(`div.x1xfsgkm > :nth-child(1) div > :nth-child(${num}) a span.x78zum5 span.x193iq5w`).innerText}, postNum);
                            if(price == 'FREE' || price == 'Free'){
                                price = 0;
                            }else{
                                const numbersOnly = price.match(/\d+/g);
                                price = parseInt(numbersOnly.join(''), 10);
                            }
                        }else{
                            newPostExists = false;
                        }
                    } catch (error) {
                        errorMessage('Error re-setting new post', error);
                    }
                }

                //ping the user
                if(isNotification){
                    await mainChannel.send("New Notifications @everyone");
                }

                //set the main listing storage
                await setListingStorage();
            }
        }
        interval();
        isDormant = true;
    }, getRandomInterval());
} 