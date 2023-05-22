//require
const { workerData, parentPort } = require('worker_threads');
const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(stealthPlugin());

//discord.js
const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.login(process.env.DISCORD_BOT_TOKEN);

//Closes browsers before terminating the task with facebook-delete command
parentPort.on('message', async (message) => {
    if(message.action === 'closeBrowsers') {
        console.log('close browsers');
        if(mainBrowser != null){
            await mainBrowser.close();
        }
        if(itemBrowser != null){
            await itemBrowser.close();
        }

        parentPort.postMessage({action: 'terminate', messageCookies: messageCookies, burnerCookies: burnerCookies, username: workerData.burnerUsername, proxy: workerData.burnerStaticProxy});
    }else if(message.action === 'newProxies'){

        //set new proxies
        burnerStaticProxy = message.burnerProxy;
        if(workerData.messageType != 3){
            messageStaticProxy = message.messageProxy;
        }

        //restart burner account page
        await mainBrowser.close();
        if(itemBrowser != null){
            await itemBrowser.close();
        }
        await start();

        //message the main script back
        parentPort.postMessage({action: 'usernames', messageUsername: workerData.messageUsername, burnerUsername: workerData.burnerUsername});
    }
});

//checks cookies for expired
const cookieCheckpoint = (cookies) => {
    //If the worker data passes null, return null back
    if(cookies == null){
        return null;
    }

    //compare the datr cookie against the current date
    const datr = cookies.find(cookie => cookie.name === 'datr');
    if (new Date() <= new Date(datr.expires * 1000)) {
        return cookies;
    } else {
        console.log("EXPIRED COOKIES!!??!!?!?");
        return null;
    }
}

//error message send function
const errorMessage = (message, error) => {
    console.log(message + ': ' + error);
    client.channels.cache.get('1091532766522376243').send(message + ': ' + error);
    client.channels.cache.get(workerData.channel).send(message + ': ' + error);
}

//Queue stuff
const handleQueue = async () => {
    //run the command
    await sendMessage(messageQueue[0]);

    //delete the executed command from queue
    messageQueue.shift();
    console.log(messageQueue);
    //check the queue for more commands and run it back if necessary
    if(messageQueue.length > 0){
        await handleQueue();
    }
}

