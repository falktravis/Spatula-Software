//require
require('dotenv').config();
const { workerData, parentPort } = require('worker_threads');
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

//manipulating metadata
const exiftool = require('node-exiftool');
const exiftoolBin = require('dist-exiftool');
const ep = new exiftool.ExiftoolProcess(exiftoolBin);
const overWriteMetadata = async (destination) => {
    const date = new Date(Date.now() - Math.floor(Math.random() * 86400000 * 365));
    const model = Math.floor(Math.random() * 2) + 13;
    // Add more fields as needed
    const metadata = {
        'Make': 'Apple',
        'Model': `iPhone ${model}`,
        'Lens': `iPhone ${model} back dual wide camera 5.7mm f/1.5`,
        'FocalLength': '5.7 mm',
        'Aperture': (Math.random() * (2.8 - 1) + 1).toFixed(1),
        'Exposure': `1/${Math.floor(Math.random() * (500 - 1) + 1)}`,
        'ISO': 160,
        'Flash': 'Auto, Did not fire',
        'AccelerationVector': '-1.002320409 0.008560923856 0.04708275201',
        'AuxiliaryImageType': 'urn:com:apple:photo:2020:aux:hdrgainmap',
        'AverageFrameRate': 0,
        'BitDepthChroma': 8,
        'BitDepthLuma': 8,
        'BlueMatrixColumn': '0.1571 0.06657 0.78407',
        'BrightnessValue': Math.random() * 5,
        'CMMFlags': 'Not Embedded, Independent',
        'ChromaFormat': '4:2:0',
        'ChromaticAdaptation': '1.04788 0.02292 -0.0502 0.02959 0.99048 -0.01706 -0.00923 0.01508 0.75168',
        'CircleOfConfusion': '0.002 mm',
        'ColorSpace': 'Uncalibrated',
        'ColorSpaceData': 'RGB',
        'CompatibleBrands': ['mif1', 'MiHE', 'MiPr', 'miaf', 'MiHB', 'heic'],
        'CompositeImage': 'General Composite Image',
        'ConnectionSpaceIlluminant': '0.9642 1 0.82491',
        'ConstantFrameRate': 'Unknown',
        'ConstraintIndicatorFlags': '176 0 0 0 0 0',
        'CreateDate': date,
        'DateTimeOriginal': date,
        'DeviceAttributes': 'Reflective, Glossy, Positive, Color',
        'DeviceManufacturer': 'Apple Computer Inc.',
        'DigitalZoomRatio': 3.43246311,
        'ExifByteOrder': 'Big-endian (Motorola, MM)',
        'ExifImageHeight': 3024,
        'ExifImageWidth': 4032,
        'ExifVersion': '0232',
        'ExposureCompensation': 0,
        'ExposureMode': 'Auto',
        'ExposureProgram': 'Program AE',
        'FNumber': 1.5,
        'FOV': '23.1 deg',
        'FileAccessDate': '2024-02-13 19:25:23 +0000',
        'FileInodeChangeDate': '2024-02-13 19:25:23 +0000',
        'FileModifyDate': '2024-02-13 19:25:23 +0000',
        'FilePermissions': 'prw-------',
        'FileSize': '0 bytes',
        'FileType': 'HEIC',
        'FileTypeExtension': 'heic',
        'FocalLength35efl': '5.7 mm (35 mm equivalent: 88.0 mm)',
        'FocalLengthIn35mmFormat': '88 mm',
        'FocusDistanceRange': '0.15 - 0.46 m',
        'GenProfileCompatibilityFlags': 'Main Still Picture, Main 10, Main',
        'GeneralLevelIDC': '90 (level 3.0)',
        'GeneralProfileIDC': 'Main Still Picture',
        'GeneralProfileSpace': 'Conforming',
        'GeneralTierFlag': 'Main Tier',
        'GreenMatrixColumn': '0.29198 0.69225 0.04189',
        'HEVCConfigurationVersion': 1,
        'HandlerType': 'Picture',
        'HostComputer': `iPhone ${model}`,
        'HyperfocalDistance': '11.13 m',
        'ImageHeight': 3024,
        'ImagePixelDepth': 8,
        'ImageSize': '4032x3024',
        'ImageSpatialExtent': '4032x3024',
        'ImageWidth': 4032,
        'LensID': `iPhone ${model} back dual wide camera 5.7mm f/1.5`,
        'LensInfo': '1.539999962-5.7mm f/1.5-2.4',
        'LensMake': 'Apple',
        'LensModel': `iPhone ${model} back dual wide camera 5.7mm f/1.5`,
        'LightValue': 6.1,
        'MIMEType': 'image/heic',
        'MajorBrand': 'High Efficiency Image Format HEVC still image (.HEIC)',
        'MediaDataOffset': 3752,
        'MediaDataSize': 884274,
        'MediaGroupUUID': 'EE718457-727B-4B90-B1E9-5518B8CB8CBF',
        'MediaWhitePoint': '0.96419 1 0.82489',
        'Megapixels': 12.2,
        'MetaImageSize': '4032x3024',
        'MeteringMode': 'Multi-segment',
        'MinSpatialSegmentationIDC': 0,
        'MinorVersion': '0.0.0',
        'ModifyDate': date,
        'NumTemporalLayers': 1,
        'OffsetTime': '-05:00',
        'OffsetTimeDigitized': '-05:00',
        'OffsetTimeOriginal': '-05:00',
        'Orientation': 'Horizontal (normal)',
        'ParallelismType': 0,
        'PrimaryItemReference': 49,
        'PrimaryPlatform': 'Apple Computer Inc.',
        'ProfileCMMType': 'Apple Computer Inc.',
        'ProfileClass': 'Display Device Profile',
        'ProfileConnectionSpace': 'XYZ',
        'ProfileCopyright': 'Copyright Apple Inc., 2022',
        'ProfileCreator': 'Apple Computer Inc.',
        'ProfileDateTime': '2022-01-01 00:00:00 +0000',
        'ProfileDescription': 'Display P3',
        'ProfileFileSignature': 'acsp',
        'ProfileID': 'ecfda38e388547c36db4bd4f7ada182f',
        'ProfileVersion': '4.0.0',
        'RedMatrixColumn': '0.51512 0.2412 -0.00105',
        'RenderingIntent': 'Perceptual',
        'ResolutionUnit': 'inches',
        'Rotation': 0,
        'RunTimeEpoch': 0,
        'RunTimeFlags': 'Valid',
        'RunTimeScale': 1000000000,
        'RunTimeSincePowerUp': '16 days 3:59:30',
        'RunTimeValue': 1396770404182625,
        'ScaleFactor35efl': 15.4,
        'SceneType': 'Directly photographed',
        'SensingMethod': 'One-chip color area',
        'ShutterSpeed': '1/50',
        'ShutterSpeedValue': '1/50',
        'Software': '17.2.1',
        'SubSecCreateDate': date,
        'SubSecDateTimeOriginal': date,
        'SubSecModifyDate': date,
        'SubSecTimeDigitized': 572,
        'SubSecTimeOriginal': 572,
        'SubjectArea': '2009 1502 2321 1317',
        'TemporalIDNested': 'No',
        'WhiteBalance': 'Auto',
        'XMPToolkit': 'XMP Core 6.0.0',
        'XResolution': 72,
        'YResolution': 72
    };

    //change actual picture data
    await ep.open();
    await ep.writeMetadata(destination, metadata, ['overwrite_original']);
    await ep.close();
}

