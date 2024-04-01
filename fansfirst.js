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
        mainChannel = client.channels.cache.get('1224149175537635491');
        if(mainChannel == null){
            mainChannel = await client.channels.fetch('1224149175537635491');
        }

        logChannel = client.channels.cache.get('1224149224552267909');
        if(logChannel == null){
            logChannel = await client.channels.fetch('1224149224552267909');
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
const getRandomInterval = () => {
    try {
        const minNumber = 240000; //2 mins
        const maxNumber = 900000; //5 mins
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

let platforms = ['Macintosh; Intel Mac OS X 10_15_7', 'X11; Linux x86_64', 'Windows NT 10.0; Win64; x64']
let startError = false; //stops script on error
let mainBrowser;
let mainPage;
let listingStorage;
let isInitiate = true;

const start = async () => {
    try{

        //initialize the static isp proxy page
        mainBrowser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', `--proxy-server=${workerData.proxy}`],
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
            'Referer': 'https://www.google.com'
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

        //go to the search page
        try {
            await mainPage.goto(workerData.link, { waitUntil: 'domcontentloaded', timeout: 50000});//networkidle2
        } catch (error) {await logChannel.send("Timeout on going to link")}

        
        listingStorage = await getListings();
        console.log("Main Storage: " + listingStorage);
        if(isInitiate){
            interval();
            isInitiate = false;
        }
    }catch(error){
        await logPageContent(mainPage);
        errorMessage('error with start', error);
    }
}

const getListings = async () => {
    try{
        if(startError == false){
            return await mainPage.evalutate(() => {
                document.querySelector("#seatsList > div > div:nth-child(1) > div > button:nth-child(3)").click()
                return parseFloat((document.querySelector("#seatsList > div > ul > div:nth-child(1) > div > div:nth-child(3) > aside").innerText).replace(/[^0-9.]/g, ''))
            })
        }
    }catch (error){
        errorMessage('Error with setting listing storage', error);
    }
}

//the meat and cheese
function interval() {
    setTimeout(async () => {
        //start up a new page with fresh proxy and get listings
        let currentListing = await getListings();

        //newPost is actually new
        if(currentListing < listingStorage){
            console.log("New Post: " + currentListing);

            let data = await mainPage.evaluate(() => {
                return document.querySelector("#seatsList > div > ul > div:nth-child(1) > div > div:nth-child(2) > aside").innerText + "\n" + document.querySelector('#seatsList > div > ul > div:nth-child(1) > div > div.jss824.jss857').innerText
            })
            
            //check for listing deleted and collection error
            try{
                mainChannel.send({ content: "Price Lowered - $" + currentListing, embeds: [new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle("$" + currentListing)
                    .setURL(workerData.link)
                    .setDescription(data)
                    .setTimestamp(new Date())
                ]});
            }catch(error){
                errorMessage('Error with item notification', error);
            }
        }
        
        //set the main listing storage
        if(currentListing != listingStorage){
            listingStorage = currentListing;
        }
        interval();
    }, getRandomInterval());
} 