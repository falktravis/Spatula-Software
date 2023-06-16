//require
const { workerData, parentPort } = require('worker_threads');
const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(stealthPlugin());

//discord.js
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
client.login(process.env.DISCORD_BOT_TOKEN);

//error message send function
const errorMessage = (message, error) => {
    console.log(message + ': ' + error);
    //client.channels.cache.get('1091532766522376243').send(message + ': ' + error);
    //client.channels.cache.get(workerData.channel).send(message + ': ' + error);
}

//generates a random password
const generateRandomString = (length) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      randomString += characters.charAt(randomIndex);
    }
    
    return randomString;
}

//gets a random first name
const getFirstName = () => {

}

//gets a random last name
const getLastName = () => {

}

//move mouse before interacting
const hoverElement = async (selector) => {
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * (3000 - 1000 + 1)) + 1000));
    const element = await loginPage.$(selector);
    await element.hover();
}

//parentport listener to change proxy on failure

//general instantiation
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
let loginBrowser;
let loginPage;
let loginProxy = workerData.proxy;
let channel;

const createUser = async () => {
    //initiate a browser with random resi proxy and request interception
    try{
        let randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        loginBrowser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1366, height: 768 },
            args: ['--disable-notifications', '--no-sandbox', `--user-agent=${randomUserAgent}`, '--proxy-server=http://proxy.packetstream.io:31112']
        });
        let pages = await loginBrowser.pages();
        loginPage = pages[0];

        //authenticate proxy
        await loginPage.authenticate({ 'username':'grumpypop1024', 'password': `1pp36Wc7ds9CgPSH_country-UnitedStates` });

        //network shit
        await loginPage.setRequestInterception(true);
        loginPage.on('request', async request => {
            const resource = request.resourceType();

            if(resource != 'document' && resource != 'script' && resource != 'xhr' && resource != 'stylesheet'){
                request.abort();
            }else{
                request.continue();
            }
        });

        //go to the search page
        await loginPage.goto('https://www.facebook.com/reg/', { waitUntil: 'networkidle0' });
    }catch(error){
        errorMessage('Error with login page initiation', error);
    }

    //login process
    try{
        let password = generateRandomString(10);//generate password
        console.log(workerData.username + ":" + password);
        hoverElement('[aria-label="First name"]');
        await loginPage.type('[aria-label="First name"]', (workerData.firstName == null ? getFirstName() : workerData.firstName)); //first name
        await loginPage.type('[aria-label="Last name"]', (workerData.lastName == null ? getLastName() : workerData.lastName)); //last name
        await loginPage.type('[aria-label="Mobile number or email"]', workerData.username); //email
        if(await loginPage.$('[aria-label="Re-enter email"]') != null){
            await loginPage.type('[aria-label="Re-enter email"]', workerData.username); //re-enter email
        }
        await loginPage.type('[aria-label="New password"]', password); //password
        await loginPage.select('#month', (Math.floor(Math.random() * 12) + 1).toString()); //birth month
        await loginPage.select('#day', (Math.floor(Math.random() * 29) + 1).toString()); //birth day
        await loginPage.select('#year', (Math.floor(Math.random() * 50) + 1950).toString()); //birth year
        await loginPage.click('[data-name="gender_wrapper"] [value="1"]'); //gender = male
        await loginPage.click('[type="submit"]')//press submit
        await loginPage.waitForNavigation();
    }catch(error){
        errorMessage('Error with login process', error);
    }

    //collect email code from the user
    try{
        /*channel = await client.channels.fetch(workerData.channel);
        await channel.send('Confirmation E-mail sent, get the code and send the numbers as a message in this channel.');

        const collected = await channel.awaitMessages({ max: 1, time: 90000, errors: ['time'] });
        const userResponse = collected.first().content;
        console.log(userResponse);*/

        await loginPage.waitForNavigation();
        console.log("collecting");
        
    }catch(error){
        errorMessage('Error with confimation process', error);
    }

    //finsih login and print login info in proper syntax

    //delete worker
    //self.close();
}
createUser();

