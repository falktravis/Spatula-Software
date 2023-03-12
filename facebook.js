//require
const puppeteer = require('puppeteer');
const { workerData } = require('worker_threads');

//discord.js
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.login(process.env.DISCORD_BOT_TOKEN);

(async () => {
    let browser;
    let mainPage;
    let isCreate = true;

    //init browser
    try{
        browser = await puppeteer.launch({ headless: true });
        mainPage = await browser.newPage();
        await mainPage.goto(workerData.link, { waitUntil: 'networkidle0' });
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
            client.channels.cache.get(workerData.channel).send(workerData.name + " - Interval");
            let firstPost = await mainPage.evaluate(() => {
                let link = document.querySelector(".x3ct3a4 a").href;
                return link.substring(0, link.indexOf("?"));
            });
            console.log("First Post Check: " + firstPost);

            if(listingStorage != firstPost){
                listingStorage = firstPost;

                const newPage = await browser.newPage();
                let isLogin = false;
                if(workerData.autoMessage){        
                    try{
                        await newPage.goto('https://www.facebook.com/', { waitUntil: 'networkidle0' });
                        //!await newPage.type('#email', 'falk.travis@gmail.com');
                        await newPage.type('#email', workerData.username);
                        //!await newPage.type('#pass', 'Bru1ns#18');
                        await newPage.type('#pass', workerData.password);
                        await newPage.click('button[name="login"]');
                        await newPage.waitForNavigation();
                        //!test
                        if(newPage.url() === 'https://www.facebook.com/'){
                            isLogin = true;
                        }else{
                            client.channels.cache.get(workerData.channel).send(`Facebook Login Invalid at ${workerData.name}\n@everyone`);
                        }
                    } catch (error){
                        console.log("Error with login: " + error);
                    }
                }
                await newPage.goto(firstPost, { waitUntil: 'networkidle0' });

                if(workerData.autoMessage && isLogin){                 
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
                    client.channels.cache.get(workerData.channel).send("@everyone");
                }catch(error){
                    console.log("error with new item message: " + error);
                }
            }

            if(isRunning){
                mainPage.reload();
                interval();
            }
        }, Math.floor((Math.random() * (2) + 2) * 60000));
    } 
})();