let logChannel;
client.on('ready', async () => {
    try {
        logChannel = client.channels.cache.get('1196915422042259466');
        if(logChannel == null){
            logChannel = await client.channels.fetch('1196915422042259466');
        }
    } catch (error) {
        errorMessage('Error fetching channel', error);
    }
});

//error message send function
const errorMessage = async (message, error) => {
    console.log(message + ': ' + error);
    await logChannel.send(message + ": " + error);
}

// Add cleanup logic on uncaught exception
process.on('uncaughtException', async (err) => {
    await logChannel.send('Uncaught Exception in ' + workerData.name + ': ' + err);
    if(warmingBrowser != null){
        await warmingPage.close();
        await warmingBrowser.close();
    }
    process.exit(1); // Terminate the process
});

// Add cleanup logic on unhandled promise rejection
process.on('unhandledRejection', async (reason, promise) => {
    await logChannel.send('Unhandled Rejection in ' + workerData.name + ':' + reason);
    if(warmingBrowser != null){
        await warmingPage.close();
        await warmingBrowser.close();
    }
    process.exit(1); // Terminate the process
});

// Function to simulate typing with randomized speed
async function typeWithRandomSpeed(page, text) {
    for (const char of text) {
        // Increase pause for punctuation
        if(char == '!' || char == '.' || char == '?'){
            await page.keyboard.type(char, { delay: Math.floor(Math.random() * 150) + 150 });
        }else{
            await page.keyboard.type(char, { delay: Math.floor(Math.random() * 150) + 60 });
        }
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
        const context = warmingBrowser.defaultBrowserContext();
        context.overridePermissions("https://www.facebook.com", ["notifications"]);

        //detect redirects
        //await warmingPage.setRequestInterception(true);
        warmingPage.on('response', async response => {
            //detect redirection
            if ([300, 301, 302, 303, 307, 308].includes(response.status())) {
                const redirectURL = response.headers()['location'];
                console.log(`Redirected to: ${redirectURL}`);

                if(await warmingPage.$('[aria-label="Dismiss"]') != null){
                    await pause(2);
                    await warmingCursor.click('[aria-label="Dismiss"]');
                }
            }
        });

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
        
        //detect accounts that need login
        const language = await warmingPage.evaluate(() => {return document.documentElement.lang});
        if (language !== 'en') {
            logChannel.send("language wrong: " + workerData.username);
            return false;
        }else if(await warmingPage.$('[name="login"]') != null){
            logChannel.send("account is fucked: " + workerData.username);
            return false;
        }else{
            parentPort.postMessage({cookies: await warmingPage.cookies()});
            return true;
        }
    }catch(error){
        errorMessage('Error with page initiation', error);
        await logPageContent(warmingPage);
        await warmingPage.close();
        await warmingBrowser.close();
        warmingBrowser = null;
    }
}

