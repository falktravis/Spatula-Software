//require
const { workerData, parentPort } = require('worker_threads');
const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(stealthPlugin());

//discord.js
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.login(process.env.DISCORD_BOT_TOKEN);

//Closes browsers before terminating the task with ebay-delete command
parentPort.on('message', async (message) => {
    if(message.action === 'closeBrowsers') {
        console.log('close browser');
        await browser.close();

        parentPort.postMessage({action: 'terminate', proxy: proxy});
    }else if(message.action === 'newProxy'){

        //set new proxy
        proxy = message.burnerProxy;

        //restart burner account page
        await browser.close();
        start();
    }
});

//error message send function
const errorMessage = (message, error) => {
    console.log(message + ': ' + error);
    client.channels.cache.get('1091532766522376243').send(message + ': ' + error);
    client.channels.cache.get(workerData.channel).send(message + ': ' + error);
}

const setListingStorage = async () => {
    try{
        if(await mainPage.$('ul.srp-results > :nth-child(1) a') == null){
            postChildStartNum = 3;
            console.log("Weird child number shift thing");
        }

        listingStorage = await mainPage.evaluate((num) => {
            let link = document.querySelector(`ul.srp-results > :nth-child(${num}) a`).href;
            let link2 = document.querySelector(`ul.srp-results > :nth-child(${num + 1}) a`).href;
            return [link.substring(0, link.indexOf("?")), link2.substring(0, link2.indexOf("?"))];
        }, postChildStartNum);
    } catch (error){
        errorMessage('Error setting listing storage', error);
    }
}

const sendNotification = async (postNum) => {
    let postObj;
    try{   
        postObj = await mainPage.evaluate((num) => {
            let dom = document.querySelector(`ul.srp-results > :nth-child(${num})`);//ul.srp-results li.s-item
            return {
                img: dom.querySelector("img").src,
                title: dom.querySelector(".s-item__title").innerText,
                condition: dom.querySelector(".s-item__subtitle").innerText,
                shipping: dom.querySelector(".s-item__shipping").innerText,
                isAuction: dom.querySelector(".s-item__bids") == null ? "Buy it now" : dom.querySelector(".s-item__bids").innerText,
                price: dom.querySelector(".s-item__price").innerText,
                link: dom.querySelector('a').href
            };
        }, postNum)
    } catch(error){
        errorMessage('Error collecting post data', error);
    }

    try{
        client.channels.cache.get(workerData.channel).send({ embeds: [new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(postObj.title + " - " + postObj.price)
            .setURL(postObj.link)
            .setAuthor({ name: workerData.name })
            .addFields(
                { name: postObj.isAuction, value: postObj.shipping },
                { name: postObj.condition, value: " " })
            .setImage(postObj.img)
            .setTimestamp(new Date())
        ]});
        client.channels.cache.get(workerData.channel).send("New Ebay Post From " + workerData.name + " @everyone");
    }catch(error){
        errorMessage('Error sending Ebay notification', error);
    }
}

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
let browser;
let mainPage;
let newPost;
let listingStorage;
let proxy = workerData.proxy;
let postChildStartNum = 2;

const start = async () => {
    //init browser
    try{
        browser = await puppeteer.launch({ 
            headless: false,
            args: ['--disable-notifications', '--no-sandbox', `--user-agent=${randomUserAgent}`, `--proxy-server=${proxy}`]
        });
        let pages = await browser.pages();
        mainPage = pages[0];

        //authenticate proxy
        //await mainPage.authenticate({ 'username':'falktravis', 'password': proxy });

        //track network consumption and block the bull shit
        await mainPage.setRequestInterception(true);
        mainPage.on('request', async request => {
            const resource = request.resourceType();
            if(resource != 'document'){
                request.abort();
            }else{
                request.continue();
            }
        });
    } catch (error){
        errorMessage('Error launching browser', error);
    }

    try {
        await mainPage.goto(workerData.link, { waitUntil: 'domcontentloaded' });
    } catch (error) {
        console.log("Proxy error");
    }

    await setListingStorage();
    console.log(listingStorage);
}
start();

//the meat and cheese
function interval() {
    setTimeout(async () => {
        //checks if the page is within run time
        try{
            await mainPage.reload({ waitUntil: 'domcontentloaded' });

            newPost = await mainPage.evaluate(() => {
                let link = document.querySelector("ul.srp-results li.s-item a").href;
                return link.substring(0, link.indexOf("?"));
            });
            console.log("First Post Check: " + newPost);
        }catch(error){
            errorMessage('Error checking for new post', error);
        }

        if(listingStorage[0] != newPost && listingStorage[1] != newPost){
            let postNum = postChildStartNum;
            while(listingStorage[0] != newPost && listingStorage[1] != newPost && postNum <= 30){
                await sendNotification(postNum);

                postNum++;
                try {
                    newPost = await mainPage.evaluate((num) => {
                        let link = document.querySelector(`ul.srp-results > :nth-child(${num}) a`).href;
                        return link.substring(0, link.indexOf("?"));
                    }, postNum);
                } catch (error) {
                    errorMessage('Error re-setting new post', error);
                }
            }

            //Check for a post hard cap
            if(postNum > 30){
                client.channels.cache.get(workerData.channel).send("Too many new posts to notify, I honestly have no idea how you did this it should be impossible, make your query more specific");
            }

            await setListingStorage();
        }
        else if(listingStorage[0] != newPost && listingStorage[1] == newPost){
            try{
                listingStorage = [newPost, await mainPage.evaluate(() => {
                    let link2 = document.querySelector(`ul.srp-results > :nth-child(${postChildStartNum + 1}) a`).href;
                    return link2.substring(0, link2.indexOf("?"));
                })];
            }catch(error){
                errorMessage('Error re-setting listing storage on first post deletion', error);
            }
        }
        interval();
    }, Math.floor((Math.random() * (2) + 3) * 60000));
} 
interval();