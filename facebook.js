const { workerData, parentPort } = require('worker_threads');
const puppeteer = require('puppeteer-extra');
const { createCursor } = require("ghost-cursor");
const stealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(stealthPlugin());
const fs = require('fs/promises');

//discord.js
const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
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
                await mainPage.close();
                await mainBrowser.close();
                mainBrowser = null;
            }
            startError = false;
    
            //restart the main page
            await start();
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

        //!Adjusted for testing
        logChannel = client.channels.cache.get('1228441458697179147');
        if(logChannel == null){
            logChannel = await client.channels.fetch('1228441458697179147');
        }
    } catch (error) {
        errorMessage('Error fetching channel', error);
    }

    //Start up
    await start();
});

// Add cleanup logic on uncaught exception
process.on('uncaughtException', async (err) => {
    try {
        await logChannel.send('Uncaught Exception in ' + workerData.name + ': ' + err);
    } catch (error) {
        await logChannel.send('Error handling exception: ' + workerData.Name);
    }
});

// Add cleanup logic on unhandled promise rejection
process.on('unhandledRejection', async (reason, promise) => {
    try {
        await logChannel.send('Unhandled Rejection in ' + workerData.name + ':' + reason);
    } catch (error) {
        await logChannel.send('Error handling rejection: ' + workerData.Name);
    }
});

//error message send function 
const errorMessage = (message, error) => {
    try {
        console.log(workerData.name + ': ' + message + ': ' + error);
        logChannel.send(workerData.name + ': ' + message + ': ' + error);//.stack
    } catch (error) {
        logChannel.send('error with error message??? Who tf knows...' + error)
    }
}

const endTask = async () => {
    try {
        await logChannel.send("Close Browsers");
        burnerCookies = await mainPage.cookies();
        if(mainBrowser != null){
            await mainPage.close();
            await mainBrowser.close();
            mainBrowser = null;
        }
        if(itemBrowser != null){
            await itemPage.close();
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
        const maxNumber = 720000; //13 mins
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

        //check for this weird shit
        if(await mainPage.$('[title="Allow all cookies"]') != null){
            await pause();
            await mainCursor.click('[title="Allow all cookies"]');
            try {
                await mainPage.waitForNavigation();
            } catch (error) {}
        }

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
            await setDistance();
            mainPageInitiate = false;
        }
    } catch (error) {
        startError = true;
        await logChannel.send('error with re-login: ' + error);
        parentPort.postMessage({action: 'rotateAccount', username: burnerUsername, cookies: null});
    }
}

const sendMessage = async (link) => {
    let messageCursor;

    //browser with static isp
    try {
        itemBrowser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', `--proxy-server=${workerData.messageProxy}`],
            timeout: 60000
        });
        let pages = await itemBrowser.pages();
        itemPage = pages[0];
        
        //close the notif popup
        const context = itemBrowser.defaultBrowserContext();
        context.overridePermissions("https://www.facebook.com", ["notifications"]);

        //create a cursor
        messageCursor = createCursor(itemPage);

        //change the viewport
        itemPage.setViewport({ width: 1366, height: 768 });

        //change http headers
        itemPage.setUserAgent(`Mozilla/5.0 (${platformConverter(burnerPlatform)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36`);
        itemPage.setExtraHTTPHeaders({
            'Sec-Ch-Ua': 'Not.A/Brand";v="8", "Chromium";v="121", "Google Chrome";v="121',
            'SEC-CH-UA-ARCH': '"x86"',
            'Sec-Ch-Ua-Full-Version': "121.0.6167.185",
            'SEC-CH-UA-MOBILE':	'?0',
            'Sec-Ch-Ua-Platform': `"${burnerPlatform}"`,
            'SEC-CH-UA-PLATFORM-VERSION': '15.0.0',
            'Referer': 'https://www.facebook.com/login'
        });

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
let isInitiation = true;
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
let startRetries = 0;

//changeable account stuff
let messageCookies = workerData.messageCookies;
let burnerCookies = workerData.burnerCookies;
let burnerUsername = workerData.burnerUsername;
let burnerPassword = workerData.burnerPassword;
let burnerProxy = workerData.burnerProxy;
let burnerPlatform = workerData.burnerPlatform;