const sendMessage = async (link) => {

    //browser with static isp
    try {
        randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        itemBrowser = await puppeteer.launch({
            headless: true,
            defaultViewport: { width: 1366, height: 768 },
            args: ['--disable-notifications', '--no-sandbox', `--user-agent=${randomUserAgent}`, `--proxy-server=${messageStaticProxy}`]//http://134.202.250.62:50100
        });
        let pages = await itemBrowser.pages();
        itemPage = pages[0];

        //authenticate proxy
        //await itemPage.authenticate({ 'username':'falktravis', 'password': messageStaticProxy });

        //set cookies/login if the login was a success
        await itemPage.setCookie(...messageCookies);

        //network shit
        await itemPage.setRequestInterception(true);
        itemPage.on('request', async request => {
            const resource = request.resourceType();
            if(resource == 'image' || resource == 'media'){//resource != 'document' && resource != 'script' && resource != 'xhr' && resource != 'stylesheet'
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
        if(!itemPage.url().includes('unavailable_product')){
            if(await itemPage.$('div.x1daaz14 [aria-label="Send seller a message"]')){//regular, pickup listing
                console.log("local pickup only message sequence");
                if(workerData.message != null){
                    await itemPage.click('div.x1daaz14 [aria-label="Send seller a message"]');
                    await itemPage.keyboard.press('Backspace');
                    const messageTextArea = await itemPage.$('div.x1daaz14 [aria-label="Send seller a message"]');
                    await messageTextArea.type(workerData.message);
                }
                await itemPage.click('div.x1daaz14 div.x14vqqas div.xdt5ytf');
                await itemPage.waitForSelector('[aria-label="Message Again"]');
                await client.channels.cache.get(workerData.channel).send("Message Sent!");
            }else if(await itemPage.$('[aria-label="Message"]') && await itemPage.$('span.x1xlr1w8.x1a1m0xk') == null){//shipping listing
                console.log("shipping message sequence");
                await itemPage.click('[aria-label="Message"]');
                await itemPage.waitForSelector('[aria-label="Please type your message to the seller"]');
                if(workerData.message != null){
                    await itemPage.click('[aria-label="Please type your message to the seller"]');
                    const messageTextArea = await itemPage.$('[aria-label="Please type your message to the seller"]');
                    await messageTextArea.type(workerData.message);
                }
                await itemPage.click('[aria-label="Send Message"]');
                await itemPage.waitForSelector('[aria-label="Message Again"]');
                await client.channels.cache.get(workerData.channel).send("Message Sent!");
            }else if(await itemPage.$('span.x1xlr1w8.x1a1m0xk')){//check for a regular pending/sold listing
                let listingConditionText = await itemPage.evaluate(() => {return document.querySelector('span.x1xlr1w8.x1a1m0xk').innerText});
                await client.channels.cache.get(workerData.channel).send("Message Failed: item " + listingConditionText);
            }else if(await itemPage.$('span.xk50ysn.x1a1m0xk')){//Check for the weird out of stock thing //!I have no clue if this is actually a thing
                let listingConditionText = await itemPage.evaluate(() => {return document.querySelector('span.xk50ysn.x1a1m0xk').innerText});
                await client.channels.cache.get(workerData.channel).send("Message Failed: item " + listingConditionText);
            }else{
                await client.channels.cache.get(workerData.channel).send("Message Failed");
            }
        }else{
            await client.channels.cache.get(workerData.channel).send("Product Unavailable");
        }
    } catch (error){
        errorMessage('Error with messaging', error);
    }

    try {
        if(workerData.messageType != 1){//if its not auto messaging
            await itemBrowser.close();
        }
    } catch (error) {
        errorMessage('Error with closing itemBrowser', error);
    }
}

//collect burner account cookies
const collectBurnerCookies = async () => {
    let mainPageLogin = true;
    let mainPageBlockAll = false;
    let isProxyWorks = true; //Used to stop the task when proxy fails

    try{
        randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        mainBrowser = await puppeteer.launch({
            headless: true,
            defaultViewport: { width: 1366, height: 768 },
            args: ['--disable-notifications', '--no-sandbox', `--user-agent=${randomUserAgent}`]//, `--proxy-server=http://proxy.packetstream.io:31112`
        });
        let pages = await mainBrowser.pages();
        mainPage = pages[0];

        //authenticate proxy
        //await itemPage.authenticate({ 'username':'grumpypop1024', 'password': `1pp36Wc7ds9CgPSH_country-UnitedStates_session-${burnerLoginProxy}` });

        //track network consumption and block the bull shit
        await mainPage.setRequestInterception(true);
        mainPage.on('request', async request => {
            const resource = request.resourceType();
            const URL = request.url();

            if(mainPageLogin){
                if(resource != 'document' && resource != 'script' && resource != 'stylesheet' || URL.includes('v3i1vc4') || URL.includes('7kC7a9IZaJ9Kj8z5MOSDbM') || URL.includes('pYL1cbqpX10') || URL.includes('EuCjcb6YvQa') || URL.includes('wsDwCbh1mU6') || URL.includes('v3iqES4') || URL.includes('g4yGS_I143G') || URL.includes('LgvwffuKmeX') || URL.includes('L3XDbmH5_qQ') || URL.includes('kDWUdySDJjX') || URL.includes('rJ94RMpIhR7') || URL.includes('bKi--2Ukb_9') || URL.includes('jmY_tZbcjAk')){ // && !URL.includes('SuG-IUx2WwG')
                    request.abort();
                }else if(URL == 'https://www.facebook.com/?sk=welcome' || URL == 'https://www.facebook.com/'){
                    request.continue();
                    mainPageLogin = false;
                    mainPageBlockAll = true;
                }else {
                    request.continue();
                }
            }else if(mainPageBlockAll){
                request.abort();
            }else{
                if(resource != 'document'){
                    request.abort();
                }else{
                    request.continue();
                }
            }
        });
    }catch (error){
        errorMessage('Error with main page initiation for login', error);
    }

    //Catch proxy errors
    try{
        await mainPage.goto('https://www.facebook.com/login', { waitUntil: 'domcontentloaded' });
    }catch(error){
        console.log("Burner Resi proxy error");
        //message the main script we need a new proxy
        parentPort.postMessage({action: 'proxyFailure', username: workerData.burnerUsername, isBurner: true});
        //await the response with a promise
        burnerLoginProxy = await new Promise(resolve => {
            parentPort.on('message', message => {
              resolve(message);
            });
        });

        await mainBrowser.close();
        collectBurnerCookies();
    }

    //login   
    try{
        if(isProxyWorks){
            await mainPage.type('#email', workerData.burnerUsername);
            await mainPage.type('#pass', workerData.burnerPassword);
            await mainPage.click('button[name="login"]');
            await mainPage.waitForNavigation(); //necessary with headless mode
            console.log(mainPage.url());
            if(mainPage.url() != 'https://www.facebook.com/?sk=welcome' && mainPage.url() != 'https://www.facebook.com/' && !mainPage.url().includes('mobileprotection')){
                await client.channels.cache.get(workerData.channel).send(`Facebook Burner Login Invalid at ${workerData.name}, Ending Task...\nURL: ${mainPage.url()}\n@everyone`);
    
                //end the task
                await mainBrowser.close();
                parentPort.postMessage({action: 'loginFailure', isMessageLogin: false});
            }else{
                if(mainPage.url().includes('mobileprotection')){
                    await mainPage.click('label.uiLinkButton');
                    //await mainPage.waitForNavigation();//necessary with headless mode?
                    console.log("mobile protection");
                }
    
                //get the cookies for login on isp page
                burnerCookies = await mainPage.cookies();
                burnerCookies = burnerCookies.filter(cookie => cookie.name === 'xs' || cookie.name === 'datr' || cookie.name === 'sb' || cookie.name === 'c_user');
            }
            mainBrowser.close();
        }
    }catch (error){
        errorMessage('Error with logging in on main page - no cookie', error);
    }
}


//Collect message account cookies
const collectMessageCookies = async () => {
    let itemPageLogin = true;
    let itemPageBlockAll = false;
    let isProxyWorks = true; //Used to stop the task when proxy fails

    try {
        //Instantiate the page with packetstream proxies for login
        randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        itemBrowser = await puppeteer.launch({
            headless: true,
            defaultViewport: { width: 1366, height: 768 },
            args: ['--disable-notifications', '--no-sandbox', `--user-agent=${randomUserAgent}`]//, `--proxy-server=http://proxy.packetstream.io:31112`
        });
        let pages = await itemBrowser.pages();
        itemPage = pages[0];

        //authenticate proxy
        //await itemPage.authenticate({ 'username':'grumpypop1024', 'password': `1pp36Wc7ds9CgPSH_country-UnitedStates_session-${messageLoginProxy}` });
                
        //network shit
        await itemPage.setRequestInterception(true);
        itemPage.on('request', async request => {
            const resource = request.resourceType();
            const URL = request.url();
            if(itemPageLogin){
                if(resource != 'document' && resource != 'script' || URL.includes('v3i1vc4') || URL.includes('7kC7a9IZaJ9Kj8z5MOSDbM') || URL.includes('pYL1cbqpX10') || URL.includes('EuCjcb6YvQa') || URL.includes('wsDwCbh1mU6') || URL.includes('v3iqES4') || URL.includes('g4yGS_I143G') || URL.includes('LgvwffuKmeX') || URL.includes('L3XDbmH5_qQ') || URL.includes('kDWUdySDJjX') || URL.includes('rJ94RMpIhR7') || URL.includes('bKi--2Ukb_9') || URL.includes('jmY_tZbcjAk')){
                    request.abort();
                }else if(URL == 'https://www.facebook.com/?sk=welcome' || URL == 'https://www.facebook.com/'){
                    request.continue();
                    itemPageLogin = false;
                    itemPageBlockAll = true;
                }else {
                    request.continue();
                }
            }else if(itemPageBlockAll){
                request.abort();
            }else{
                if(resource != 'document' && resource != 'script'){
                    request.abort();
                }else{
                    request.continue();
                }
            }
        });
    } catch(error) {
        errorMessage('Error with item page instantiation for login', error);
    }      
        
    //Catch proxy errors
    try{
        await mainPage.goto('https://www.facebook.com/login', { waitUntil: 'domcontentloaded' });//I had networkidle0 b4
    }catch(error){
        console.log("Main Resi proxy error");
        //message the main script we need a new proxy
        parentPort.postMessage({action: 'proxyFailure', username: workerData.messageUsername, isBurner: false});
        //await the response with a promise
        messageLoginProxy = await new Promise(resolve => {
            parentPort.on('message', message => {
              resolve(message);
            });
        });

        await itemBrowser.close();
        collectMessageCookies();
    }

    //login
    try{
        if(isProxyWorks){
            await itemPage.type('#email', workerData.messageUsername);
            await itemPage.type('#pass', workerData.messagePassword);
            await itemPage.click('button[name="login"]');
            await itemPage.waitForNavigation(); //necessary with headless mode
            console.log(itemPage.url());
            if(itemPage.url() != 'https://www.facebook.com/?sk=welcome' && itemPage.url() != 'https://www.facebook.com/' && !mainPage.url().includes('mobileprotection')){
                client.channels.cache.get(workerData.channel).send(`Facebook Message login Invalid at ${workerData.name}, Ending Task...\nURL: ${mainPage.url()}\n@everyone`);
    
                //end the task
                await mainBrowser.close();
                parentPort.postMessage({action: 'loginFailure', isMessageLogin: true});
            }else{
                if(itemPage.url().includes('mobileprotection')){
                    await mainPage.click('label.uiLinkButton');
                    //await mainPage.waitForNavigation();//necessary with headless mode?
                    console.log("mobile protection");
                }
    
                //Set cookies
                messageCookies = await itemPage.cookies();
                messageCookies = messageCookies.filter(cookie => cookie.name === 'xs' || cookie.name === 'datr' || cookie.name === 'sb' || cookie.name === 'c_user');
                console.log(messageCookies);
            }
            await itemBrowser.close();
        }
    } catch (error){
        errorMessage('Error with message login', error);
    }
}

//general instantiation
const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.89 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36",
];
let randomUserAgent;
let isCreate = true;
let newPost;
let mainBrowser;
let mainPage;
let itemPage;
let itemBrowser;
let mainListingStorage;
let burnerCookies = cookieCheckpoint(workerData.burnerCookies);
let messageCookies = cookieCheckpoint(workerData.messageCookies);
let messageLoginProxy = workerData.messageLoginProxy;
let burnerLoginProxy = workerData.burnerLoginProxy;
let burnerStaticProxy = workerData.burnerStaticProxy;
let messageStaticProxy = workerData.messageStaticProxy;
let messageQueue = [];
let networkData = 0;
let mainPageInitiate = true;

const start = async () => {

    try{
        //initialize the static isp proxy page
        mainBrowser = await puppeteer.launch({
            headless: true,
            defaultViewport: { width: 1366, height: 768 },
            args: ['--disable-notifications', '--no-sandbox', `--user-agent=${randomUserAgent}`, `--proxy-server=${burnerStaticProxy}`]//http://134.202.250.62:50100
        });
        let pages = await mainBrowser.pages();
        mainPage = pages[0];

        //authenticate proxy
        //await mainPage.authenticate({ 'username':'falktravis', 'password': burnerStaticProxy });

        //network shit
        await mainPage.setRequestInterception(true);
        mainPage.on('response', async request => {
            const headers = request.headers();
            const contentLength = headers['content-length'];
            if(contentLength != undefined){
                networkData += parseInt(contentLength);
            }
        });

        mainPage.on('request', async request => {
            const resource = request.resourceType();

            if(mainPageInitiate){
                if(resource != 'document' && resource != 'script' && resource != 'xhr' && resource != 'stylesheet'){
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
        
        //Set cookies in browser
        await mainPage.setCookie(...burnerCookies);

        //go to the search page
        await mainPage.goto(workerData.link, { waitUntil: 'domcontentloaded' });
        
        //update burnerCookies
        burnerCookies = await mainPage.cookies();
        burnerCookies = burnerCookies.filter(cookie => cookie.name === 'xs' || cookie.name === 'datr' || cookie.name === 'sb' || cookie.name === 'c_user');
    }catch(error){
        errorMessage('Error with static main page initiation', error);
    }

    //set distance
    if(workerData.distance != null && isCreate == true){
        try {
            if(await mainPage.$('div.x1y1aw1k.xl56j7k div.x1iyjqo2') == null){
                await mainPage.waitForSelector('div.x1y1aw1k.xl56j7k div.x1iyjqo2');
            }
            await mainPage.click('div.x1y1aw1k.xl56j7k div.x1iyjqo2');
            await mainPage.waitForSelector('div.x9f619.x14vqqas.xh8yej3');
            await mainPage.click('div.x9f619.x14vqqas.xh8yej3');
            await mainPage.click(`[role="listbox"] div.x4k7w5x > :nth-child(${workerData.distance})`);
            await mainPage.click('[aria-label="Apply"]');
            //wait for the results to update, we aren't concerned about time
            await new Promise(r => setTimeout(r, 3000));
        } catch (error) {
            errorMessage('Error with setting distance', error);
        }
    }

    mainPageInitiate = false;
    console.log("Data: " + networkData);
}

const setListingStorage = async () => {
    // Set listingStorage, run once in the begging of the day
    try{
        mainListingStorage = await mainPage.evaluate(() => {
            let searchResults = document.querySelector('div.xx6bls6');
            if(searchResults == null){
                let links = [document.querySelector(".x3ct3a4 a"), document.querySelector("div.x139jcc6.x1nhvcw1 > :nth-child(2) a")];
                return links.map((link) => {
                    if(link != null){
                        let href = link.href;
                        return href.substring(0, href.indexOf("?"));
                    }else{
                        return null;
                    }
                })
            }else{
                return [null, null];
            }
        });
        console.log("Main Storage: " + mainListingStorage);
    }catch (error){
        errorMessage('Error with setting listings', error);
    }
}

//time stuff
let isRunning;
let currentTime = new Date();
currentTime = (currentTime.getHours() * 60) + currentTime.getMinutes();

//Determine if the script should be running originally
if(workerData.start < workerData.end){
    if(currentTime > workerData.start && currentTime < workerData.end){
        isRunning = true;
    }else{
        isRunning = false;
    }
}else{
    if(currentTime > workerData.start || currentTime < workerData.end){
        isRunning = true;
    }else{
        isRunning = false;
    }
}

//sets an interval to turn on/off interval
const handleTime = async (intervalFunction) => {
    currentTime = new Date();
    currentTime = (currentTime.getHours() * 60) + currentTime.getMinutes();
    let interval;
    if(workerData.start < workerData.end){
        if(isRunning){
            interval = workerData.end - currentTime;
        }else{
            if(currentTime >= workerData.end){
                interval = (1440 - currentTime) + workerData.start;
            }else{
                interval = workerData.start - currentTime;
            }
        }
    }else{
        if(isRunning){
            if(currentTime >= workerData.start){
                interval = (1440 - currentTime) + workerData.end;
            }else{
                interval = workerData.end - currentTime;
            }
        }else{
            interval = workerData.start - currentTime;
        }
    }
    
    if(isRunning){
        //collect cookies if its the first time running
        if(isCreate == true){
            if(burnerCookies == null){
                await collectBurnerCookies();
            }

            if(messageCookies == null && workerData.messageType != 3){
                await collectMessageCookies();
            }
                            
            //close messageLoginListener if it was necessary
            if((workerData.burnerCookies == null && burnerCookies != null) || (workerData.messageCookies == null && workerData.messageType != 3 && messageCookies != null)){
                parentPort.postMessage({action: 'facebookSuccess'});
            }
        }

        await start();

        //set the listing storage, only on the initial creation
        if(isCreate == true){
            await setListingStorage();
            isCreate = false;
        }

        intervalFunction(); 
    }else if(isCreate == false){
        await mainPage.close();
        await mainBrowser.close();
        mainBrowser = null;
        console.log("page close");
    }

    setTimeout(() => {
        isRunning = !isRunning;
        console.log(isRunning);
        handleTime(intervalFunction);
    }, interval * 60000)
}
handleTime(interval);

//the meat and cheese
function interval() {
    setTimeout(async () => {
        if(isRunning){
            await mainPage.reload({ waitUntil: 'domcontentloaded' });
            try {
                newPost = await mainPage.evaluate(() => {
                    if(document.querySelector('div.xx6bls6') == null){
                        let link = document.querySelector(".x3ct3a4 a").href;
                        return link.substring(0, link.indexOf("?"));
                    }else{
                        return null;
                    }
                });
                console.log("Main listing storage: " + mainListingStorage);
                console.log("Data: " + networkData);
            } catch(error) {
                errorMessage('Error with main page conversion', error);
            }
        
            //newPost is actually new
            if(mainListingStorage[0] != newPost && mainListingStorage[1] != newPost && newPost != null){
        
                let postNum = 1;
                while(mainListingStorage[0] != newPost && mainListingStorage[1] != newPost && postNum  <= 10){
                    console.log("New Post: " + newPost + " post num: " + postNum);

                    let postObj;
                    if(workerData.messageType == 1){//auto message
                        await sendMessage(newPost);

                        //get post data
                        try{
                            postObj = await itemPage.evaluate(() => {
                                let dom = document.querySelector('div.x9f619');
                                return {
                                    img: dom.querySelector('span.x78zum5 img').src,
                                    title: dom.querySelector('div.xyamay9 h1').innerText,
                                    date: dom.querySelector('[aria-label="Buy now"]') != null ? (dom.querySelector('div.xyamay9 div.x6ikm8r > :nth-child(2)') != null ? dom.querySelector('div.xyamay9 div.x6ikm8r > :nth-child(2)').innerText : " ") : dom.querySelector('div.x1yztbdb span.x676frb.x1sibtaa').innerText,
                                    description: dom.querySelector('div.xz9dl7a.x4uap5.xsag5q8.xkhd6sd.x126k92a span') != null ? dom.querySelector('div.xz9dl7a.x4uap5.xsag5q8.xkhd6sd.x126k92a span').innerText : ' ',
                                    shipping: dom.querySelector('[aria-label="Buy now"]') != null ? (dom.querySelector('div.xyamay9 div.x6ikm8r') != null ? dom.querySelector('div.xyamay9 div.x6ikm8r span').innerText : dom.querySelector('div.xod5an3 div.x1gslohp span').innerText) : ' ',
                                    price: dom.querySelector('div.xyamay9 div.x1xmf6yo').innerText.charAt(0) + dom.querySelector('div.xyamay9 div.x1xmf6yo').innerText.split(dom.querySelector('div.xyamay9 div.x1xmf6yo').innerText.charAt(0))[1]
                                };
                            });

                            await itemBrowser.close();
                            itemBrowser = null;
                        } catch(error){
                            errorMessage('Error with getting item data', error);
                        }
                    }else{
                        //initiate the new page for collecting data
                        try{
                            itemPage = await mainBrowser.newPage();
                            await itemPage.setRequestInterception(true);
                            itemPage.on('request', async request => {
                                const resource = request.resourceType();
                                if(resource != 'document'){
                                    request.abort();
                                }else{
                                    request.continue();
                                }
                            });
                            await itemPage.goto(newPost, { waitUntil: 'networkidle0' });
                        }catch(error){
                            errorMessage('Error with product page initiation, no message', error);
                        }

                        //get post data
                        try{
                            postObj = await itemPage.evaluate(() => {
                                return {
                                    img: document.querySelector('img').src,
                                    title: document.querySelector('div.xyamay9 h1').innerText,
                                    date: document.querySelector('[aria-label="Buy now"]') != null ? (document.querySelector('div.xyamay9 div.x6ikm8r > :nth-child(2)') != null ? document.querySelector('div.xyamay9 div.x6ikm8r > :nth-child(2)').innerText : " ") : document.querySelector('div.x1xmf6yo div.x1yztbdb').innerText,
                                    description: document.querySelector('div.xz9dl7a.x4uap5.xsag5q8.xkhd6sd.x126k92a span') != null ? document.querySelector('div.xz9dl7a.x4uap5.xsag5q8.xkhd6sd.x126k92a span').innerText : ' ',
                                    shipping: document.querySelector('[aria-label="Buy now"]') != null ? (document.querySelector('div.xyamay9 div.x6ikm8r') != null ? document.querySelector('div.xyamay9 div.x6ikm8r span').innerText : document.querySelector('div.xod5an3 div.x1gslohp span').innerText) : ' ',
                                    price: "$" + document.querySelector('div.xyamay9 div.x1xmf6yo').innerText.split("$")[1]
                                };
                            });

                            await itemPage.close();
                        } catch(error){
                            errorMessage('Error with getting item data', error);
                        }
                    }
                    
                    //Handle Discord messaging
                    if(workerData.messageType != 2){//if its not manual messaging
                        try{
                            await client.channels.cache.get(workerData.channel).send({ content: "New Facebook Post From " + workerData.name + " @everyone", embeds: [new EmbedBuilder()
                                .setColor(0x0099FF)
                                .setTitle(postObj.title + " - " + postObj.price)
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
                            notification = await client.channels.cache.get(workerData.channel).send({ content: "New Facebook Post From " + workerData.name + " @everyone", embeds: [new EmbedBuilder()
                                .setColor(0x0099FF)
                                .setTitle(postObj.title + " - " + postObj.price)
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
    
                                //push message into the queue
                                messageQueue.push(i.customId.split("-")[1]);
                                //run the queue handler if it is not already going
                                if(messageQueue.length == 1){
                                    await handleQueue();
                                    console.log('message finish');
                                }
    
                                collector.stop();
                            });
                            collector.on('end', () => {
                                notification.edit({ components: [] });
                            });
                        } catch (error) {
                            errorMessage('Error collecting new item notification button', error);
                        }
                    }

                    //Update newPost
                    postNum++;
                    try {
                        newPost = await mainPage.evaluate((num) => {
                            let link = document.querySelector(`div.x139jcc6.x1nhvcw1 > :nth-child(${num}) a`).href;
                            return link.substring(0, link.indexOf("?"));
                        }, postNum);
                        console.log(newPost);
                    } catch (error) {
                        errorMessage('Error re-setting new post', error);
                    }
                }

                //Check for a post hard cap
                if(postNum > 10){
                    client.channels.cache.get(workerData.channel).send("Too many new posts to notify, I honestly have no idea how you did this it should be impossible, make your query more specific");
                }

                //set the main listing storage
                try {
                    mainListingStorage = await mainPage.evaluate(() => {
                        if(document.querySelector('div.xx6bls6') == null){
                            let links = [document.querySelector(".x3ct3a4 a"), document.querySelector("div.x139jcc6.x1nhvcw1 > :nth-child(2)").querySelector('a')];
                            return links.map((link) => {
                                if(link != null){
                                    let href = link.href;
                                    return href.substring(0, href.indexOf("?"));
                                }else{
                                    return null;
                                }
                            })
                        }else{
                            return [null, null];
                        }
                    });
                } catch(error) {
                    errorMessage('Error with re-setting mainListingStorage', error);
                }
            }
            interval();
        }
    }, Math.floor((Math.random() * (2) + 3) * 60000)); 
} 