//pause for a random interval to simulate user behavior, magnitude input of 1-3 in order to have longer/shorter pauses
const pause = async (magnitude) => {
    if(magnitude == 1){
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * (1500)) + 500)); //.5s - 2s
    }else if(magnitude == 2){
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * (1500)) + 2000)); // 2s - 3.5s
    }else{
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * (3000)) + 3000)); //3s - 6s
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
        if(randomChance(chance)){
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
            await warmingPage.waitForSelector();
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
        }
    } catch (error) {
        await errorMessage('Error adding friend', error);
        await logPageContent(warmingPage);

        //navigate back to the home page for the next tasks
        await pause(2);
        await warmingCursor.click('[href="/"]');
    }
}

const joinGroup = async(chance) => {
    try {
        //find a group to join/apply to, interact with the group a little once we join
        if(randomChance(chance)){
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
                await warmingCursor.click(groups[Math.floor(Math.random() * Math.min(10, groups.length) + 1)]);
                await pause(1);
            
                //detect if group is private, if it is, we need to answer the questions and join.
                try {
                    
                    await warmingPage.waitForSelector('[aria-label="Answer questions"]');
                    if(await warmingPage.$('[aria-label="Cancel"]') != null){
                        await warmingCursor.click('[aria-label="Cancel"]');
                    }else{
                        await warmingCursor.click('[aria-label="Not now"]');
                    }
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
        await logPageContent(warmingPage);
        
        //navigate back to the home page for the next tasks
        await pause(2);
        await warmingCursor.click('[href="/"]');
    }
}

//**Works for now */
const scrollFeed = async() => {
    try {
        //pick a feed and scroll through a random amount of post, interacting with a random amount of posts
        if(randomChance(1)){//?Maybe Change this to like 0.95 at some point if we start doing volume
            console.log("scroll feed");

            await warmingPage.waitForSelector('div.x1hc1fzr.x1unhpq9 > div > div > div');
            if(await warmingPage.$('[aria-label="Find friends"]') == null){
                await pause(3);
                await joinGroup(1);
            }

            if(await warmingPage.$('[aria-label="Find friends"]') == null){//!delete this if statement when join group officially works
                //scroll a random number of posts 5-20
                for(let i = 1; i < Math.floor(Math.random() * 15 + 8); i++){
                    await pause(3);
                    //scroll into view
                    await warmingPage.waitForSelector(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i})`);
                    await warmingPage.evaluate(i => {
                        const element = document.querySelector(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i})`);
                        element.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                            inline: 'center',
                        });
                    }, i);

                    //check what kind of container it is
                    if(await warmingPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i}) [aria-label="hide post"]`) != null){//post
                        await logChannel.send('post');
                        await interactWithPost(i);
                    }else if(await warmingPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i}) [aria-label="Suggested for you"]`) != null){//!group suggestions
                        await logChannel.send('group suggestions');
                        /*if(randomChance(0.10)){
                            await logChannel.send('it hits');
                            await warmingCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i}) [aria-label="Suggested for you"] > div > ul > :nth-child(${Math.floor(Math.random() + 1)}) [aria-label="Join group"]`);
                        }*/
                    }else if(await warmingPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i}) [aria-label="Create"]`) != null){//reels
                        await logChannel.send('reels');
                    }else if(await warmingPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i}) [aria-label="People you may know"]`) != null){//Friend Suggestions
                        await logChannel.send('Friend Suggestions');
                        /*if(randomChance(0.30)){
                            await logChannel.send('it hits');
                            await warmingCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i}) [aria-label="People you may know"] > div > div > :nth-child(${Math.floor(Math.random() * 2 + 2)}) [aria-label="Add friend"]`);
                        }*/
                    }else if(await warmingPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i}) [aria-label="Friend Requests"]`) != null){//Friend Requests
                        await logChannel.send('Friend Requests');
                        //TODO: Find this component and fix, loop through each request and very high random chance to add
                        await warmingCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i}) [aria-label="Friend Requests"] > div > div > :nth-child(${Math.floor(Math.random() * 2 + 2)}) [aria-label="Add friend"]`);
                    }else{
                        await logChannel.send("Non-Identified Container");
                    }
                }

                await pause(2);
                await warmingCursor.click('[href="/"]');
            }
        }
    } catch (error) {
        await errorMessage('Error scrolling feed', error);
        await logPageContent(warmingPage);

        //navigate back to the home page for the next tasks
        await pause(2);
        await warmingCursor.click('[href="/"]');
    }
}

