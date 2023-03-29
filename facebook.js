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
const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

(async () => {
    //general instantiation
    let isCreate = true;
    let networkTracking = 0;
    let newPost;
    let mainPageSetDistance = false;

    //init main browser
    let mainBrowser;
    let mainPage;
    try{
        //TODO: set static proxy
        mainBrowser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1000, height: 600 },
            args: ['--disable-notifications', `--user-agent=${randomUserAgent}`]
        });

        await mainPage.setRequestInterception(true);
        //track network consumption
        mainPage.on('response', (response) => {
            const contentLengthHeader = response.headers()['content-length'];
            if (contentLengthHeader && !isNaN(parseInt(contentLengthHeader))) {
                networkTracking += parseInt(contentLengthHeader);
            }
        });

        mainPage.on('request', async request => {
            const resource = request.resourceType();

            if(mainPageSetDistance){
                if(resource != 'document' && resource != 'script' && resource != 'xhr' && resource != 'stylesheet'){
                    request.abort();
                }else{
                    request.continue();
                }
            }else{
                if(resource != 'document' && resource != 'script'){
                    request.abort();
                }else{
                    request.continue();
                }
            }
        })

        //if login is activated
        if(workerData.burnerUsername != undefined){
            mainPage = await mainBrowser.newPage();
    
            //login   
            await mainPage.goto('https://www.facebook.com/', { waitUntil: 'networkidle0' });
            await mainPage.type('#email', workerData.burnerUsername);
            await mainPage.type('#pass', workerData.burnerPassword);
            await mainPage.click('button[name="login"]');
            await mainPage.waitForNavigation();
            console.log(mainPage.url());
            if(mainPage.url() != 'https://www.facebook.com/' && mainPage.url() != 'https://www.facebook.com/?sk=welcome'){
                client.channels.cache.get(workerData.channel).send(`Facebook Burner Login Invalid at ${workerData.name}\n@everyone`);
            }
    
            //set distance
            if(workerData.distance != null){
                mainPageSetDistance = true;
                await mainPage.goto(workerData.link, { waitUntil: 'networkidle0' });
                await mainPage.click('div.x1y1aw1k.xl56j7k div.x1iyjqo2');
                await mainPage.waitForSelector('div.x9f619.x14vqqas.xh8yej3');
                await mainPage.click('div.x9f619.x14vqqas.xh8yej3');
                await mainPage.click(`[role="listbox"] div.x4k7w5x > :nth-child(${4})`);
                await mainPage.click('[aria-label="Apply"]');
                //wait for the results to update
                await new Promise(r => setTimeout(r, 1000));
                mainPageSetDistance = false;
            }else{
                await mainPage.goto(workerData.link, { waitUntil: 'networkidle0' });
            }
        }
    }catch (error){
        console.log("Error with start up: " + error);
    }

    //init burner browser
    let burnerBrowser;
    let burnerPage;
    try{
        //TODO: set rotating proxy
        burnerBrowser = await puppeteer.launch({
            headless: true,
            defaultViewport: { width: 1000, height: 600 },
            args: ['--disable-notifications', `--user-agent=${randomUserAgent}`]
        });
        burnerPage = await burnerBrowser.newPage();

        await burnerPage.setRequestInterception(true);
        //track network consumption
        burnerPage.on('response', (response) => {
            const contentLengthHeader = response.headers()['content-length'];
            if (contentLengthHeader && !isNaN(parseInt(contentLengthHeader))) {
                networkTracking += parseInt(contentLengthHeader);
            }
        });

        burnerPage.on('request', async request => {
            const resource = request.resourceType();

            if(resource != 'document'){
                request.abort();
            }else{
                request.continue();
            }
        });

        await burnerPage.goto(workerData.link, { waitUntil: 'networkidle0' });
    }catch (error){
        console.log("Error with setting distance: " + error);
    }

    // Set listingStorage, run once in the begging of the day
    let burnerListingStorage;
    let mainListingStorage;
    try{
        if(workerData.burnerUsername != undefined){
            mainListingStorage = await mainPage.evaluate(() => {
                if(document.querySelector(".xx6bls6") == null){
                    let links = [document.querySelector(".x3ct3a4 a"), document.querySelector("div.x139jcc6.x1nhvcw1 > :nth-child(2)").querySelector('a'), document.querySelector("div.x139jcc6.x1nhvcw1 > :nth-child(3)").querySelector('a'), document.querySelector("div.x139jcc6.x1nhvcw1 > :nth-child(4)").querySelector('a')];
                    return links.map((link) => {
                        if(link != null){
                            let href = link.href;
                            return href.substring(0, href.indexOf("?"));
                        }else{
                            return null;
                        }
                    })
                }else {
                    return null;
                }
            });
        }

        burnerListingStorage = await burnerPage.evaluate(() => {
            let link = document.querySelector(".x3ct3a4 a").href;
            let link2 = document.querySelector("div.x139jcc6.x1nhvcw1 > :nth-child(2)").querySelector('a').href;
            return [link.substring(0, link.indexOf("?")), link2.substring(0, link2.indexOf("?"))];
        });
    }catch (error){
        console.log("Error with setting listings: " + error);
    }
    console.log("Main Storage: " + mainListingStorage);
    console.log("Burner Storage: " + burnerListingStorage);
    console.log(`Response received: ${networkTracking} bytes`);
    
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
        if(currentTime > workerData.start && currentTime < workerData.end){
            isRunning = false;
        }else{
            isRunning = true;
        }
    }

    //sets an interval to turn on/off interval
    function handleTime(intervalFunction) {
        currentTime = new Date();
        //range from 0 - 1440
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
        console.log("time to change: " + interval);
        
        if(isRunning){
            if(isCreate == false){
                (async () => {
                    try{
                        mainPage = await mainBrowser.newPage();
                        await mainPage.goto(workerData.link, { waitUntil: 'networkidle0' });
                    } catch (error){
                        console.log("Error with main page: " + error);
                    }
                })();
            }else{
                isCreate = false;
            }
            intervalFunction(); 
        }else{
            mainPage.close();
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
                await burnerPage.reload({ waitUntil: 'networkidle0' });
                console.log(`Response received: ${networkTracking} bytes`);

                newPost = await burnerPage.evaluate(() => {
                    let link = document.querySelector(".x3ct3a4 a").href;
                    return link.substring(0, link.indexOf("?"))
                });
                console.log("First Post Check: " + newPost);
    
                //the burner detects a new post
                if(burnerListingStorage[0] != newPost && burnerListingStorage[1] != newPost && newPost != null){
                    let isNewPost = true;
                    //if login is activated
                    if(workerData.burnerUsername != undefined){
                        newPost = await mainPage.evaluate(() => {
                            let link = document.querySelector(".x3ct3a4 a").href;
                            return link.substring(0, link.indexOf("?"))
                        });
                        mainListingStorage.forEach((link) => {
                            if(newPost == link){
                                isNewPost = false;
                            }
                        })
                    }
                
                    if(isNewPost || workerData.burnerUsername == undefined){
                        const newPage = await mainBrowser.newPage();

                        //network shit
                        await newPage.setRequestInterception(true);
                        newPage.on('response', (response) => {
                            const contentLengthHeader = response.headers()['content-length'];
                            if (contentLengthHeader && !isNaN(parseInt(contentLengthHeader))) {
                                networkTracking += parseInt(contentLengthHeader);
                            }
                        });

                        //! I am assuming that we need to allow some more resources at some point, have fun testing :)
                        newPage.on('request', async request => {
                            const resource = request.resourceType();
                            if(resource != 'document' && resource != 'script'){
                                request.abort();
                            }else{
                                request.continue();
                            }
                        });

                        if(workerData.autoMessage){
                            let isLogin = false;   
                            try{
                                await newPage.goto('https://www.facebook.com/', { waitUntil: 'networkidle0' });
                                await newPage.type('#email', workerData.mainUsername);
                                await newPage.type('#pass', workerData.mainPassword);
                                await newPage.click('button[name="login"]');
                                await newPage.waitForNavigation();
                                if(mainPage.url() == 'https://www.facebook.com/' || mainPage.url() == 'https://www.facebook.com/?sk=welcome'){
                                    isLogin = true;
                                }else{
                                    client.channels.cache.get(workerData.channel).send(`Facebook Main Invalid at ${workerData.name}\n@everyone`);
                                }
                            } catch (error){
                                console.log("Error with login: " + error);
                            }
                            await newPage.goto(newPost, { waitUntil: 'networkidle0' });
        
                            if(isLogin){                 
                                try{
                                    if(workerData.message != null){
                                        const messageTextArea = await newPage.$('label.xzsf02u.x6prxxf textarea');
                                        await messageTextArea.click();
                                        await newPage.keyboard.press('Backspace');
                                        await messageTextArea.type(workerData.message);
                                    }
                                    const sendMessageButton = await newPage.$('span.x1lliihq.x1iyjqo2 div.xdt5ytf.xl56j7k');
                                    await sendMessageButton.click();
                                } catch (error){
                                    console.log("Error with messaging: " + error);
                                }
                            }
                        }else{
                            await newPage.goto(newPost, { waitUntil: 'networkidle0' });
                        }

                        let postObj;
                        try{
                            //make a new tab and go to item page to gather info
                            postObj = await newPage.evaluate(() => {
                                let dom = document.querySelector('div.x9f619');
                                return {
                                    img: dom.querySelector('img').src,
                                    title: dom.querySelector('div.xyamay9 h1').innerText,
                                    date: dom.querySelector('div.x1yztbdb span.x676frb.x1nxh6w3').innerText,
                                    description: dom.querySelector('div.xz9dl7a.x4uap5.xsag5q8.xkhd6sd.x126k92a span').innerText,
                                    price: "$" + dom.querySelector('div.x1xmf6yo span.x193iq5w.xeuugli.x13faqbe.x1vvkbs.x1xmvt09.x1lliihq.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.xudqn12.x676frb').innerText.split("$")[0]
                                };
                            })
                            newPage.close();
                            console.log(`New page: ${networkTracking} bytes`);
                        } catch(error){
                            console.log("error with item page: " + error)
                        }
        
                        //Handle Discord messaging
                        if(workerData.autoMessage){
                            try{
                                client.channels.cache.get(workerData.channel).send({ embeds: [new EmbedBuilder()
                                    .setColor(0x0099FF)
                                    .setTitle(postObj.title + " - " + postObj.price)
                                    .setURL(newPost)
                                    .setAuthor({ name: workerData.name })
                                    .setDescription(postObj.description)
                                    .addFields({ name: postObj.date, value: " " })
                                    .setImage(postObj.img)
                                    .setTimestamp(new Date())
                                ]});
                                client.channels.cache.get(workerData.channel).send("New Facebook Post From " + workerData.name + " @everyone");
                            }catch(error){
                                console.log("error with new item message: " + error);
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
                                    .addFields({ name: postObj.date, value: " " })
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
                            }
            
                            //message button listener
                            const filter = i => i.customId.split("-")[0] == 'message';
                            const collector = notification.createMessageComponentCollector({ filter, time: 14400000 }); //4 hours, I think
                            collector.on('collect', async i => {
                                console.log("message button click");
        
                                (async () => {
                                    //!both accounts on the same browser
                                    const messagePage = await mainBrowser.newPage();

                                    //network shit
                                    await messagePage.setRequestInterception(true);
                                    messagePage.on('response', (response) => {
                                        const contentLengthHeader = response.headers()['content-length'];
                                        if (contentLengthHeader && !isNaN(parseInt(contentLengthHeader))) {
                                            networkTracking += parseInt(contentLengthHeader);
                                        }
                                    });

                                    //! I am assuming that we need to allow some more resources at some point, have fun testing :)
                                    messagePage.on('request', async request => {
                                        const resource = request.resourceType();
                                        if(resource != 'document' && resource != 'script'){
                                            request.abort();
                                        }else{
                                            request.continue();
                                        }
                                    });

                                    try{
                                        await messagePage.goto('https://www.facebook.com/', { waitUntil: 'networkidle0' });
                                        await messagePage.type('#email', workerData.mainUsername);
                                        await messagePage.type('#pass', workerData.mainPassword);
                                        await messagePage.click('button[name="login"]');
                                        await messagePage.waitForNavigation();
                                        if(messagePage.url() === 'https://www.facebook.com/'){
                                            await messagePage.goto(i.customId.split("-")[1] , { waitUntil: 'networkidle0' });   
                                            if(workerData.message != null){
                                                const messageTextArea = await messagePage.$('label.xzsf02u.x6prxxf textarea');
                                                await messageTextArea.click();
                                                await messagePage.keyboard.press('Backspace');
                                                await messageTextArea.type(workerData.message);
                                            }
                                            const sendMessageButton = await messagePage.$('span.x1lliihq.x1iyjqo2 div.xdt5ytf.xl56j7k');
                                            await sendMessageButton.click();
                                            //!might have to perform some kind of wait function here
                                            await messagePage.close();
                                            console.log(`Message page: ${networkTracking} bytes`);
                                        }else{
                                            client.channels.cache.get(workerData.channel).send(`Facebook Main Invalid at ${workerData.name}\n@everyone`);
                                        }
                                    } catch (error){ 
                                        console.log("Error with login and message: " + error);
                                    }
                                })();
        
                                await i.update({ content: 'Message sent!', components: [] });
                                collector.stop();
                            });
                            collector.on('end', () => {
                                notification.edit({ components: [] });
                            });
                        }
        
                        //set the main listing storage if necessary
                        if(workerData.burnerUsername != undefined){
                            mainListingStorage = await mainPage.evaluate(() => {
                                if(document.querySelector(".xx6bls6") == null){
                                    let links = [document.querySelector(".x3ct3a4 a"), document.querySelector("div.x139jcc6.x1nhvcw1 > :nth-child(2)").querySelector('a'), document.querySelector("div.x139jcc6.x1nhvcw1 > :nth-child(3)").querySelector('a'), document.querySelector("div.x139jcc6.x1nhvcw1 > :nth-child(4)").querySelector('a')];
                                    return links.map((link) => {
                                        if(link != null){
                                            let href = link.href;
                                            return href.substring(0, href.indexOf("?"));
                                        }
                                    })
                                }else {
                                    return null;
                                }
                            });
                        }
                    }
                    //set the burner listing storage
                    burnerListingStorage = await burnerPage.evaluate(() => {
                        let link2 = document.querySelector("div.x139jcc6.x1nhvcw1 > :nth-child(2)").querySelector('a').href;
                        return [newPost, link2.substring(0, link2.indexOf("?"))];
                    });
                }
                else if(burnerListingStorage[0] != newPost && burnerListingStorage[1] == newPost && newPost != null){
                    burnerListingStorage = await burnerPage.evaluate(() => {
                        let link2 = document.querySelector("div.x139jcc6.x1nhvcw1 > :nth-child(2)").querySelector('a').href;
                        return [newPost, link2.substring(0, link2.indexOf("?"))];
                    });
                }    
                interval();
            }
        }, Math.floor((Math.random() * (2) + 2) * 60000));
    } 
})();