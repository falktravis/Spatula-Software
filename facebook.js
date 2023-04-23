//require
const { workerData, parentPort } = require('worker_threads');
const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(stealthPlugin());

//discord.js
const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.login(process.env.DISCORD_BOT_TOKEN);

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
let itemBrowser;
let mainPage;
let itemPage;
let mainListingStorage;
let burnerCookies = workerData.burnerCookies;
let messageCookies = workerData.messageCookies;

//error message send function
const errorMessage = (message) => {
    console.log(message + ': ' + error);
    client.channels.cache.get('1091532766522376243').send(message + ': ' + error);
    client.channels.cache.get(workerData.channel).send(message + ': ' + error);
}

(async () => {

    //Closes browsers before terminating the task with facebook-delete command
    parentPort.on('message', async (message) => {
        if (message.action === 'closeBrowsers') {
            console.log('facebook message');
            if(mainBrowser != null){
                await mainBrowser.close();
            }
            if(itemBrowser != null){
                await itemBrowser.close();
            }

            parentPort.postMessage({action: 'terminate'});
        }
    });

    const start = async () => {

        // get cookies if there are none from the db
        if(burnerCookies == null){
            try{
                let mainPageLogin = true;
                let mainPageBlockAll = false;
                randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
                //!PacketStream for login
                mainBrowser = await puppeteer.launch({
                    headless: false,
                    defaultViewport: { width: 1366, height: 768 },
                    args: ['--disable-notifications', `--user-agent=${randomUserAgent}`]//, `--proxy-server=http://134.202.250.62:50100`
                });
                let pages = await mainBrowser.pages();
                mainPage = pages[0];
    
                //authenticate proxy
                //await mainPage.authenticate({ 'username':'falktravis', 'password': `z6TVGIahV4` });
    
                //accept compression
                await mainPage.setExtraHTTPHeaders({
                    'Accept-Encoding': 'gzip, deflate, br'
                });
    
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
                errorMessage('Error with main page initiation for login');
            }
    
            //If there is no cookie, login to generate one
            try{
                //login   
                await mainPage.goto('https://www.facebook.com/login', { waitUntil: 'domcontentloaded' });
                await mainPage.type('#email', workerData.burnerUsername);
                await mainPage.type('#pass', workerData.burnerPassword);
                await mainPage.click('button[name="login"]');
                //await mainPage.waitForNavigation(); //necessary with headless mode
                console.log(mainPage.url());
                if(mainPage.url() != 'https://www.facebook.com/?sk=welcome' && mainPage.url() != 'https://www.facebook.com/'){
                    await client.channels.cache.get(workerData.channel).send(`Facebook Burner Login Invalid at ${workerData.name}, restart your task\n@everyone`);
                    parentPort.postMessage({action: 'failure'});
                }else{
                    //get the cookies for login on isp page
                    burnerCookies = await mainPage.cookies();
                }
                mainBrowser.close();
                console.log('main page login');
            }catch (error){
                errorMessage('Error with logging in on main page - no cookie');
            }
        }

        try{
            //initialize the static isp proxy page
            mainBrowser = await puppeteer.launch({
                headless: false,
                defaultViewport: { width: 1366, height: 768 },
                args: ['--disable-notifications', `--user-agent=${randomUserAgent}`]//, `--proxy-server=http://134.202.250.62:50100`
            });
            let pages = await mainBrowser.pages();
            mainPage = pages[0];

            //authenticate proxy
            //await mainPage.authenticate({ 'username':'falktravis', 'password': `z6TVGIahV4` });
            
            //Set cookies in browser
            await mainPage.setCookie(...burnerCookies);

            //go to the search page
            await mainPage.goto(workerData.link, { waitUntil: 'networkidle0' });
            
            //this will either update the previous cookies or assign totally new ones
            burnerCookies = await mainPage.cookies();
            parentPort.postMessage({action: "updateBurnerCookies", cookies: burnerCookies});
        }catch(error){
            errorMessage('Error with static main page initiation');
        }

        //set distance
        if(workerData.distance != null){
            try {
                await mainPage.click('div.x1y1aw1k.xl56j7k div.x1iyjqo2');
                await mainPage.waitForSelector('div.x9f619.x14vqqas.xh8yej3');
                await mainPage.click('div.x9f619.x14vqqas.xh8yej3');
                await mainPage.click(`[role="listbox"] div.x4k7w5x > :nth-child(${workerData.distance})`);
                await mainPage.click('[aria-label="Apply"]');
                //wait for the results to update, we aren't concerned about time
                await new Promise(r => setTimeout(r, 3000));
            } catch (error) {
                errorMessage('Error with setting distance');
            }
        }
        
        // Set listingStorage, run once in the begging of the day
        try{
            mainListingStorage = await mainPage.evaluate(() => {
                let searchResults = document.querySelector('div.xx6bls6');
                if(searchResults == null){
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
        }catch (error){
            errorMessage('Error with setting listings');
        }
        console.log("Main Storage: " + mainListingStorage);
    }
    
    //!Please go through and add some comments, I have no clue what is going on
    //time stuff
    let isRunning;
    let currentTime = new Date();
    currentTime = (currentTime.getHours() * 60) + currentTime.getMinutes();
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
    async function handleTime(intervalFunction) {
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
            isCreate = false;
            await start();
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
                    console.log("New Post: " + newPost);
                    console.log("Main listing storage: " + mainListingStorage);
                } catch(error) {
                    errorMessage('Error with main page conversion');
                }
            
                //newPost is actually new
                //if(mainListingStorage[0] != newPost && mainListingStorage[1] != newPost && newPost != null){
                    console.log("new post");

                    //Determine whether the item is shipped or local pickup
                    let isShipping;
                    try {
                        let shippingText = await mainPage.evaluate(() => {
                            return document.querySelector('.x3ct3a4 span.xuxw1ft').innerText;
                        })
                        console.log(shippingText);
                        if(shippingText == "Ships to you"){
                            isShipping = true;
                        }else{
                            isShipping = false;
                        }
                    } catch(error) {
                        errorMessage('Error with shipping detection');
                    }
            
                    if(workerData.autoMessage && isShipping == false){
                        let isLogin = true;  
                        let itemPageLogin = true;
                        let itemPageBlockAll = false;
                        randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
                    
                        //If there are no current cookies for the message account we need to get them
                        if(messageCookies == null){
                            try {
                                //Instantiate the page with packetstream proxies for login
                                itemBrowser = await puppeteer.launch({
                                    headless: false,
                                    defaultViewport: { width: 1366, height: 768 },
                                    args: ['--disable-notifications', `--user-agent=${randomUserAgent}`]//, `--proxy-server=http://proxy.packetstream.io:31112`
                                });
                                let pages = await itemBrowser.pages();
                                itemPage = pages[0];
                    
                                //authenticate proxy
                                //await itemPage.authenticate({ 'username':'grumpypop1024', 'password': `1pp36Wc7ds9CgPSH_country-UnitedStates_session-${workerData.messageProxy}` });
                                        
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
                                errorMessage('Error with item page instantiation for login');
                            }      
                                
                            try{
                                await itemPage.goto('https://www.facebook.com/login', { waitUntil: 'networkidle0' });
                                await itemPage.type('#email', workerData.mainUsername);
                                await itemPage.type('#pass', workerData.mainPassword);
                                await itemPage.click('button[name="login"]');
                                //await itemPage.waitForNavigation(); //necessary with headless mode
                                console.log(itemPage.url());
                                if(itemPage.url() != 'https://www.facebook.com/?sk=welcome' && itemPage.url() != 'https://www.facebook.com/'){
                                    isLogin = false;
                                    client.channels.cache.get(workerData.channel).send(`Facebook Main Invalid at ${workerData.name}\n@everyone`);
                                }else{
                                    messageCookies = await itemPage.cookies();
                                }
                                await itemBrowser.close();
                            } catch (error){
                                errorMessage('Error with message login');
                            }
                        }
                    
                        //browser with static isp
                        try {
                            randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
                            itemBrowser = await puppeteer.launch({
                                headless: false,
                                defaultViewport: { width: 1366, height: 768 },
                                args: ['--disable-notifications', `--user-agent=${randomUserAgent}`]//, `--proxy-server=http://proxy.packetstream.io:31112`
                            });
                            let pages = await itemBrowser.pages();
                            itemPage = pages[0];
                    
                            //authenticate proxy
                            //await itemPage.authenticate({ 'username':'grumpypop1024', 'password': `1pp36Wc7ds9CgPSH_country-UnitedStates_session-${workerData.messageProxy}` });
                    
                            //set cookies/login if the login was a success
                            if(isLogin){
                                await itemPage.setCookie(...messageCookies);
                            }
                        } catch (error) {
                            errorMessage('Error with item page instantiation for cookie login');
                        }
                    
                        try{
                            //navigate to the product page
                            await itemPage.goto(newPost, { waitUntil: 'domcontentloaded' });
                    
                            if(isLogin && itemPage.$('div.x1daaz14 [aria-label="Send seller a message"]') != null){   
                                if(workerData.message != null){
                                    await itemPage.click('div.x1daaz14 [aria-label="Send seller a message"]');
                                    await itemPage.keyboard.press('Backspace');
                                    const messageTextArea = await itemPage.$('div.x1daaz14 [aria-label="Send seller a message"]');
                                    await messageTextArea.type(workerData.message);
                                }
                                await itemPage.click('div.x1daaz14 div.x14vqqas div.xdt5ytf');
                                await itemPage.waitForSelector('[aria-label="Message Again"]'); //wait for the message to send
                            }
                        } catch (error){
                            errorMessage('Error with messaging');
                        }
                    }else{
                        //If no autoMessage we can use a isp and not worry about the login
                        itemBrowser = await puppeteer.launch({
                            headless: false,
                            defaultViewport: { width: 1366, height: 768 },
                            args: ['--disable-notifications', `--user-agent=${randomUserAgent}`]//, `--proxy-server=http://proxy.packetstream.io:31112`
                        });
                        let pages = await itemBrowser.pages();
                        itemPage = pages[0];

                        //authenticate proxy
                        //await itemPage.authenticate({ 'username':'grumpypop1024', 'password': `1pp36Wc7ds9CgPSH_country-UnitedStates_session-${workerData.messageProxy}` });

                        //navigate to the product page
                        await itemPage.goto(newPost, { waitUntil: 'domcontentloaded' });
                    }
                    

                    let postObj;
                    try{
                        //make a new tab and go to item page to gather info
                        postObj = await itemPage.evaluate(() => {
                            let dom = document.querySelector('div.x9f619');
                            return {
                                img: dom.querySelector('img').src,
                                title: dom.querySelector('div.xyamay9 h1').innerText,
                                date: dom.querySelector('[aria-label="Buy now"]') != null ? (dom.querySelector('div.xyamay9 div.x6ikm8r > :nth-child(2)') != null ? dom.querySelector('div.xyamay9 div.x6ikm8r > :nth-child(2)').innerText : " ") : dom.querySelector('div.x1yztbdb span.x676frb.x1nxh6w3').innerText,
                                description: dom.querySelector('div.xz9dl7a.x4uap5.xsag5q8.xkhd6sd.x126k92a span') != null ? dom.querySelector('div.xz9dl7a.x4uap5.xsag5q8.xkhd6sd.x126k92a span').innerText : ' ',
                                shipping: dom.querySelector('[aria-label="Buy now"]') != null ? (dom.querySelector('div.xyamay9 div.x6ikm8r') != null ? dom.querySelector('div.xyamay9 div.x6ikm8r span').innerText : dom.querySelector('div.xod5an3 div.x1gslohp span').innerText) : ' ', //I feel that document.querySelector('div.xod5an3 div.x1gslohp span').innerText wont work
                                price: "$" + dom.querySelector('div.x1xmf6yo span.x193iq5w.xeuugli.x13faqbe.x1vvkbs.x1xmvt09.x1lliihq.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.xudqn12.x676frb').innerText.split("$")[1]
                            };
                        });
                        await itemBrowser.close();
                        itemBrowser = null;
                    } catch(error){
                        errorMessage('Error with getting item data');
                    }
                    
                    //Handle Discord messaging
                    if(workerData.autoMessage || isShipping == true){
                        try{
                            client.channels.cache.get(workerData.channel).send({ embeds: [new EmbedBuilder()
                                .setColor(0x0099FF)
                                .setTitle(postObj.title + " - " + postObj.price)
                                .setURL(newPost)
                                .setAuthor({ name: workerData.name })
                                .setDescription(postObj.description)
                                .addFields({ name: postObj.date, value: postObj.shipping })
                                .setImage(postObj.img)
                                .setTimestamp(new Date())
                            ]});
                            client.channels.cache.get(workerData.channel).send("New Facebook Post From " + workerData.name + " @everyone");
                        }catch(error){
                            errorMessage('Error with item notification');
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
                            errorMessage('Error with new item notification with message button');
                        }

                        const filter = i => i.customId.split("-")[0] == 'message';
                        const collector = await notification.createMessageComponentCollector({ filter, time: 14400000 }); //4 hours, I think
                        collector.on('collect', async i => {
                            i.reply("Sending...");

                            await handleMessage(i.customId.split("-")[1]);

                            collector.stop();
                        });
                        collector.on('end', () => {
                            notification.edit({ components: [] });
                        });
                    }
    
                    //set the main listing storage if necessary
                    try {
                        if(workerData.burnerUsername != undefined){
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
                        }
                    } catch(error) {
                        errorMessage('Error with re-setting mainListingStorage');
                    }
                //}
                interval();
            }
        }, Math.floor((Math.random() * (1) + 1) * 60000)); //!Math.floor((Math.random() * (2) + 2) * 60000)
    } 
})();