const start = async () => {
    try{
        isDormant = false;
        mainPageInitiate = true;

        //initialize the static isp proxy page
        mainBrowser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', `--proxy-server=${burnerProxy}`],
            timeout: 60000
        });
        let pages = await mainBrowser.pages();
        mainPage = pages[0];

        // Listen for the 'targetdestroyed' event
        /*mainBrowser.on('targetdestroyed', async (target) => {
            if (target.type() === 'page') {
                await logChannel.send('Page closed: ' + workerData.name);
                //parentPort.postMessage({action: 'rotateAccount', username: burnerUsername, cookies: null});
            }
        });*/
        //?Maybe check for specifically the main page close?

        //close the notif popup
        const context = mainBrowser.defaultBrowserContext();
        context.overridePermissions("https://www.facebook.com", ["notifications"]);

        //create a cursor
        mainCursor = createCursor(mainPage);

        //change the viewport
        mainPage.setViewport({ width: 1366, height: 768 });

        //change http headers
        mainPage.setUserAgent(`Mozilla/5.0 (${platformConverter(burnerPlatform)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36`);
        mainPage.setExtraHTTPHeaders({
            'Sec-Ch-Ua': 'Not.A/Brand";v="8", "Chromium";v="121", "Google Chrome";v="121',
            'SEC-CH-UA-ARCH': '"x86"',
            'Sec-Ch-Ua-Full-Version': "121.0.6167.185",
            'SEC-CH-UA-MOBILE':	'?0',
            'Sec-Ch-Ua-Platform': `"${burnerPlatform}"`,
            'SEC-CH-UA-PLATFORM-VERSION': '15.0.0',
            'Referer': 'https://www.facebook.com/login'
        });

        //network shit
        mainPage.on('response', async response => {
            try {
                //detect redirection
                if ([300, 301, 302, 303, 307, 308].includes(response.status())) {
                    const redirectURL = await response.headers()['location'];
                    if(await redirectURL.split('?')[0] != (workerData.link).split('?')[0]){
                        mainPageInitiate = true;
                        console.log(`Redirected to: ${redirectURL}`);
                        logChannel.send(`${workerData.name} redirected to: ${redirectURL}`);
                        startError = true; 
        
                        if(redirectURL.includes('/checkpoint/')){
                            try {
                                //await mainPage.reload();
                                await mainPage.waitForSelector('[aria-label="Dismiss"]', {timeout: 30000});
                            } catch (error) {logChannel.send("Error waiting for dismiss: " + error)}
                            await logPageContent(mainPage);

                            if(await mainPage.$('[aria-label="Dismiss"]') != null){
                                await pause();
                                await mainCursor.click('[aria-label="Dismiss"]');
                                await logChannel.send("dismiss warming");
                                mainPageInitiate = false;
                            }else{
                                await logChannel.send('Account banned: ' + burnerUsername);
                                console.log('Account banned: ' + burnerUsername);
                        
                                //message the main script to delete the burner account
                                parentPort.postMessage({action: 'ban', username: burnerUsername});
                            }
                        }else if(redirectURL.includes('/login/?next')){
                            try{
                                await mainPage.waitForSelector('[name="email"]');
                            }catch(error){}
        
                            await login();
                        }else{
                            //message the main script to get a new accounts
                            logChannel.send("Rotate Account: " + burnerUsername);
                            if(mainBrowser != null){
                                await logPageContent(mainPage);
                            }
                            parentPort.postMessage({action: 'rotateAccount', username: burnerUsername, cookies: null});
                        }
                    }
                }
            }catch (error) {
                parentPort.postMessage({action: 'rotateAccount', username: burnerUsername, cookies: null});
                errorMessage("Error with handling network response", error);
                if(mainBrowser != null){
                    await logPageContent(mainPage);
                }
            }
        });

        await mainPage.setRequestInterception(true);
        mainPage.on('request', async request => {
            const resource = request.resourceType();
            if(mainPageInitiate){
                if(resource != 'document' && resource != 'script' && resource != 'xhr' && resource != 'stylesheet' && resource != 'other' && resource != 'fetch'){
                    request.abort();
                }else{
                    request.continue();
                }
            }else{
                if(resource != 'document' && resource != 'xhr' && resource != 'fetch' && resource != 'other'){
                    request.abort();
                }else{
                    request.continue();
                }
            }
        });
        
        //Set cookies in browser
        await mainPage.setCookie(...burnerCookies);

        //go to the search page
        try {
            await mainPage.goto(workerData.link, { waitUntil: 'load', timeout: 50000});//networkidle2
        } catch (error) {await logChannel.send("Timeout on going to link")}

        //update burnerCookies
        if(startError == false){
            burnerCookies = await mainPage.cookies();
    
            // Detect the current language
            const language = await mainPage.evaluate(() => document.documentElement.lang);
            if (language != 'en') {
                logChannel.send('Language Wrong: ' + language + " -> " + burnerUsername);
                startError = true;
                parentPort.postMessage({action: 'languageWrong', username: burnerUsername});
            }
        }

        //make sure the url is correct
        if(await mainPage.url().split('?')[0] != (workerData.link).split('?')[0] && startError == false){
            startError = true;
            await logChannel.send("startError = true: " + workerData.Name);
            if(await mainPage.$('[name="login"]') == null && !(mainPage.url()).includes('/login/?next')){
                await logChannel.send("Login required: " + mainPage.url() + " at account: " + burnerUsername);
                await mainPage.close();
                await mainBrowser.close();
                mainBrowser = null;
                parentPort.postMessage({action: 'rotateAccount', username: burnerUsername, cookies: burnerCookies});
            }
        }else{
            await setDistance();
        }
        isDormant = true;
    }catch(error){
        await logPageContent(mainPage);
        if(startRetries < 2){
            startRetries++;
            await logChannel.send("Start Retry " + startRetries + ": " + workerData.name)
            await mainPage.reload({ waitUntil: 'load', timeout: 50000});
            start();
        }else{
            errorMessage('error with start', error);
        }
    }
}