const interactWithPost = async(childNum) => {
    try {

        //like
        if(randomChance(0.15)){
            await logChannel.send('like');
            await warmingCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) [aria-label="Like"]`);
            await pause(2);
        }

        let numComments;
        if(await warmingPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) .x1yrsyyn [id*=":"]`) != null){
            numComments = await warmingPage.evaluate((childNum) => {return document.querySelector(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) .x1yrsyyn [id*=":"]`).innerText}, childNum);
            if(numComments == ''){
                numComments = 0;
            }else if(numComments.includes("K")){
                numComments = 1000;
            }else{
                numComments = parseInt(numComments.replace(" comments", ""), 10);
            }
        }else{
            numComments = 0;
        }
        await logChannel.send(numComments);

        //interact with comments, if there are more than two(only 1 gets rid of the comment popup)
        if(randomChance(0.15) && numComments > 2){
            await logChannel.send('interact with comments');
            //click comments button
            await warmingCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) .x1yrsyyn [id*=":"]`);
            await warmingPage.waitForSelector(`.x1jxyteu [aria-label="Comment"]`);
            await pause(2);

            //determine the comment container (Idk why the fuck it changes but im pretty sure it does)
            let commentContainer = 'div.x1gslohp';
            if(await warmingPage.$('div.x1gslohp') == null){
                commentContainer = 'div.x1jx94hy > ul';
            }

            //scan over 3-6 comments
            for(let i = 1; i < Math.floor(Math.random() * 3 + 4); i++){
                //for each comment randomize value to interact
                if(await warmingPage.$(`${commentContainer} > :nth-child(${i}) [aria-label="Like"]`) == null){
                    await logChannel.send("comments end");
                    break;//break if no more comments
                }else if(randomChance(0.40)){
                    await warmingPage.waitForSelector(`${commentContainer} > :nth-child(${i}) [aria-label="Like"]`);
                    await warmingPage.evaluate((i, commentContainer) => {
                        const element = document.querySelector(`${commentContainer} > :nth-child(${i}) [aria-label="Like"]`);
                        element.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                            inline: 'center',
                        });
                    }, i, commentContainer);
                    await warmingCursor.click(`${commentContainer} > :nth-child(${i}) [aria-label="Like"]`);//click like
                }
                await pause(2);
            }
            await warmingCursor.click('[aria-label="Close"]');
            await pause(2);
        }

        //comment
        //**Posts must have at least (5) comments, and readable text to be used
        if(randomChance(0.10) && numComments > 6 && await warmingPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) .x9f619 > div > div > div > div > div:nth-child(3) > :nth-child(1) .x78zum5`) != null){
            await logChannel.send('comment');
            //Use chatgpt on the post to generate an accurate comment.
            await warmingCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) .x1yrsyyn [id*=":"]`);
            await warmingPage.waitForSelector(`.x1jxyteu [aria-label="Comment"]`);
            await pause(1);

            //determine the comment container (Idk why the fuck it changes but im pretty sure it does)
            let commentContainer = 'div.x1gslohp';
            if(await warmingPage.$('div.x1gslohp') == null){
                commentContainer = 'div.x1jx94hy > ul';
            }
            
            //collect text from the post and 7 comments to feed chatgpt in order to generate a good comment
            let commentsString = '';
            for(let i = 1; i < 8; i++){
                commentsString += "'" + await warmingPage.evaluate((i, commentContainer) => {return document.querySelector(`${commentContainer} > :nth-child(${i}) .xat24cr.x1vvkbs`).innerText}, i, commentContainer) + "'";
                if(i != 7){
                    commentsString += ", ";
                }
            }
            console.log(`Imagine you are a middle age person using Facebook to interact with your friends and family. You are looking at a Facebook post that showed up on your feed, the post ${await warmingPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) .x9f619 > div > div > div > div > div > .x1n2onr6 [src*="https://scontent"]`) != null ? 'has' : 'does not have'} a picture, and the text in the post says, "${await warmingPage.evaluate((childNum) => {return document.querySelector(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) .x9f619 > div > div > div > div > div:nth-child(3) > :nth-child(1) .x78zum5`).innerText}, childNum)}". These are some comments that were left on the post: ${commentsString}. Write a comment that is similar to the other comments and related to the post. Your comment should be only a sentence long.`);

            //generate a good comment using the other comments and post text
            const chat = await openai.chat.completions.create({
                messages: [{ role: 'user', content: `Imagine you are a middle age person using Facebook to interact with your friends and family. You are looking at a Facebook post that showed up on your feed, the post ${await warmingPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) .x9f619 > div > div > div > div > div > .x1n2onr6 [src*="https://scontent"]`) != null ? 'has' : 'does not have'} a picture, and the text in the post says, "${await warmingPage.evaluate((childNum) => {return document.querySelector(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) .x9f619 > div > div > div > div > div:nth-child(3) > :nth-child(1) .x78zum5`).innerText}, childNum)}". These are some comments that were left on the post: ${commentsString}. Write a comment for this post, your comment should be very similar to the other comments you were given, and no more than a sentence long.` }],
                model: 'gpt-3.5-turbo',
            });
            await logChannel.send((chat.choices[0].message.content).replace(/['"]/g, ''));
            
            await warmingCursor.click(`.x1jxyteu [aria-label="Comment"]`);
            await pause(1);
            await typeWithRandomSpeed(warmingPage, (chat.choices[0].message.content).replace(/['"]/g, ''));
            await pause(1);
            await warmingCursor.click(`.x1jxyteu [aria-label="Comment"]`);
            await pause(2);
            await warmingCursor.click('[aria-label="Close"]');
            await pause(2);
        }

        //If post is a fan page(Whatever it means to just be a public page), randomize value to follow it
        if(await warmingPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) h4 > span > div > span`) != null && randomChance(0.15)){
            await warmingCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) h4 > span > div > span`);
        }
        
        //If post is from a recommended group, randomize value to follow
        /*if(await warmingPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) span.x3nfvp2 .x1fey0fg`) != null && randomChance(0.05)){
            await logChannel.send('join group');
            await warmingCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) span.x3nfvp2 .x1fey0fg`);
            await pause(2);
        }*/

        //Share opportunity
        if(randomChance(0.05)){
            await logChannel.send('share');
            await warmingCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) [aria-label="Send this to friends or post it on your timeline."]`);//share
            await warmingPage.waitForSelector(`div.x1qfuztq.xh8yej3 > div > div > :nth-child(1)`);
            await pause(1);
            await warmingCursor.click(`div.x1qfuztq.xh8yej3 > div > div > :nth-child(1)`);//share public to feed
            await pause(2);
        }
    } catch (error) {
        await errorMessage('Error interacting with post', error);
        await logPageContent(warmingPage);
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
        if(randomChance(chance)){
            await logChannel.send("create post");

            await warmingCursor.click('[aria-label="Create a post"] div > span');//('[aria-label="Create a post"] div.x6umtig')
            await pause(1);
        
            //set default audience if necessary
            if(await warmingPage.$('[aria-label="Default audience"]') != null){
                await warmingCursor.click('.x1a2a7pz.x1oo3vh0.x1rdy4ex div');
                await pause(1);
                await warmingCursor.click('[aria-label="Done"]');
                await pause(1);
            }

            let destination;
            if(randomChance(0.6)){//post with picture
                // Upload the photo (assuming there's an input field for it)
                await warmingPage.waitForSelector('[aria-label="Photo/video"]');
                await warmingCursor.click('[aria-label="Photo/video"]');
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
                destination = `./${data.id}.jpg`;
                await fs.writeFile(destination, buffer);
                await overWriteMetadata(destination);
                await fileInput.uploadFile(destination);

                if(randomChance(0.7) && data.description != null){//include text in the flic post
                    //ask chat gpt to write a prompt
                    const chat = await openai.chat.completions.create({
                        messages: [{ role: 'user', content: `Imagine you are a middle age person using Facebook to interact with your friends and family. You have a picture that you want to post, here is a description of the picture '${data.description}'. Write a short sentence to post along with the picture. Your sentence should be no more than 300 characters and it should not cut off any words.`}],
                        model: 'gpt-3.5-turbo',
                    });
                    console.log(`Imagine you are a middle age person using Facebook to interact with your friends and family. You have a picture that you want to post, here is a description of the picture '${data.description}'. Write a short sentence to post along with the picture. Your sentence should be no more than 300 characters and it should not cut off any words.`);
                    await logChannel.send((chat.choices[0].message.content).replace(/['"]/g, ''));

                    //click text box
                    await warmingCursor.click("div.x1ed109x > .x9f619");//!change this
                    await pause(1);

                    //type 
                    await typeWithRandomSpeed(warmingPage, (chat.choices[0].message.content).replace(/['"]/g, ''));
                    await pause(2);
                }
            }else{//post without picture
                //ask chat gpt to write a prompt
                const promptArr = ['one of your hobbies', 'a sport you are playing recreationally', 'a real sports team you like to watch, including the name of the team', 'something going on with your wife/husband', 'one of your pets', 'one of your close friends', 'a problem you have', 'your job', 'a specific show you are watching, including the name of the show, and if you like it', 'a real restaurant you went to, with name and location', 'a vacation you went on', 'your favorite song/artist', 'a photograph you recently took', 'a good fun fact'];//! add to this
                const chat = await openai.chat.completions.create({
                    messages: [{ role: 'user', content: `Imagine you are an average, middle aged person using Facebook to interact with your friends and family. Here are some posts you saw on Facebook: "500 million monthly actives on WhatsApp Channels in the first 7 weeks! Great to see the community so engaged.", "Move from your comfort zone and impact your services to change others life. West Africa Child Fund received international volunteers across the world.", "Lebron James is undoubtedly the greatest basketball player of our generation. I would give almost anything to watch him play against Micheal Jordan...", "I love Chipotle", "Does anybody else just want to play Xbox 24/7?", "I want to loose weight but I'm having a hard time motivating myself to workout, any suggestions?". Write a post, similar to the ones you were given, about ${promptArr[Math.floor(Math.random() * (promptArr.length - 1))]}. Your post should be only 1 or 2 short sentences and no more than 300 characters in length. This should not cut off any words.` }],
                    model: 'gpt-3.5-turbo',
                });
                await logChannel.send((chat.choices[0].message.content).replace(/['"]/g, ''));

                //click text box
                await warmingCursor.click("div.x1ed109x > .x9f619");//!change this
                await pause(1);

                //type 
                await typeWithRandomSpeed(warmingPage, (chat.choices[0].message.content).replace(/['"]/g, ''));
                await pause(2);
            }

            //post
            if(await warmingPage.$('[aria-label="Next"]') != null)
            {
                await warmingCursor.click('[aria-label="Next"]');
                await pause(1);
            }
            
            //post
            await warmingCursor.click('[aria-label="Post"]');

            //delete pic
            if(destination != null){
                await fs.unlink(destination);
            }

            await logChannel.send("Successful Post");
        }
    } catch (error) {
        await errorMessage('Error creating post', error);
        await logPageContent(warmingPage);
    }
}

//main function
(async () => {
    try {
        if(await start()){
            let taskArray = [() => createPost(0.70), scrollFeed];//, () => addFriend(0.1), () => joinGroup(0.1)
            for (let i = taskArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [taskArray[i], taskArray[j]] = [taskArray[j], taskArray[i]];
            }
            for await(const task of taskArray){
                await task();
            }

            await logChannel.send("Warming Finish: " + workerData.username);
            await warmingPage.close();
            await warmingBrowser.close();
            warmingBrowser = null;
        }
        logChannel.send('finish');

        if(warmingBrowser != null){
            await warmingPage.close();
            await warmingBrowser.close();
        }
        process.exit(0);
    } catch (error) {
        await errorMessage('Error with main function', error);
        if(warmingBrowser != null){
            await warmingPage.close()
            await warmingBrowser.close();
        }
        process.exit(0);
    }
})();