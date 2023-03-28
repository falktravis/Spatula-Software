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
    let browser;
    let mainPage;
    let isCreate = true;

    //init browser
    try{
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--disable-notifications' `--user-agent=${randomUserAgent}`]
        });
        mainPage = await browser.newPage();
        await mainPage.goto(workerData.link, { waitUntil: 'networkidle0' });
    } catch (error){
        console.log("Error with main page: " + error);
    }

    // Set listingStorage, run once in the begging of the day
    let listingStorage;
    try{
        listingStorage = await mainPage.evaluate(() => {
            let link = document.querySelector("ul.srp-results li.s-item a").href;
            return link.substring(0, link.indexOf("?"));
        });
    } catch (error){
        console.log("Error listing storage: " + error);
    }
    console.log(listingStorage);
    
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
            //checks if the page is within run time
            if(isRunning){
                let firstPost = await mainPage.evaluate(() => {
                    let link = document.querySelector("ul.srp-results li.s-item a").href;
                    return link.substring(0, link.indexOf("?"));
                });
                console.log("First Post Check: " + firstPost);

                //! Change
                if(listingStorage != firstPost){
                    listingStorage = firstPost;

                    let postObj;
                    try{   
                        postObj = await mainPage.evaluate(() => {
                            let dom = document.querySelector("ul.srp-results li.s-item");
                            return {
                                img: dom.querySelector("img").src,
                                title: dom.querySelector(".s-item__title").innerText,
                                condition: dom.querySelector(".s-item__subtitle").innerText,
                                shipping: dom.querySelector(".s-item__shipping").innerText,
                                isAuction: dom.querySelector(".s-item__bids") == null ? "Buy it now" : dom.querySelector(".s-item__bids").innerText,
                                price: dom.querySelector(".s-item__price").innerText
                            };
                        })
                    } catch(error){
                        console.log("error with item page: " + error)
                    }

                    try{
                        client.channels.cache.get(workerData.channel).send({ embeds: [new EmbedBuilder()
                            .setColor(0x0099FF)
                            .setTitle(postObj.title + " - " + postObj.price)
                            .setURL(firstPost)
                            .setAuthor({ name: workerData.name })
                            .addFields(
                                { name: postObj.isAuction, value: postObj.shipping },
                                { name: postObj.condition, value: " " })
                            .setImage(postObj.img)
                            .setTimestamp(new Date())
                        ]});
                        client.channels.cache.get(workerData.channel).send("New Ebay Post From " + workerData.name + " @everyone");
                    }catch(error){
                        console.log("error with new item message: " + error);
                    }
                }

                await mainPage.reload({ waitUntil: 'networkidle0' });
                interval();
            }
        }, Math.floor((Math.random() * (2) + 2) * 60000));
    } 
})();