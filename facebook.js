/**
 * I need to find why my personal account gets proper results for every distance but the burners don't
 *   -Test my personal account with the software browser
 *   -Maybe the burners just need to be more realistic? Try buying higher quality accounts
 *   -Try waming a burner aggressivly
 */
//require
const { workerData, parentPort } = require('worker_threads');
const puppeteer = require('puppeteer-extra');
const { createCursor } = require("ghost-cursor");
const stealthPlugin = require('puppeteer-extra-plugin-stealth');
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

        parentPort.postMessage({action: 'terminate', messageCookies: messageCookies, burnerCookies: burnerCookies, username: workerData.burnerUsername, proxy: workerData.burnerProxy});
    }else if(message.action === 'newProxies'){

        //set new proxies
        burnerProxy = message.burnerProxy;
        if(workerData.messageType != 3){
            messageProxy = message.messageProxy;
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

//error message send function
const errorMessage = (message, error) => {
    console.log(message + ': ' + error);
    client.channels.cache.get('1091532766522376243').send(message + ': ' + error);
    client.channels.cache.get(workerData.channel).send(message + ': ' + error);
}

//randomize time till post check
const getRandomInterval = () => {
    const minNumber = 720000;
    const maxNumber = 1500000;
    const power = 1.5;
    const random = Math.random();
    const range = maxNumber - minNumber;
    const number = minNumber + Math.pow(random, power) * range;
    return Math.round(number);
}

//pause for 0.5s-2s to humanize behavior
const pause = async () => {
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * (1200 - 500 + 1)) + 500));
}

//convert platform string for a user agent
const platformConverter = (platform) => {
    if(platform === 'Windows'){
        return 'Windows NT 10.0; Win64; x64';
    }else if(platform === 'Linux'){
        return 'X11; Linux x86_64';
    }else if(platform === 'Macintosh'){
        return 'Macintosh; Intel Mac OS X 10_15_7';
    }
}

//!Queue stuff
/*const handleQueue = async () => {
    //run the command
    await sendMessage(messageQueue[0]);

    //delete the executed command from queue
    messageQueue.shift();
    console.log(messageQueue);
    //check the queue for more commands and run it back if necessary
    if(messageQueue.length > 0){
        await handleQueue();
    }
}*/

