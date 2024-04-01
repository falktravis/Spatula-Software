const { workerData, parentPort } = require('worker_threads');
const puppeteer = require('puppeteer-extra');
const { createCursor } = require("ghost-cursor");
const stealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(stealthPlugin());
const fs = require('fs/promises');

//discord.js
const { Client, GatewayIntentBits, EmbedBuilder} = require('discord.js');
const { get } = require('http');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.login(process.env.DISCORD_BOT_TOKEN);

//Closes browsers before terminating the task with facebook-delete command
parentPort.on('message', async (message) => {
    if(message.action === 'closeBrowsers') {
        await endTask();
    }
});

let logChannel;
let mainChannel;
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
    await start();
});

// Add cleanup logic on uncaught exception
process.on('uncaughtException', async (err) => {
    await logChannel.send('Uncaught Exception in ' + workerData.name + ': ' + err);
});

// Add cleanup logic on unhandled promise rejection
process.on('unhandledRejection', async (reason, promise) => {
    await logChannel.send('Unhandled Rejection in ' + workerData.name + ':' + reason);
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
        if(mainBrowser != null){
            await mainPage.close();
            await mainBrowser.close();
            mainBrowser = null;
        }
        parentPort.postMessage("Success");
    } catch (error) {
        errorMessage("Error closing browser: ", error);
    }
}

//randomize time till post check
const getRandomInterval = () => { //!Come back to this and change times
    try {
        const minNumber = 300000; //5 mins
        const maxNumber = 600000; //10 mins
        const power = 1.5;
        const random = Math.random();
        const range = maxNumber - minNumber;
        const number = minNumber + Math.pow(random, power) * range;
        return Math.round(number);
    } catch (error) {
        errorMessage('error getting random interval', error);
    }
}

const getProxy = async () => {

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

let platforms = ['Macintosh; Intel Mac OS X 10_15_7', 'X11; Linux x86_64', 'Windows NT 10.0; Win64; x64']
let startError = false; //stops script on error
let mainBrowser;
let mainPage;
let listingStorage;
let isInitiation = true;
let proxy;

const start = async () => {
    try{
        proxy = await getProxy();

        //initialize the static isp proxy page
        mainBrowser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', `--proxy-server=${proxy}`],
            timeout: 60000
        });
        let pages = await mainBrowser.pages();
        mainPage = pages[0];

        //change the viewport
        mainPage.setViewport({ width: 1366, height: 768 });

        //change http headers
        let UAPlatform = platforms[Math.floor(Math.random() * 2)];
        mainPage.setUserAgent(`Mozilla/5.0 (${UAPlatform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36`);
        mainPage.setExtraHTTPHeaders({
            'Sec-Ch-Ua': 'Not.A/Brand";v="8", "Chromium";v="121", "Google Chrome";v="121',
            'SEC-CH-UA-ARCH': '"x86"',
            'Sec-Ch-Ua-Full-Version': "121.0.6167.185",
            'SEC-CH-UA-MOBILE':	'?0',
            'Sec-Ch-Ua-Platform': `"${UAPlatform}"`,
            'SEC-CH-UA-PLATFORM-VERSION': '15.0.0',
            'Referer': 'https://www.facebook.com/login'
        });

        //network shit
        mainPage.on('response', async response => {
            try {
                //detect redirection
                if ([300, 301, 302, 303, 307, 308].includes(response.status())) {
                    const redirectURL = response.headers()['location'];
                    if(await redirectURL.split('?')[0] != (workerData.link).split('?')[0]){
                        console.log(`Redirected to: ${redirectURL}`);
                        logChannel.send(`${workerData.name} redirected to: ${redirectURL}`);
                        startError = true; 
                    }
                }
            }catch (error) {
                errorMessage("Error with handling network response", error);
            }
        });

        await mainPage.setRequestInterception(true);
        mainPage.on('request', async request => {
            const resource = request.resourceType();
            if(resource != 'document'){
                request.abort();
            }else{
                request.continue();
            }
        });

        //use cookie to set distance if task is for offerup
        if(workerData.platform == 'Offerup'){
            await mainPage.setCookies(...[{
                "domain": "offerup.com",
                "hostOnly": true,
                "httpOnly": false,
                "name": "ou.location",
                "path": "/",
                "sameSite": "strict",
                "secure": false,
                "session": true,
                "storeId": null,
                "value": `{%22%2C%22zipCode%22:%22${workerData.zipcode}%22%2C%22source%22:%22zipcode%22}`
            }])
        }

        //go to the search page
        try {
            await mainPage.goto(workerData.link, { waitUntil: 'domcontentloaded', timeout: 50000});//networkidle2
        } catch (error) {await logChannel.send("Timeout on going to link")}

        if(isInitiation){
            listingStorage = await getListings();
            interval();
            console.log("Main Storage: " + listingStorage);
            isInitiation = false;
        }

    }catch(error){
        await logPageContent(mainPage);
        errorMessage('error with start', error);
    }
}

