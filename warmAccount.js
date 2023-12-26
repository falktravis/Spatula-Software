//require
require('dotenv').config();
const { workerData } = require('worker_threads');
const puppeteer = require('puppeteer-extra');
const { createCursor } = require("ghost-cursor");
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(stealthPlugin());

const fetch = require('node-fetch');
const fs = require('fs/promises');

//discord.js
const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { log } = require('console');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.login(process.env.DISCORD_BOT_TOKEN);

//init chatgpt
const OpenAI = require("openai");
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

//convert platform string for a user agent
const platformConverter = (platform) => {
    if(platform === 'Windows'){
        return 'Windows NT 10.0; Win64; x64';
    }else if(platform === 'Linux'){
        return 'X11; Linux x86_64';
    }else if(platform === 'macOS'){
        return 'Macintosh; Intel Mac OS X 10_15_7';
    }
}

let logChannel;
client.on('ready', async () => {
    try {
        /*logChannel = client.channels.cache.get('1091532766522376243');
        if(logChannel == null){
            logChannel = await client.channels.fetch('1091532766522376243');
        }*/
        /*logChannel = client.channels.cache.get(workerData.channel);
        if(logChannel == null){
            logChannel = await client.channels.fetch(workerData.channel);
        }*/
    } catch (error) {
        errorMessage('Error fetching channel', error);
    }
});

//error message send function
const errorMessage = async (message, error) => {
    console.log(message + ': ' + error);
    //await logChannel.send(message + ": " + error);
}

// Function to simulate typing with randomized speed
async function typeWithRandomSpeed(page, text) {
    for (const char of text) {
        // Type a character
        await page.keyboard.type(char, { delay: Math.floor(Math.random() * 100) + 50 });
    }
}

//scrape the html content for testing
const logPageContent = async (page) => {
    try{
        const htmlContent = await page.content();
        const { Readable } = require('stream');
        const htmlStream = Readable.from([htmlContent]);
        logChannel.send({
            files: [
                {
                    attachment: htmlStream,
                    name: 'website.html',
                },
            ],
        });
    }catch(error){
        errorMessage('error loggin content: ', error);
    }
}

//general instantiation
let warmingBrowser;
let warmingPage;
let warmingCursor;

const start = async () => {
    //initiate a browser with random resi proxy and request interception
    try{
        warmingBrowser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', `--user-agent=Mozilla/5.0 (${platformConverter(workerData.platform)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36`, `--proxy-server=${workerData.proxy}`]
        });
        let pages = await warmingBrowser.pages();
        warmingPage = pages[0];

        //close the notif popup
        const context = warmingBrowser.defaultBrowserContext();
        context.overridePermissions("https://www.facebook.com", ["notifications"]);

        //change http headers
        warmingPage.setExtraHTTPHeaders({
            'Referer': 'https://www.facebook.com/login',
            'Sec-Ch-Ua': 'Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114',
            'Sec-Ch-Ua-Full-Version-List': 'Not.A/Brand";v="8.0.0.0", "Chromium";v="114.0.5735.199", "Google Chrome";v="114.0.5735.199',
            'Sec-Ch-Ua-Platform': workerData.platform
        });

        //create cursor
        warmingCursor = createCursor(warmingPage);

        //change the viewport
        warmingPage.setViewport({ width: 1366, height: 768 });

        //Set cookies in browser
        await warmingPage.setCookie(...workerData.cookies);

        //navigate to facebook
        await warmingPage.goto('https://www.facebook.com/', {waitUntil: 'networkidle0'});
    }catch(error){
        errorMessage('Error with page initiation', error);
        await logPageContent(languagePage);
        await warmingBrowser.close();
    }
}

//pause for a random interval to simulate user behavior, magnitude input of 1-3 in order to have longer/shorter pauses
const pause = async (magnitude) => {
    if(magnitude == 1){
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * (1500)) + 500)); //.5s - 2s
    }else if(magnitude == 2){
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * (2000)) + 1000)); // 1s - 3s
    }else{
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * (3000)) + 2000)); //2s - 5s
    }
}

//randomize chance and return a true false variable based on result
const randomChance = (chance) => {
    if(Math.random() < chance){
        return true;
    }else{
        return false;
    }
}