const sendMessage = async (link) => {
    let cursor;

    //browser with static isp
    try {
        itemBrowser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', `--user-agent=Mozilla/5.0 (${platformConverter(workerData.messagePlatform)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36`, `--proxy-server=${messageProxy}`]
        });
        let pages = await itemBrowser.pages();
        itemPage = pages[0];

        //create a cursor
        cursor = createCursor(itemPage);

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
                    await pause();
                    await cursor.click('div.x1daaz14 [aria-label="Send seller a message"]');
                    await itemPage.keyboard.press('Backspace');
                    const messageTextArea = await itemPage.$('div.x1daaz14 [aria-label="Send seller a message"]');
                    await messageTextArea.type(workerData.message);
                }
                await pause();
                await cursor.click('div.x1daaz14 div.x14vqqas div.xdt5ytf');
                await itemPage.waitForSelector('[aria-label="Message Again"]');
                await client.channels.cache.get(workerData.channel).send("Message Sent!");
            }else if(await itemPage.$('[aria-label="Message"]') && await itemPage.$('span.x1xlr1w8.x1a1m0xk') == null){//shipping listing
                console.log("shipping message sequence");
                await pause();
                await cursor.click('[aria-label="Message"]');
                await itemPage.waitForSelector('[aria-label="Please type your message to the seller"]');
                if(workerData.message != null){
                    await pause();
                    await cursor.click('[aria-label="Please type your message to the seller"]');
                    const messageTextArea = await itemPage.$('[aria-label="Please type your message to the seller"]');
                    await messageTextArea.type(workerData.message);
                }
                await pause();
                await cursor.click('[aria-label="Send Message"]');
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

let isCreate = true;
let newPost;
let mainBrowser;
let mainPage;
let itemPage;
let itemBrowser;
let mainListingStorage;
let burnerCookies = workerData.burnerCookies;
let messageCookies = workerData.messageCookies;
let burnerProxy = workerData.burnerProxy;
let messageProxy = workerData.messageProxy;
//!let messageQueue = [];
let networkData = 0;
let mainPageInitiate = true;

const start = async () => {
    let cursor;

    try{
        //initialize the static isp proxy page
        mainBrowser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', `--user-agent=Mozilla/5.0 (${platformConverter(workerData.burnerPlatform)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36`, `--proxy-server=${burnerProxy}`]
        });
        let pages = await mainBrowser.pages();
        mainPage = pages[0];

        //create a cursor
        cursor = createCursor(mainPage);

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

        //change the viewport
        mainPage.setViewport({ width: 1366, height: 768 });

        //change http headers
        mainPage.setExtraHTTPHeaders({
            'Referer': 'https://www.facebook.com/login',
            'Sec-Ch-Ua': 'Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114',
            'Sec-Ch-Ua-Full-Version-List': 'Not.A/Brand";v="8.0.0.0", "Chromium";v="114.0.5735.199", "Google Chrome";v="114.0.5735.199',
            'Sec-Ch-Ua-Platform': workerData.burnerPlatform
        });
        
        //Set cookies in browser
        await mainPage.setCookie(...burnerCookies);

        //go to the search page
        await mainPage.goto(workerData.link, { waitUntil: 'networkidle0' });
        
        //update burnerCookies
        burnerCookies = await mainPage.cookies();
        burnerCookies = burnerCookies.filter(cookie => cookie.name === 'xs' || cookie.name === 'datr' || cookie.name === 'sb' || cookie.name === 'c_user');

        //make sure the url is correct
        if(mainPage.url().split('?')[0] != workerData.link.split('?')[0]){
            console.log(workerData.link);
            console.log(mainPage.url());
        }
    }catch(error){
        errorMessage('Error with static main page initiation', error);
    }
    
    //set distance
    if(workerData.distance != null && isCreate == true){
        try {
            if(await mainPage.$('div.x1y1aw1k.xl56j7k div.x1iyjqo2') == null){
                await mainPage.waitForSelector('div.x1y1aw1k.xl56j7k div.x1iyjqo2');
            }
            await pause();
            await cursor.click('div.x1y1aw1k.xl56j7k div.x1iyjqo2');
            await mainPage.waitForSelector('div.x9f619.x14vqqas.xh8yej3');
            await pause();
            await cursor.click('div.x9f619.x14vqqas.xh8yej3');
            await pause();
            await cursor.click(`[role="listbox"] div.x4k7w5x > :nth-child(${workerData.distance})`);
            await pause();
            await cursor.click('[aria-label="Apply"]');
            //wait for the results to update, we aren't concerned about time
            await new Promise(r => setTimeout(r, 6000));
            await mainPage.reload({ waitUntil: 'networkidle0' });
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
                let links = [document.querySelector(".x3ct3a4 a"), document.querySelector("div.x139jcc6.x1nhvcw1 > :nth-child(2) a"), document.querySelector("div.x139jcc6.x1nhvcw1 > :nth-child(3) a"), document.querySelector("div.x139jcc6.x1nhvcw1 > :nth-child(4) a")];
                return links.map((link) => {
                    if(link != null){
                        let href = link.href;
                        return href.substring(0, href.indexOf("?"));
                    }else{
                        return null;
                    }
                })
            }else{
                return [null, null, null, null];
            }
        });
        console.log("Main Storage: " + mainListingStorage);
    }catch (error){
        errorMessage('Error with setting listing storage', error);
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
            try {
                await mainPage.reload({ waitUntil: 'domcontentloaded' });
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
            if(mainListingStorage[0] != newPost && mainListingStorage[1] != newPost && mainListingStorage[2] != newPost && mainListingStorage[3] != newPost && newPost != null){
        
                let postNum = 1;
                while(mainListingStorage[0] != newPost && mainListingStorage[1] != newPost && mainListingStorage[2] != newPost && mainListingStorage[3] != newPost && postNum  <= 10){
                    console.log("New Post: " + newPost + " post num: " + postNum);

                    let postObj;
                    if(workerData.messageType == 1){//auto message
                        await sendMessage(newPost);

                        //get post data
                        try{
                            postObj = await itemPage.evaluate(() => {
                                return {
                                    img: document.querySelector('img').src,
                                    title: document.querySelector('div.xyamay9 h1').innerText,
                                    date: document.querySelector('[aria-label="Buy now"]') != null ? (document.querySelector('div.xyamay9 div.x6ikm8r > :nth-child(2)') != null ? document.querySelector('div.xyamay9 div.x6ikm8r > :nth-child(2)').innerText : " ") : document.querySelector('div.x1yztbdb span.x1cpjm7i.x1sibtaa').innerText,
                                    description: document.querySelector('div.xz9dl7a.x4uap5.xsag5q8.xkhd6sd.x126k92a span') != null ? document.querySelector('div.xz9dl7a.x4uap5.xsag5q8.xkhd6sd.x126k92a span').innerText : ' ',
                                    shipping: document.querySelector('[aria-label="Buy now"]') != null ? (document.querySelector('div.xyamay9 div.x6ikm8r') != null ? document.querySelector('div.xyamay9 div.x6ikm8r span').innerText : document.querySelector('div.xod5an3 div.x1gslohp span').innerText) : ' ',
                                    price: document.querySelector('div.xyamay9 div.x1xmf6yo').innerText.charAt(0) + document.querySelector('div.xyamay9 div.x1xmf6yo').innerText.split(document.querySelector('div.xyamay9 div.x1xmf6yo').innerText.charAt(0))[1]
                                };
                            });

                            await itemBrowser.close();
                            itemBrowser = null;
                        } catch(error){
                            errorMessage('Error with getting item data', error);
                        }
                    }else{
                        //initiate the new page for collecting data
                        let itemPageFullLoad = false;
                        try{
                            itemPage = await mainBrowser.newPage();
                            await itemPage.setRequestInterception(true);
                            itemPage.on('request', async request => {
                                const resource = request.resourceType();
                                if(itemPageFullLoad){
                                    if(resource != 'document' && resource != 'script' && resource != 'xhr'){
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
                            await itemPage.goto(newPost, { waitUntil: 'networkidle0' });
                        }catch(error){
                            errorMessage('Error with product page initiation, no message', error);
                        }

                        //get post data
                        try{
                            //check for video
                            let isVideo = false;
                            if(await itemPage.$('div.x1a0syf3.x1ja2u2z i') != null){
                                console.log('video sequence: ' + newPost);
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

                            await itemPage.close();
                        } catch(error){
                            errorMessage(`Error with getting item data at ${newPost}`, error);
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
    
                                //!push message into the queue
                                /*messageQueue.push(i.customId.split("-")[1]);
                                //run the queue handler if it is not already going
                                if(messageQueue.length == 1){
                                    await handleQueue();
                                    console.log('message finish');
                                }*/

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
                await setListingStorage();
            }
            interval();
        }
    }, getRandomInterval()); 
} 