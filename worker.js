const puppeteer = require('puppeteer');
const { workerData } = require('worker_threads');

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.login(process.env.DISCORD_BOT_TOKEN);

(async () => {
    let browser;
    let mainPage;

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
            const posts = Array.from(document.querySelectorAll(".x3ct3a4"));
            return posts.map(post => {
                let link = post.querySelector('a').href;
                return link.substring(0, link.indexOf("?"));
            });
        });
    } catch (error){
        console.log("Error listing storage: " + error);
    }
    console.log(listingStorage);
    console.log(listingStorage.length);

/*
    *Scroll*
    if (await scrollDown(mainPage)){
        //set listing here
    }
    async function scrollDown(page) {
        try{
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await page.waitForFunction(`document.querySelectorAll(".x3ct3a4").length > 25`);
            //gotta be a better way to get this done, lets reduce queries for processing
            return true;    
        } catch (error){
            console.log("Error with scroll: " + error);
        }
    }
*/
    
    //handle time of day stuff
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

    function handleTime() {
        currentTime = new Date();
        currentTime = (currentTime.getHours() * 60) + currentTime.getMinutes();
        let interval;
        if(workerData.start < workerData.end){
            if(isRunning){
                interval = workerData.end - currentTime;
            }else{
                //if before 12 pm interval = workerData.start + 12pm - currentTime
                //else workerData.start - currentTime
            }
        }else{
            if(isRunning){
                //if before 12 pm interval = workerData.start + 12pm - currentTime
                //else workerData.start - currentTime
            }else{
                interval = workerData.end - currentTime;
            }
        }

        setTimeout(() => {

        }, interval * 60000)
    }

    function interval() {
        //maybe cant run two timeouts at once, try setInterval()?
        //that leaves the problem of changing the interval every time
        setTimeout(async () => {
            client.channels.cache.get(workerData.channel).send(workerData.name + " - Interval");
            let newPosts = await mainPage.evaluate(() => {
                let posts = Array.from(document.querySelectorAll(".x3ct3a4"));
                //only return the first 10
                posts = posts.filter((post) => {
                    return posts.indexOf(post) < 10;
                })
                return posts.map(post => {
                    let link = post.querySelector('a').href;
                    return link.substring(0, link.indexOf("?"));
                });
            })
            console.log(newPosts);
            
            for (const post of newPosts) {
                if(!listingStorage.includes(post)){
                    console.log("Post index: " + newPosts.indexOf(post));
                    listingStorage.push(post);

                    try{
                        const newPage = await browser.newPage();
                        await newPage.goto(post, { waitUntil: 'domcontentloaded' });
                        
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
                            .setURL(post)
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
            }
            //await?
            mainPage.reload();
    
            interval();
        }, Math.floor((Math.random() * (workerData.max - workerData.min) + workerData.min) * 60000));
    } 
    interval();
})();