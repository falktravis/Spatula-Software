//require
const { workerData } = require('worker_threads');
const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(stealthPlugin());

//discord.js
const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.login(process.env.DISCORD_BOT_TOKEN);

//User agents
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

(async () => {
    //general instantiation
    let isCreate = true;
    let newPost;
    let mainBrowser;
    let mainPage;
    let mainListingStorage;

    const start = async() => {
        //init main browser
        const mainPageInitiationSequence = async() => {
            try{
                randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
                if(workerData.burnerProxy == null){
                    //send rotating proxy info
                    mainBrowser = await puppeteer.launch({
                        headless: false,
                        defaultViewport: { width: 1366, height: 768 },
                        args: ['--disable-notifications', `--user-agent=${randomUserAgent}`] 
                    });
                }else{
                    //send workerData.burnerProxy
                    mainBrowser = await puppeteer.launch({
                        headless: false,
                        defaultViewport: { width: 1366, height: 768 },
                        args: ['--disable-notifications', `--user-agent=${randomUserAgent}`, `--proxy-server=http://proxy.packetstream.io:31112`]
                    });
                }
                let pages = await mainBrowser.pages();
                mainPage = pages[0];
                mainPage.authenticate({ 'username':'grumpypop1024', 'password':'1pp36Wc7ds9CgPSH_country-UnitedStates_session-XPV69uxg' });

                //block network stuff if login-search = true
                if(workerData.burnerUsername == undefined){
                    await mainPage.setRequestInterception(true);
                    mainPage.on('request', async request => {
                        const resource = request.resourceType();
                        if(resource != 'document'){
                            request.abort();
                        }else{
                            request.continue();
                        }
                    });
                }
            }catch (error){
                console.log("Error with starting main page: " + error);
                client.channels.cache.get('1091532766522376243').send('Facebook error: ' + error);
            }
        }
        await mainPageInitiationSequence();

        try{
            //if login is activated
            if(workerData.burnerUsername != undefined){
                //login   
                await mainPage.goto('https://www.facebook.com/login', { waitUntil: 'domcontentloaded' });
                //await new Promise(r => setTimeout(r, (Math.random() * 300 + 100)));
                await mainPage.type('#email', workerData.burnerUsername);
                await mainPage.type('#pass', workerData.burnerPassword);
                await mainPage.click('button[name="login"]');
                await mainPage.waitForNavigation(); //necessary with headless mode
                console.log(mainPage.url());
                if(mainPage.url() != 'https://www.facebook.com/?sk=welcome' && mainPage.url() != 'https://www.facebook.com/' && !mainPage.url().includes('device-based/regular')){
                    client.channels.cache.get(workerData.channel).send(`Facebook Burner Login Invalid at ${workerData.name}\n@everyone`);
                }else if(mainPage.url().includes('device-based/regular')){
                    console.log("Weird Url thing: ");
                    await mainPage.click('button._9kpt');
                    await mainPage.waitForNavigation();
                    await mainPage.type('#pass', workerData.burnerPassword);
                    await mainPage.click('button[name="login"]');
                    await mainPage.waitForNavigation(); //There is a chance this will sometimes simply not work, in that case maybe we just tell them to restart their task
                    console.log(mainPage.url());
                }
                console.log("main page login");
                await mainPage.goto(workerData.link, { waitUntil: 'networkidle0' });

                //set distance
                if(workerData.distance != null){
                    await mainPage.goto(workerData.link, { waitUntil: 'networkidle0' });
                    await mainPage.click('div.x1y1aw1k.xl56j7k div.x1iyjqo2');
                    await mainPage.waitForSelector('div.x9f619.x14vqqas.xh8yej3');
                    await mainPage.click('div.x9f619.x14vqqas.xh8yej3');
                    await mainPage.click(`[role="listbox"] div.x4k7w5x > :nth-child(${workerData.distance})`);
                    await mainPage.click('[aria-label="Apply"]');
                    //wait for the results to update, we aren't concerned about time
                    await new Promise(r => setTimeout(r, 3000));
                }
            }else{
                await mainPage.goto(workerData.link, { waitUntil: 'networkidle0' });
            }
        }catch (error){
            console.log("Error with setting up main page: " + error);
            client.channels.cache.get('1091532766522376243').send('Facebook error: ' + error);
        }

        // Set listingStorage, run once in the begging of the day
        try{
            mainListingStorage = await mainPage.evaluate(() => {
                let links = [document.querySelector(".x3ct3a4 a"), document.querySelector("div.x139jcc6.x1nhvcw1 > :nth-child(2)").querySelector('a')];
                return links.map((link) => {
                    if(link != null){
                        let href = link.href;
                        return href.substring(0, href.indexOf("?"));
                    }else{
                        return null;
                    }
                })
            });
        }catch (error){
            console.log("Error with setting listings: " + error);
            client.channels.cache.get('1091532766522376243').send('Facebook error: ' + error);
        }
        console.log("Main Storage: " + mainListingStorage);
    }
    
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
                        let link = document.querySelector(".x3ct3a4 a").href;
                        if(link != null){
                            return link.substring(0, link.indexOf("?"));
                        }else{
                            return null;
                        }
                    });
                    console.log("New Post: " + newPost);
                    console.log("Main listing storage: " + mainListingStorage);
                } catch(error) {
                    console.log("Error with main page conversion: " + error);
                    client.channels.cache.get('1091532766522376243').send('Facebook error: ' + error);
                }
            
                //newPost is actually new
                //if(mainListingStorage[0] != newPost && mainListingStorage[1] != newPost && newPost != null){
                    console.log("new post");
                    let newPage;
                    let messageBrowser;

                    try {
                        //Use workerData.mainProxy
                        randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
                        messageBrowser = await puppeteer.launch({
                            headless: false,
                            defaultViewport: { width: 1366, height: 768 },
                            args: ['--disable-notifications', `--user-agent=${randomUserAgent}`]
                        });
                        let pages = await messageBrowser.pages();
                        newPage = pages[0];
                    } catch(error) {
                        console.log("Error with newPage: " + error);
                        client.channels.cache.get('1091532766522376243').send('Facebook error: ' + error);
                    }         

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
                        console.log("Error with shipping detection: " + error);
                        client.channels.cache.get('1091532766522376243').send('Facebook error: ' + error);
                    }

                    if(workerData.autoMessage && isShipping == false){
                        autoMessage = true;
                        let isLogin = true;   
                        try{
                            await newPage.goto('https://www.facebook.com/login', { waitUntil: 'networkidle0' });
                            await newPage.type('#email', workerData.mainUsername);
                            await newPage.type('#pass', workerData.mainPassword);
                            await newPage.click('button[name="login"]');
                            await newPage.waitForNavigation(); //necessary with headless mode
                            console.log(newPage.url());
                            if(newPage.url() != 'https://www.facebook.com/?sk=welcome' && newPage.url() != 'https://www.facebook.com/' && !newPage.url().includes('privacy_mutation_token') && !newPage.url().includes('device-based/regular')){
                                client.channels.cache.get(workerData.channel).send(`Facebook Main Invalid at ${workerData.name}\n@everyone`);
                            }else if(newPage.url().includes('privacy_mutation_token') || newPage.url().includes('device-based/regular')){
                                console.log("Weird Url thing: ");
                                await newPage.click('button._9kpt');
                                await newPage.waitForNavigation();
                                await newPage.type('#pass', workerData.burnerPassword);
                                await newPage.click('button[name="login"]');
                                await newPage.waitForNavigation(); //There is a chance this will sometimes simply not work, in that case maybe we just tell them to restart their task
                                console.log(newPage.url());
                            }

                            await newPage.goto(newPost, { waitUntil: 'domcontentloaded' });
                        } catch (error){
                            console.log("Error with login: " + error);
                            client.channels.cache.get('1091532766522376243').send('Facebook error: ' + error);
                        }

                        if(isLogin && newPage.$('div.x1daaz14 [aria-label="Send seller a message"]') != null){                 
                            try{
                                if(workerData.message != null){
                                    await newPage.click('div.x1daaz14 [aria-label="Send seller a message"]');
                                    await newPage.keyboard.press('Backspace');
                                    const messageTextArea = await newPage.$('div.x1daaz14 [aria-label="Send seller a message"]');
                                    await messageTextArea.type(workerData.message);
                                }
                                await newPage.click('div.x1daaz14 div.x14vqqas div.xdt5ytf');
                                await newPage.waitForSelector('[aria-label="Message Again"]'); //wait for the message to send
                            } catch (error){
                                console.log("Error with messaging: " + error);
                                client.channels.cache.get('1091532766522376243').send('Facebook error: ' + error);
                                client.channels.cache.get(workerData.channel).send(`Message Failed`);
                            }
                        }
                    }else{
                        await newPage.goto(newPost, { waitUntil: 'domcontentloaded' });
                    }

                    let postObj;
                    try{
                        //make a new tab and go to item page to gather info
                        postObj = await newPage.evaluate(() => {
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
                        await messageBrowser.close();
                    } catch(error){
                        console.log("error with getting item data: " + error);
                        client.channels.cache.get('1091532766522376243').send('Facebook error: ' + error);
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
                            console.log("error with new item message: " + error);
                            client.channels.cache.get('1091532766522376243').send('Facebook error: ' + error);
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
                            console.log("error with new item message: " + error);
                            client.channels.cache.get('1091532766522376243').send('Facebook error: ' + error);
                        }

                        const filter = i => i.customId.split("-")[0] == 'message';
                        const collector = await notification.createMessageComponentCollector({ filter, time: 14400000 }); //4 hours, I think
                        collector.on('collect', async i => {
                            try{
                                i.reply("Sending...");
                                randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
                                //workerData.mainProxy
                                messageBrowser = await puppeteer.launch({
                                    headless: false,
                                    defaultViewport: { width: 1366, height: 768 },
                                    args: ['--disable-notifications', `--user-agent=${randomUserAgent}`]
                                });
                                let pages = await messageBrowser.pages();
                                messagePage = pages[0];

                                await messagePage.goto('https://www.facebook.com/login', { waitUntil: 'networkidle0' });
                                await messagePage.type('#email', workerData.mainUsername);
                                await messagePage.type('#pass', workerData.mainPassword);
                                await messagePage.click('button[name="login"]');
                                await messagePage.waitForNavigation(); //necessary with headless mode
                                console.log(messagePage.url());
                                if(messagePage.url() == 'https://www.facebook.com/?sk=welcome' || messagePage.url() == 'https://www.facebook.com/'){
                                    try{
                                        await messagePage.goto(i.customId.split("-")[1] , { waitUntil: 'domcontentloaded' });    
                                        if(workerData.message != null){
                                            await messagePage.click('div.x1daaz14 [aria-label="Send seller a message"]');
                                            await messagePage.keyboard.press('Backspace');
                                            const messageTextArea = await messagePage.$('div.x1daaz14 [aria-label="Send seller a message"]');
                                            await messageTextArea.type(workerData.message);
                                        }
                                        await messagePage.click('div.x1daaz14 div.x14vqqas div.xdt5ytf');
                                        await messagePage.waitForSelector('[aria-label="Message Again"]'); //wait for the message to send
                                        client.channels.cache.get(workerData.channel).send(`Sent!`);
                                    }catch(error){
                                        console.log(error);
                                        client.channels.cache.get(workerData.channel).send(`Message Failed`);
                                    }
                                    await messageBrowser.close();
                                }else if(messagePage.url().includes('device-based/regular')){
                                    console.log("Weird Url thing: ");
                                    await messagePage.click('button._9kpt');
                                    await messagePage.waitForNavigation();
                                    await messagePage.type('#pass', workerData.burnerPassword);
                                    await messagePage.click('button[name="login"]');
                                    await messagePage.waitForNavigation(); //There is a chance this will sometimes simply not work, in that case maybe we just tell them to restart their task
                                    console.log(messagePage.url());
                                }else{
                                    client.channels.cache.get(workerData.channel).send(`Facebook Message Login Invalid at ${workerData.name}\n@everyone`);
                                }
                            } catch (error){ 
                                console.log("Error with manual message: " + error);
                                client.channels.cache.get('1091532766522376243').send('Facebook error: ' + error);
                            }
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
                                let links = [document.querySelector(".x3ct3a4 a"), document.querySelector("div.x139jcc6.x1nhvcw1 > :nth-child(2)").querySelector('a')]; //will the second selector return null properly?
                                return links.map((link) => {
                                    if(link != null){
                                        let href = link.href;
                                        return href.substring(0, href.indexOf("?"));
                                    }else{
                                        return null;
                                    }
                                })
                            });
                        }
                    } catch(error) {
                        console.log("Error with re-setting mainListingStorage: " + error);
                        client.channels.cache.get('1091532766522376243').send('Facebook error: ' + error);
                    }
                //}
                interval();
            }
        }, 1000000000); //!Math.floor((Math.random() * (2) + 2) * 60000)
    } 
})();