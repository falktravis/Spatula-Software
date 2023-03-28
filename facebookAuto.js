//require
const { workerData } = require('worker_threads');
const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(stealthPlugin());

//discord.js
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.login(process.env.DISCORD_BOT_TOKEN);

//User agents
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/96.0.1',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/96.0.1',
    // add more user agent strings as needed
];
const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

(async () => {
    //general instantiation
    let isCreate = true;
    let networkTracking = 0;
    let newPost;
    let isNewPost;

    //init main browser
    let mainBrowser;
    let mainPage;
    let blockRequests = false;
    try{
        //TODO: set static proxy
        mainBrowser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1000, height: 600 },
            args: ['--disable-notifications' `--user-agent=${randomUserAgent}`]
        });
        mainPage = await mainBrowser.newPage();

        await mainPage.setRequestInterception(true);
        //track network consumption
        mainPage.on('response', (response) => {
            const contentLengthHeader = response.headers()['content-length'];
            if (contentLengthHeader && !isNaN(parseInt(contentLengthHeader))) {
                console.log(parseInt(contentLengthHeader) + '\n');
                networkTracking += parseInt(contentLengthHeader);
            }
        });

        mainPage.on('request', async request => {
            const url = request.url();
            const method = request.method();
            const headers = request.headers();
            const resource = request.resourceType();

            //! && blockRequests
            if(resource != 'document' && resource != 'script'){
                request.abort();
            }else{
                console.log(`Request ${method} ${resource} ${url} with headers ${JSON.stringify(headers)}\n`);
                request.continue();
            }
        })

        //login
        if(workerData.burnerUsername != undefined){
            await mainPage.goto('https://www.facebook.com/', { waitUntil: 'networkidle0' });
            await mainPage.type('#email', workerData.burnerUsername);
            await mainPage.type('#pass', workerData.burnerPassword);
            await mainPage.click('button[name="login"]');
            await mainPage.waitForNavigation();
            console.log(mainPage.url());
            if(mainPage.url() === 'https://www.facebook.com/' || mainPage.url() === 'https://www.facebook.com/?sk=welcome'){
                isLogin = true;
            }else{
                client.channels.cache.get(workerData.channel).send(`Facebook Burner Login Invalid at ${workerData.name}\n@everyone`);
            }
        }

        await mainPage.goto(workerData.link, { waitUntil: 'networkidle0' });

        //set distance
        if(workerData.distance != null && workerData.burnerUsername != undefined){
            await mainPage.click("div.x1y1aw1k div.x1iyjqo2");
            await mainPage.waitForSelector('div.x9f619.x14vqqas.xh8yej3');
            await mainPage.click('div.x9f619.x14vqqas.xh8yej3');
            const Id = await mainPage.$eval('[role="listbox"] div.x4k7w5x > :first-child', el => el.id);
            const distanceButtonId = Id.slice(0, -1) + workerData.distance;
            await mainPage.click('#' + distanceButtonId);
            await mainPage.click('[aria-label="Apply"]');
            await new Promise(r => setTimeout(r, 1000));
        }
    } catch (error){
        console.log("Error with start up: " + error);
    }

    //init burner browser
    let burnerBrowser;
    let burnerPage;
    try{
        //TODO: set rotating proxy
        burnerBrowser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1000, height: 600 },
            args: ['--disable-notifications' `--user-agent=${randomUserAgent}`]
        });
        burnerPage = await burnerBrowser.newPage();

        await burnerPage.setRequestInterception(true);
        //track network consumption
        burnerPage.on('response', (response) => {
            const contentLengthHeader = response.headers()['content-length'];
            if (contentLengthHeader && !isNaN(parseInt(contentLengthHeader))) {
                console.log(parseInt(contentLengthHeader) + '\n');
                networkTracking += parseInt(contentLengthHeader);
            }
        });

        burnerPage.on('request', async request => {
            const url = request.url();
            const method = request.method();
            const headers = request.headers();
            const resource = request.resourceType();

            //! && blockRequests
            if(resource != 'document'){
                request.abort();
            }else{
                console.log(`Request ${method} ${resource} ${url} with headers ${JSON.stringify(headers)}\n`);
                request.continue();
            }
        })

        await burnerPage.goto(workerData.link, { waitUntil: 'networkidle0' });
    }catch (error){
        console.log("Error with setting distance: " + error);
    }

    // Set listingStorage, run once in the begging of the day
    let burnerListingStorage
    let mainListingStorage
    try{
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
                        mainPage = await browser.newPage();
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
            let firstPost = await mainPage.evaluate(() => {
                if(document.querySelector(".xx6bls6") == null){
                    let link = document.querySelector(".x3ct3a4 a").href;
                    let link2 = document.querySelector("div.x139jcc6.x1nhvcw1 > :nth-child(2)").querySelector('a');
                    if(link2 != null){
                        link2 = link2.href;
                        return [link.substring(0, link.indexOf("?")), link2.substring(0, link2.indexOf("?"))];
                    }
                    return [link.substring(0, link.indexOf("?"))];
                }else {
                    return null;
                }
            });
            console.log("First Post Check: " + firstPost);

            if(listingStorage[0] != firstPost[0] && listingStorage[1] != firstPost[0] && firstPost != null){
                listingStorage = firstPost;

                //!both accounts on the same browser
                const newPage = await browser.newPage();
                let isLogin = false;   
                try{
                    await newPage.goto('https://www.facebook.com/', { waitUntil: 'networkidle0' });
                    await newPage.type('#email', workerData.mainUsername);
                    await newPage.type('#pass', workerData.mainPassword);
                    await newPage.click('button[name="login"]');
                    await newPage.waitForNavigation();
                    if(newPage.url() === 'https://www.facebook.com/'){
                        isLogin = true;
                    }else{
                        client.channels.cache.get(workerData.channel).send(`Facebook Main Invalid at ${workerData.name}\n@everyone`);
                    }
                } catch (error){
                    console.log("Error with login: " + error);
                }
                await newPage.goto(firstPost, { waitUntil: 'networkidle0' });

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
                            //author:
                        };
                    })
                    newPage.close();
                } catch(error){
                    console.log("error with item page: " + error)
                }

                try{
                    client.channels.cache.get(workerData.channel).send({ embeds: [new EmbedBuilder()
                        .setColor(0x0099FF)
                        .setTitle(postObj.title + " - " + postObj.price)
                        .setURL(firstPost)
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
            }
            listingStorage = firstPost;

            if(isRunning){
                await mainPage.reload({ waitUntil: 'networkidle0' });
                interval();
            }
        }, Math.floor((Math.random() * (2) + 2) * 60000));
    } 
})();