const addFriend = async(chance) => {
    try {
        //add a friend from suggested list, need somewhat of a strategy for this
        //if(randomChance(chance)){
            console.log("add friend");

            //navigate to friend suggestion page
            await warmingCursor.click('a[href="https://www.facebook.com/friends/"]');
            await warmingPage.waitForSelector('[href="/friends/suggestions/"]');
            await pause(1);

            //check for incoming requests and accept them all
            const requests = await warmingPage.$$('[aria-label="Confirm"]');
            for (const request of requests) {
                await warmingCursor.click(request);
                await pause(1);
            }

            //send 1-3 additional requests
            await warmingCursor.click('[href="/friends/suggestions/"]');
            await warmingPage.waitForNavigation();
            await pause(1);
            for(let i = Math.floor(Math.random() * 3); i >= 0; i--){
                const mutualArr = await warmingPage.$$('div.xu06os2 div.x150jy0e');
                if(randomChance(0.90) && mutualArr.length > 0){
                    //send request with mutuals
                    await warmingCursor.click(mutualArr[Math.floor(Math.random() * Math.min(3, mutualArr.length))].parentNode.parentNode);
                    await pause(2);
                    await warmingPage.waitForSelector('[aria-label="Add friend"]');
                    await warmingCursor.click('[aria-label="Add friend"]');
                }else{
                    //send request with no mutuals
                    const accountArr = await warmingPage.$$('div.xb57i2i div.x1rg5ohu > svg');
                    await warmingCursor.click(accountArr[Math.floor(Math.random() * Math.min(10, accountArr.length))].$('[aria-label="Add friend"]'));
                }

                await warmingPage.waitForSelector('[aria-label="Cancel request"]');
            }

            await pause(1);
            await warmingCursor.click('[href="/"]');
        //}
    } catch (error) {
        await errorMessage('Error adding friend', error);
    }
}

//**Works */
const joinGroup = async() => {
    try {
        //find a group to join/apply to, interact with the group a little once we join
        if(randomChance(0.1)){
            console.log("join group");

            //navigate to group discovery page
            await warmingCursor.click('a[href="https://www.facebook.com/groups/?ref=bookmarks"]');
            await pause(1);
            await warmingCursor.click('a[href="/groups/discover/"]');
            await pause(1);

            //get array of suggested groups
            const groups = await warmingPage.$$('[aria-label="Join group"]');

            const pickGroup = async () => {
                //scroll to random element and click on it
                await warmingCursor.click(groups[Math.floor(Math.random() * Math.min(10, groups.length))]);
                await pause(1);
            
                //detect if group is private, if it is, we need to answer the questions and join.
                try {
                    await warmingPage.waitForSelector('[aria-label="Cancel"]');
                    await warmingCursor.click('[aria-label="Cancel"]');
                    await pause(1);
                    await warmingPage.waitForSelector('[aria-label="Exit"]');
                    await warmingCursor.click('[aria-label="Exit"]');
                    await pause(1);
                    await pickGroup();
                } catch (error) {
                    if(await warmingPage.$('[aria-label="Visit group"]') == null && await warmingPage.$('[aria-label="Cancel request"]') == null){
                        await errorMessage('Error clicking join group', error);
                    }
                }
            }
            await pickGroup();

            await pause(1);
            await warmingCursor.click('[href="/"]');
        }
    } catch (error) {
        await errorMessage('Error joining group', error);
    }
}