const getListings = async () => {
    try{
        if(startError == false){
            if(workerData.platform == "Ebay"){
                return await mainPage.evaluate(() => {

                });
            }else if(workerData.platform == "Craigslist"){
                return await mainPage.evaluate(() => {

                });
            }else if(workerData.platform == "Offerup"){
                return await mainPage.evaluate(() => {

                });
            }
        }
    }catch (error){
        errorMessage('Error with setting listing storage', error);
    }
}

//the meat and cheese
function interval() {
    setTimeout(async () => {

        //start up a new page with fresh proxy and get listings
        await start();
        let currentListings = await getListings();
        let newPost = currentListings[0];
        let postNum = 1;

        //newPost is actually new
        while(!listingStorage.includes(newPost) && postNum  <= 20 && newPost != null){
            console.log("New Post: " + newPost + " post num: " + postNum);

            //collect post data
            let postObj;
            try {
                let itemPage = await mainBrowser.newPage();
                await itemPage.goto(newPost, { waitUntil: 'domcontentloaded', timeout: 50000});//networkidle2

                //check if there is another listing that exists
                if(workerData.platform == "Ebay"){
                    postObj = await itemPage.evaluate(() => {

                    })
                }else if(workerData.platform == "Craigslist"){
                    postObj = await itemPage.evaluate(() => {

                    })
                }else if(workerData.platform == "Offerup"){
                    postObj = await itemPage.evaluate(() => {

                    })
                }
            } catch (error) {
                errorMessage('Error collecting post data', error);
            }
            
            //check for listing deleted and collection error
            if(postObj != null){
                //manage description
                if(postObj?.description != null){
                    if(postObj?.description.length > 700){
                        postObj.description = (postObj?.description)?.substring(0, 700) + '...';
                    }
                }

                try{
                    mainChannel.send({ content: "$" + postObj.price + " - " + postObj.title, embeds: [new EmbedBuilder()
                        .setColor(0x0099FF)
                        .setTitle("$" + postObj.price + " - " + postObj.title)
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
            }

            //Update newPost
            postNum++;
            try {
                //check if there is another listing that exists
                if(workerData.platform == "Ebay"){
                    newPost = await mainPage.evaluate((num) => {
                        let link = document.querySelector(`div.x1xfsgkm > :nth-child(1) div > :nth-child(${num}) a`)?.href;
                        return link?.substring(0, link?.indexOf("?"));
                    }, postNum);
                }else if(workerData.platform == "Craigslist"){
                    newPost = await mainPage.evaluate((num) => {
                        let link = document.querySelector(`div.x1xfsgkm > :nth-child(1) div > :nth-child(${num}) a`)?.href;
                        return link?.substring(0, link?.indexOf("?"));
                    }, postNum);
                }else if(workerData.platform == "Offerup"){
                    newPost = await mainPage.evaluate((num) => {
                        let link = document.querySelector(`div.x1xfsgkm > :nth-child(1) div > :nth-child(${num}) a`)?.href;
                        return link?.substring(0, link?.indexOf("?"));
                    }, postNum);
                }
            } catch (error) {
                errorMessage('Error re-setting new post', error);
            }

            //ping the user
            await mainChannel.send("New Notifications @everyone");

            //set the main listing storage
            listingStorage = currentListings;
        }
        interval();
    }, getRandomInterval());
} 