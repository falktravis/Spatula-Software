const puppeteer = require('puppeteer');
const { workerData } = require('worker_threads');

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.login(process.env.DISCORD_BOT_TOKEN);

(async () => {
    let browser;
    let mainPage;
    let isCreate = true;

    try{
        browser = await puppeteer.launch({ headless: true });
        mainPage = await browser.newPage();
        await mainPage.goto(workerData.link, { waitUntil: 'domcontentloaded' });
    } catch (error){
        console.log("Error with main page: " + error);
    }

    // Set listingStorage, run once in the begging of the day
    let listingStorage;
    try{
        listingStorage = await mainPage.evaluate(() => {
            let link = document.querySelector(".x3ct3a4 a").href;
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
                        await mainPage.goto(workerData.link, { waitUntil: 'domcontentloaded' });
                    } catch (error){
                        console.log("Error with main page: " + error);
                    }
                })();
            }else{
                isCreate = false;
            }
            console.log("isCreate: " + isCreate);
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

    function interval() {
        setTimeout(async () => {
            client.channels.cache.get(workerData.channel).send(workerData.name + " - Interval");
            let firstPost = await mainPage.evaluate(() => {
                let link = document.querySelector(".x3ct3a4 a").href;
                return link.substring(0, link.indexOf("?"));
            });
            console.log("First Post Check: " + firstPost);

            if(listingStorage != firstPost){
                listingStorage = firstPost;

                try{
                    const newPage = await browser.newPage();
                    
                    //login if message is true
                    if(workerData.message){
                        await newPage.goto('https://www.facebook.com/login');
                        await newPage.type('#email', 'falk.travis@gmail.com');
                        await newPage.type('#pass', 'Bru1ns#18');
                        await newPage.click('#loginbutton');
                        
                        // Wait for navigation to user profile page
                        await newPage.waitForNavigation();
                    }

                    await newPage.goto(firstPost, { waitUntil: 'domcontentloaded' });
                    
                    //get message button and click
                    if(workerData.message){
                        const sendMessageButton = await page.$('button[aria-label="Send"][role="button"]');
                        await sendMessageButton.click();
                    }
                    
                    let postObj = await newPage.evaluate(() => {
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
                } catch(error){
                    console.log("error with new page " + error)
                }
            }

            if(isRunning){
                mainPage.reload();
                interval();
            }
        }, Math.floor((Math.random() * (workerData.max - workerData.min) + workerData.min) * 60000));
    } 
})();