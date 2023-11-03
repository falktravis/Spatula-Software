//require
const { workerData } = require('worker_threads');
const puppeteer = require('puppeteer-extra');
const { createCursor } = require("ghost-cursor");
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(stealthPlugin());

//discord.js
/*const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { log } = require('console');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.login(process.env.DISCORD_BOT_TOKEN);*/

//error message send function
const errorMessage = (message, error) => {
    console.log(message + ': ' + error);
}

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

/*let mainChannel;
let logChannel;
client.on('ready', async () => {
    try {
        mainChannel = client.channels.cache.get(workerData.channel);
        if(mainChannel == null){
            mainChannel = await client.channels.fetch(workerData.channel);
        }

        logChannel = discordClient.channels.cache.get('1091532766522376243');
        if(logChannel == null){
            logChannel = await discordClient.channels.fetch('1091532766522376243');
        }
    } catch (error) {
        errorMessage('Error fetching channel', error);
    }
});*/

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
            headless: 'new',
            args: ['--no-sandbox', `--user-agent=Mozilla/5.0 (${platformConverter(workerData.platform)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36`, `--proxy-server=${workerData.proxy}`]
        });
        let pages = await warmingBrowser.pages();
        warmingPage = pages[0];

        //close the notif popup
        const context = itemBrowser.defaultBrowserContext();
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
    //add a friend from suggested list, need somewhat of a strategy for this
    if(randomChance(chance)){
        console.log("add friend");

        //navigate to friend suggestion page
        await warmingCursor.click('a[href="https://www.facebook.com/friends/"]');
        await warmingPage.waitForNavigation({waitUntil: 'networkidle0'});
        await pause(1);

        //check for incoming requests and accept them all
        while(await warmingPage.$('[aria-label="Confirm"]') != null){
            await warmingCursor.click('[aria-label="Confirm"]');
            await pause(1);
        }

        //send additional requests


        if(chance < .5){
            addFriend(chance * 3);
        }else if(chance < .9){
            addFriend(chance * 2);
        }
    }
}

const joinGroup = async() => {
    //find a group to join/apply to, interact with the group a little once we join
    if(randomChance(0.1)){
        console.log("join group");

        //navigate to group discovery page
        await warmingCursor.click('a[href="https://www.facebook.com/groups/?ref=bookmarks"]');
        await pause(1);
        await warmingCursor.click('a[href="/groups/discover/"]');

        //pick a random group to join out of suggested options


        //scroll the element into view with human like procedures
        

        //click on join group

        
        //detect if group is private, if it is, we need to answer the questions and join.
        //Seems we need to test if it is private, if it is we need to assess if we can use chatgpt to apply for it, otherwise just click off
    }
}

const scrollFeed = async() => {
    //pick a feed and scroll through a random amount of post, interacting with a random amount of posts
    if(randomChance(0.95)){
        console.log("scroll feed");

        //navigate to feed page

        //scroll posts into feed as human like as possible

        //for each post, randomize value to interact

        //If post is a fan page(Whatever it means to just be a public page), randomize value to follow it

        //If post is suggested friends, randomize value to add one

        //If post is suggested group, randomize value to join
    }
}

const scrollGroup = async(chance) => {
    //pick a feed and scroll through a random amount of post, interacting with a random amount of posts
    if(randomChance(chance)){
        console.log("scroll group");


        scrollGroup(chance/3);
    }
}

const interactWithPost = async() => {
    //mix of comment, react to/like post, and liking other comments
    //Use chatgpt on the post to generate an accurate comment.
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

    await warmingCursor.click('[aria-label="Create a post"] div.x6umtig');
    await pause(1);

    //set default audience if necessary
    if(await warmingPage.$('[aria-label="Default audience"]') != null){
        await warmingCursor.click('.x1a2a7pz.x1oo3vh0.x1rdy4ex div');
        await pause(1);
        await warmingCursor.click('[aria-label="Done"]');
    }


    //post
    await warmingPage.click('[aria-label="Post"]');

    if(randomChance(chance)){
        console.log("create post");
        createPost(chance/2.5);
    }
}

const changeProfilePic = async() => {
    //get a pic from some api with peoples faces and change pic
    if(randomChance(0.05)){
        console.log("change profile pic");
    }
}

//main function
(async () => {
    //await start();

    let taskArray = [addFriend(0.1), createPost(0.65), scrollGroup(0.75), joinGroup(), scrollFeed(), changeProfilePic()];
    for await(const task of taskArray){
        task;
    }
})();