const setDistance = async () => {
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

            //finish rest of the start process
            await setListingStorage();
            if(isInitiation){
                accountRotation();
                interval(); 
                isInitiation = false;
            }
            startRetries = 0;
            mainPageInitiate = false;
        } catch (error) {
            await logPageContent(mainPage);
            if(startRetries < 2){
                startRetries++;
                await logChannel.send("Distance Set Retry " + startRetries + ": " + workerData.name)
                await mainPage.reload({ waitUntil: 'load', timeout: 50000});
                if(mainBrowser != null){
                    if(mainPage != null){
                        await mainPage.close();
                    }
                    await mainBrowser.close();
                }
                start();
            }else{
                errorMessage('Error with setting distance', error);
                
                //finish rest of the start process
                await setListingStorage();
                if(isInitiation){
                    accountRotation();
                    interval(); 
                    isInitiation = false;
                }
                startRetries = 0;
                mainPageInitiate = false;
            }
        }
    }
}

const setListingStorage = async () => {
    // Set listingStorage, run once in the begging of the day
    try{
        if(startError == false){
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
        }
    }catch (error){
        errorMessage('Error with setting listing storage', error);
    }
}

//the meat and cheese
function interval() {
    let reloadBlock = false;
    let newPost;
    let postArr = []; //**For SS MAX Testing */
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
                await mainPage.goto((workerData.link).replace(/maxPrice=([^&]+)/, `maxPrice=${value}`));//, {waitUntil: 'networkidle2', timeout: 60000}
                try {
                    await mainPage.waitForSelector(".x3ct3a4 a");
                } catch (error) {await logChannel.send("Error waiting for listing selector")}
                console.log(mainPage.url());
        
                //if the listings dont exist on the page, refresh
                if(await mainPage.$('.xbbxn1n .xqui205 [aria-label="Reload Page"]') != null){
                    reloadBlock = true;
                    burnerCookies = await mainPage.cookies();
                    parentPort.postMessage({action: 'rotateAccount', username: burnerUsername, cookies: burnerCookies});
                    logChannel.send("Reload block: " + workerData.name);
                }else if(await mainPage.$(".x1lliihq .x3ct3a4 a") == null && await mainPage.$('[aria-label="Browse Marketplace"]') == null && await mainPage.$('div.xx6bls6') == null){
                    await mainPage.reload({waitUntil: 'domcontentloaded'});
                    await logPageContent(mainPage);
                    logChannel.send('Refresh for null .href error');
                }

                //check to make sure distance is correct
                //!This still won't work :(
                /*let actualDistance = await mainPage.evaluate(() => {return document.querySelector('.x1xmf6yo > div.x78zum5 > div > span').innerText});
                if(!actualDistance.includes(" " + workerData.distance + " ")){
                    await logChannel.send("Distance is WRONG at: " + workerData.name + " Actual value: " + actualDistance + " Expected value: " + workerData.distance);
                }*/
            } catch(error) {
                if(error.message.includes('TargetCloseError')){
                    logChannel.send("Page Closed");
                    if(mainBrowser != null){
                        await mainPage.close();
                        await mainBrowser.close();
                        mainBrowser = null;
                        await start();
                    }
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
        
            //make sure listing storage didn't get all fucked up
            if(mainListingStorage == null){
                await setListingStorage();
            }

            //newPost is actually new
            if(mainListingStorage[0] != newPost && mainListingStorage[1] != newPost && mainListingStorage[2] != newPost && mainListingStorage[3] != newPost && newPost != null){

                let isNotification = false;
                let postNum = 1;
                //get the price of the post
                let price;
                try {
                    price = await mainPage.evaluate(() => { return document.querySelector("div.x1xfsgkm > :nth-child(1) div > :nth-child(1) a span.x78zum5 span.x193iq5w").innerText });
                    if(price == 'FREE' || price == 'Free'){
                        price = 0;
                    }else{
                        const numbersOnly = price.match(/\d+/g);
                        if(numbersOnly == null){
                            await logChannel.send(price);
                        }else{
                            price = parseInt(numbersOnly.join(''), 10);
                        }
                    }
                } catch (error) {
                    errorMessage('Error with getting price', error);
                }

                while(mainListingStorage[0] != newPost && mainListingStorage[1] != newPost && mainListingStorage[2] != newPost && mainListingStorage[3] != newPost && postNum  <= 20 && newPost != null){

                    //check if "The price is right"
                    if(price <= workerData.maxPrice){
                        console.log("New Post: " + newPost + " post num: " + postNum);
                        isNotification = true;

                        let postObj;
                        let itemPageFullLoad = false;
                        try{
                            itemPage = await mainBrowser.newPage();
                            await itemPage.setRequestInterception(true);
                            itemPage.on('request', async request => {
                                const resource = request.resourceType();
                                if(itemPageFullLoad){
                                    request.continue();
                                }else{
                                    if(resource != 'document'){
                                        request.abort();
                                    }else{
                                        request.continue();
                                    }
                                }
                            });

                            //create a cursor
                            messageCursor = createCursor(itemPage);

                            //change the viewport
                            itemPage.setViewport({ width: 1366, height: 768 });

                            //change http headers
                            itemPage.setUserAgent(`Mozilla/5.0 (${platformConverter(burnerPlatform)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36`);
                            itemPage.setExtraHTTPHeaders({
                                'Sec-Ch-Ua': 'Not.A/Brand";v="8", "Chromium";v="121", "Google Chrome";v="121',
                                'SEC-CH-UA-ARCH': '"x86"',
                                'Sec-Ch-Ua-Full-Version': "121.0.6167.185",
                                'SEC-CH-UA-MOBILE':	'?0',
                                'Sec-Ch-Ua-Platform': `"${burnerPlatform}"`,
                                'SEC-CH-UA-PLATFORM-VERSION': '15.0.0',
                                'Referer': workerData.link
                            });

                            await itemPage.goto(newPost, { waitUntil: 'domcontentloaded', timeout: 60000});
                        }catch(error){
                            errorMessage('Error with product page initiation, no message', error);
                        }

                        //get post data
                        try{
                            //check for video
                            if(await itemPage.$('.xcg96fm img') == null){
                                itemPageFullLoad = true;
                                await itemPage.reload();
                                try {
                                    await itemPage.waitForSelector('.xcg96fm img');
                                } catch (error) {await logChannel.send("Error waiting for image selector")}
                            }

                            //set post data obj
                            postObj = await itemPage.evaluate(() => {

                                return {
                                    imgs: Array.from(document.querySelectorAll('[aria-label*="Thumbnail"] img'))?.map((img) => img?.src),
                                    title: document.querySelector('div.xyamay9 h1')?.innerText,
                                    date: document.querySelector('[aria-label="Buy now"]') != null ? document.querySelector('div.xyamay9 div.x6ikm8r > :nth-child(2)')?.innerText : (document.querySelector('div.x1yztbdb span.x1cpjm7i.x1sibtaa') != null ? document.querySelector('div.x1yztbdb span.x1cpjm7i.x1sibtaa')?.innerText : document.querySelector('div.x1xmf6yo > div > div:nth-child(2) span')?.innerText),
                                    description: document.querySelector('div.xz9dl7a.x4uap5.xsag5q8.xkhd6sd.x126k92a span')?.innerText,
                                    shipping: document.querySelector('[aria-label="Buy now"]') != null ? (document.querySelector('div.xyamay9 div.x6ikm8r') != null ? document.querySelector('div.xyamay9 div.x6ikm8r span')?.innerText : document.querySelector('div.xod5an3 div.x1gslohp span')?.innerText) : ' ',
                                    specifics: (document.querySelector("div.x1n2onr6 > div:nth-child(5) > div.x1gslohp")?.innerText).split('\n'),
                                    price: ((document.querySelector('div.xyamay9 div.x1xmf6yo')?.innerText)?.match(/\d+/g))?.join('')
                                };
                            });

                            await itemPage.close();
                            itemPage = null;
                        } catch(error){
                            if(itemPage != null){
                                await logPageContent(itemPage);
                                await itemPage.close();
                                itemPage = null;
                            }
                            errorMessage(`Error with getting item data at ${newPost}`, error);
                        }
                        
                        //check for listing deleted and collection error
                        if(postObj != null){
                            //manage description
                            if(postObj?.description != null){
                                if(postObj?.description?.length > 700){
                                    postObj.description = (postObj?.description)?.substring(0, 700) + '...';
                                }
                            }

                            //Handle Discord messaging
                            if(workerData.messageType != 2){//if its not manual messaging
                                try{
                                    mainChannel.send({ content: "$" + postObj?.price + " - " + postObj?.title, embeds: [new EmbedBuilder()
                                        .setColor(0x0099FF)
                                        .setTitle("$" + postObj?.price + " - " + postObj?.title)
                                        .setURL(newPost)
                                        .setAuthor({ name: workerData.name })
                                        .setDescription(postObj?.description)
                                        .addFields({ name: postObj?.date, value: postObj?.shipping })
                                        .setImage(postObj?.img)
                                        .setTimestamp(new Date())
                                    ]});
                                }catch(error){
                                    errorMessage('Error with item notification', error);
                                }
                            }else{
                                let notification;
                                try{
                                    notification = await mainChannel.send({ content: "$" + postObj?.price + " - " + postObj?.title, embeds: [new EmbedBuilder()
                                        .setColor(0x0099FF)
                                        .setTitle("$" + postObj?.price + " - " + postObj?.title)
                                        .setURL(newPost)
                                        .setAuthor({ name: workerData.name })
                                        .setDescription(postObj?.description)
                                        .addFields({ name: postObj?.date, value: postObj?.shipping })
                                        .setImage(postObj?.img)
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
                        }

                        //**For SS MAX Testing */
                        if(workerData.channel == "1111129387669127191"){
                            postObj.URL = newPost;
                            postArr.push(postObj);
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
                                if(numbersOnly == null){
                                    await logChannel.send(price);
                                }else{
                                    price = parseInt(numbersOnly.join(''), 10);
                                }
                            }
                        }else{
                            newPost = null;
                        }
                    } catch (error) {
                        errorMessage('Error re-setting new post', error);
                    }
                }

                //**For SS MAX Testing */
                if(workerData.channel == "1111129387669127191"){
                    parentPort.postMessage({action: 'newPosts', posts: postArr});
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