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
    let browser;
    let mainPage;
    let isCreate = true;
    let networkTracking = 0;
    let newPost;

    const start = async() => {
        //init browser
        try{
            browser = await puppeteer.launch({ 
                headless: true,
                args: ['--disable-notifications', `--user-agent=${randomUserAgent}`]
            });
            let pages = await browser.pages();
            mainPage = pages[0];

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

                if(resource != 'document'){
                    request.abort();
                }else{
                    request.continue();
                }
            })

            await mainPage.goto(workerData.link, { waitUntil: 'networkidle0' });
            console.log(`Response received: ${networkTracking} bytes`);
        } catch (error){
            console.log("Error with main page: " + error);
        }

        // Set listingStorage, run once in the begging of the day
        let listingStorage;
        try{
            listingStorage = await mainPage.evaluate(() => {
                let link = document.querySelector("ul.srp-results li.s-item a").href;
                let link2 = document.querySelector("ul.srp-results > :nth-child(3)").querySelector('a').href;
                return [link.substring(0, link.indexOf("?")), link2.substring(0, link2.indexOf("?"))];
            });
        } catch (error){
            console.log("Error listing storage: " + error);
        }
        console.log(listingStorage);
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
                        await start();
                    } catch (error){
                        console.log("Error with main page: " + error);
                    }
                })();
            }else{
                isCreate = false;
            }
            intervalFunction(); 
        }else{
            browser.close();
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
                await mainPage.reload({ waitUntil: 'networkidle0' });
                console.log(`Response received: ${networkTracking} bytes`);

                newPost = await mainPage.evaluate(() => {
                    let link = document.querySelector("ul.srp-results li.s-item a").href;
                    return link.substring(0, link.indexOf("?"));
                });
                console.log("First Post Check: " + newPost);

                if(listingStorage[0] != newPost && listingStorage[1] != newPost){
                    listingStorage = [newPost, listingStorage[0]];

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
                            .setURL(newPost)
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
                else if(listingStorage[0] != newPost && listingStorage[1] == newPost){
                    listingStorage = await mainPage.evaluate(() => {
                        let link2 = document.querySelector("ul.srp-results > :nth-child(3)").querySelector('a').href;
                        return [newPost, link2.substring(0, link2.indexOf("?"))];
                    });
                }
                interval();
            }
        }, Math.floor((Math.random() * (2) + 2) * 60000));
    } 
})();