const scrollFeed = async() => {
    try {
        //pick a feed and scroll through a random amount of post, interacting with a random amount of posts
        if(randomChance(0.90)){
            console.log("scroll feed");

            //scroll a random number of posts 5-20
            for(let i = 1; i < Math.floor(Math.random() * 15 + 8); i++){
                await pause(2);
                //check what kind of container it is
                if(await warmingPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i}) [aria-label="hide post"]`) != null){//post
                    console.log('post');
                    if(randomChance(0.65)){
                        await interactWithPost(i);
                    }
                }else if(await warmingPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i}) [aria-label="Suggested for you"]`) != null){//group suggestions
                    console.log('group suggestions');
                    if(randomChance(0.10)){
                        await warmingCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i}) [aria-label="Suggested for you"] > div > ul > :nth-child(${Math.floor(Math.random() + 1)}) [aria-label="Join group"]`);
                    }
                }else if(await warmingPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i}) [aria-label="Create"]`) != null){//reels
                    console.log('reels');
                }else if(await warmingPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i}) [aria-label="People you may know"]`) != null){//Friend Suggestions
                    console.log('Friend Suggestions');
                    if(randomChance(0.30)){
                        await warmingCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i}) [aria-label="People you may know"] > div > div > :nth-child(${Math.floor(Math.random() * 2 + 2)}) [aria-label="Add friend"]`);
                    }
                }else if(await warmingPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i}) [aria-label="Friend Requests"]`) != null){//Friend Requests
                    console.log('Friend Requests');
                    if(randomChance(0.70)){
                        await warmingCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i}) [aria-label="Friend Requests"] > div > div > :nth-child(${Math.floor(Math.random() * 2 + 2)}) [aria-label="Add friend"]`);//!Fix this
                    }
                }else{
                    console.log("Non-Identified Container");
                }
            }

            await pause(1);
            await warmingCursor.click('[href="/"]');
        }
    } catch (error) {
        await errorMessage('Error scrolling feed', error);
    }
}

const scrollGroup = async(chance) => {
    try {
        //pick a feed and scroll through a random amount of post, interacting with a random amount of posts
        if(randomChance(chance)){
            console.log("scroll group");

            scrollGroup(chance/3);
        }
    } catch (error) {
        await errorMessage('Error scrolling group', error);
    }
}

const interactWithPost = async(childNum) => {
    try {

        //like
        if(randomChance(0.65)){
            await warmingCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) [aria-label="Like"]`);
        }

        //interact with comments
        if(randomChance(0.20)){

        }

        //comment
        /**
         * Posts must have at least (5) comments, and readable text to be used
         * 
         * How do we deal with retweets
         */
        if(await warmingPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) [aria-label="Leave a comment"]`) != null && randomChance(0.15)){
            //Use chatgpt on the post to generate an accurate comment.
            await warmingCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) [aria-label="Leave a comment"]`);
            await pause(1);
            await warmingCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) [aria-label="Write a comment…"]`);
            await pause(1);
            
            //collect text from the post and 5 comments to feed chatgpt in order to generate a good comment
            const chat = await openai.chat.completions.create({
                messages: [{ role: 'user', content: `Imagine you are a middle age person using Facebook to interact with your friends and family. You are looking at a Facebook post that showed up on your feed, the post ${await warmingPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) .x9f619 > div > div > div > div > div > .x1n2onr6 [src*="https://scontent"]`) != null ? 'has' : 'does not have'} a picture, and the text in the post says, "${await warmingPage.evaluate((childNum) => {return document.querySelector(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) .x9f619 > div > div > div > div > div:nth-child(3)`).innerText}, childNum)}". These are some comments that were left on the post: ${}. Write a comment that is similar to the other comments and related to the post. Your comment should be only a sentence long.` }],
                model: 'gpt-3.5-turbo',
            });
            console.log((chat.choices[0].message.content).substring(1, (chat.choices[0].message.content).length - 2));

            await typeWithRandomSpeed(warmingPage, (chat.choices[0].message.content).substring(1, (chat.choices[0].message.content).length - 2));
            await pause(1);
            await warmingCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) [aria-label="Comment"]`);
        }

        //If post is a fan page(Whatever it means to just be a public page), randomize value to follow it
        /*if(await warmingPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) [aria-label="Voice Selector"]`) != null && randomChance(0.15)){

        }*/
        
        //If post is from a recommended group, randomize value to follow
        if(await warmingPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) span.x3nfvp2 .x1fey0fg`) != null && randomChance(0.05)){
            await warmingCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) span.x3nfvp2 .x1fey0fg`);
        }

        //? Add a share opportunity? Lowkey thats not that hard...
    } catch (error) {
        await errorMessage('Error interacting with post', error);
    }
}

const createPost = async(chance) => {
    /**
     * Create a post, sometimes add pictures and sometimes no text
     * 
     * -Get pictures from an api, im thinking unsplash
     * -Use ChatGPT to generate post text, based on an image if necessary. Limit the amount of output text to save money.
     *   +Make a large array of possible prompts, MUST BE VERY GOOD
     *      
     */
    try {
        //if(randomChance(chance)){
            console.log("create post");

            await warmingCursor.click('[aria-label="Create a post"] div.x6umtig');
            await pause(1);
        
            //set default audience if necessary
            if(await warmingPage.$('[aria-label="Default audience"]') != null){
                await warmingCursor.click('.x1a2a7pz.x1oo3vh0.x1rdy4ex div');
                await pause(1);
                await warmingCursor.click('[aria-label="Done"]');
                await pause(1);
            }

            //ask chat gpt to write a prompt
            const chat = await openai.chat.completions.create({
                messages: [{ role: 'user', content: `Imagine you are a middle age person using Facebook to interact with your friends and family. You are happily married with 2 kids, you work a regular 9 to 5 job, you go an a lot of vacations, you ski occasionally, you have 2 dogs and a cat. Write a Facebook post about something that could be going on in your life right now. Your post should be no more than 300 characters in length.` }],
                model: 'gpt-3.5-turbo',
            });
            console.log((chat.choices[0].message.content).substring(1, (chat.choices[0].message.content).length - 2));

            //click text box
            await warmingCursor.click('div.x1ed109x > div.xg7h5cd.x1pi30zi');
            await pause(1);

            //type 
            await typeWithRandomSpeed(warmingPage, (chat.choices[0].message.content).substring(1, (chat.choices[0].message.content).length - 2));
            await pause(2);

            //post
            if(await warmingPage.$('[aria-label="Next"]') != null)
            {
                await warmingCursor.click('[aria-label="Next"]');
                await pause(1);
            }
            
            if(await warmingPage.$('[aria-label="Post"]') == null){
                await warmingPage.waitForSelector('[aria-label="Post"]');
            }
            await warmingCursor.click('[aria-label="Post"]');
        //}
    } catch (error) {
        await errorMessage('Error creating post', error);
    }
}

//**Works */
const changeProfilePic = async() => {
    try {
        //get a pic from some api with peoples faces and change pic
        if(randomChance(0.02)){

            // Navigate to the account settings page
            await warmingCursor.click('[aria-label="Your profile"]');
            await pause(1);
            await warmingCursor.click('[href="/me/"]');
            await warmingPage.waitForSelector('[aria-label="Update profile picture"]');
            await pause(2);
        
            // Upload the photo (assuming there's an input field for it)
            await warmingCursor.click('[aria-label="Update profile picture"]');
            await warmingPage.waitForSelector('[role="dialog"] input[type="file"]');
            await pause(1);
            const fileInput = await warmingPage.$('[role="dialog"] input[type="file"]');

            const response = await fetch('https://api.unsplash.com/photos/random', {
                headers: {
                    'Authorization': `Client-ID 7PvN13wlYr41F2_p7FAv_yGoCIdJzUKPNE2NDkoaApQ`
                }
            });
            const data = await response.json();
            const photo = await fetch(data.urls.full);
            const buffer = await photo.buffer();
            const destination = `./${response.id}`;
            await fs.writeFile(destination, buffer);
            await fileInput.uploadFile(destination);

            //await upload
            await warmingPage.waitForSelector('[aria-label="Save"]'); // Adjust the timeout as needed
            await warmingCursor.click('[aria-label="Save"]');

            await fs.unlink(destination);

            await pause(1);
            await warmingCursor.click('[href="/"]');
        }
    } catch (error) {
        await errorMessage('Error changing profile pic', error);
    }
}

//main function
(async () => {
    try {
        await start();
        await createPost();
        //await addFriend(1);

        /*let taskArray = [() => addFriend(0.1), () => createPost(0.60), () => scrollGroup(0.75), joinGroup, scrollFeed, changeProfilePic];
        for (let i = taskArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [taskArray[i], taskArray[j]] = [taskArray[j], taskArray[i]];
        }
        for await(const task of taskArray){
            await task();
        }

        await warmingBrowser.close();*/
        console.log('finish');
    } catch (error) {
        await errorMessage('Error with main function', error);
    }
})();