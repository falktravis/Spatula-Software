//require
require('dotenv').config();
const { workerData } = require('worker_threads');
const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(stealthPlugin());
const { createCursor } = require("ghost-cursor");

//discord.js
const { Client, GatewayIntentBits } = require('discord.js');
const { Page } = require('puppeteer');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
client.login(process.env.DISCORD_BOT_TOKEN);

//for fetching pics from the database
const fetch = require('node-fetch');
const fs = require('fs/promises');

//init chatgpt
const OpenAI = require("openai");
const { channel } = require('diagnostics_channel');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

//error message send function
const errorMessage = (message, error) => {
    console.log(message + ': ' + error);
    //mainChannel.send(message + ': ' + error);
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

let mainChannel;
client.on('ready', async () => {
    try {
        mainChannel = client.channels.cache.get(workerData.channel);
        if(mainChannel == null){
            mainChannel = await client.channels.fetch(workerData.channel);
        }
    } catch (error) {
        errorMessage('Error fetching channel', error);
    }
});

//scrape the html content for testing
const logPageContent = async (page) => {
    try{
        const htmlContent = await page.content();
        const { Readable } = require('stream');
        const htmlStream = Readable.from([htmlContent]);
        mainChannel.send({
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

//general instantiation
let initiationBrowser;
let initiationPage;
let initiationCursor;

const start = async () => {
    //initiate a browser with random resi proxy and request interception
    try{
        initiationBrowser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', `--user-agent=Mozilla/5.0 (${platformConverter(workerData.platform)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36`, `--proxy-server=${workerData.proxy}`]
        });
        let pages = await initiationBrowser.pages();
        initiationPage = pages[0];

        //close the notif popup
        const context = initiationBrowser.defaultBrowserContext();
        context.overridePermissions("https://www.facebook.com", ["notifications"]);

        //change http headers
        initiationPage.setExtraHTTPHeaders({
            'Referer': 'https://www.facebook.com/login',
            'Sec-Ch-Ua': 'Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114',
            'Sec-Ch-Ua-Full-Version-List': 'Not.A/Brand";v="8.0.0.0", "Chromium";v="114.0.5735.199", "Google Chrome";v="114.0.5735.199',
            'Sec-Ch-Ua-Platform': workerData.platform
        });

        //await initiationPage.setRequestInterception(true);
        /*initiationPage.on('response', async response => {
            //detect redirection
            if ([300, 301, 302, 303, 307, 308].includes(response.status())) {
                const redirectURL = response.headers()['location'];
                console.log(`Redirected to: ${redirectURL}`);

                if(await initiationPage.$('[href="https://m.facebook.com/terms.php"]') != null && await initiationPage.$('[aria-label="Dismiss"]') != null){
                    console.log("checkpointed")
                    await pause(1);
                    await initiationCursor.click('[aria-label="Dismiss"]');
                }
            }
        });*/

        //create cursor
        initiationCursor = createCursor(initiationPage);

        //change the viewport
        initiationPage.setViewport({ width: 1366, height: 768 });

        //Set cookies in browser
        await initiationPage.setCookie(...workerData.cookies);

        console.log(workerData.username);

        await initiationPage.goto('https://www.facebook.com', {waitUntil: 'domcontentloaded'});

        //detect accounts that need login
        if(await initiationPage.$('[name="login"]') != null){
            console.log("account is fucked");
            return false;
        }else{
            return true;
        }
    }catch(error){
        errorMessage('Error with page initiation', error);
    }
}

//** Works */
const changeLanguage = async () => {
    //initiate a browser with random resi proxy and request interception
    try{
        //go to the search page
        await initiationCursor.click('div.x1i10hfl.x1qjc9v5.xjbqb8w.xjqpnuy.xa49m3k.xqeqjp1.x2hbi6w.x13fuv20.xu3j5b3.x1q0q8m5.x26u7qi.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xdl72j9.x2lah0s.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x2lwn1j.xeuugli.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1n2onr6.x16tdsg8.x1hl2dhg.xggy1nq.x1ja2u2z.x1t137rt.x1o1ewxj.x3x9cwd.x1e5q0jg.x13rtm0m.x1q0g3np.x87ps6o.x1lku1pv.x1a2a7pz.xzsf02u.x1rg5ohu > div > svg > g > image');
        await initiationPage.waitForSelector('.x1oo3vh0.x1rdy4ex');
        await pause(1);
        await initiationCursor.click('.x1oo3vh0.x1rdy4ex > :nth-child(1)');
        await initiationPage.waitForSelector('div.x1y1aw1k > div > div:nth-child(1) > a > div.x6s0dn4.x1q0q8m5 > div.x6s0dn4.xkh2ocl.x1q0q8m5 > div');
        await pause(1);
        await initiationCursor.click('div.x1y1aw1k > div > div:nth-child(1) > a > div.x6s0dn4.x1q0q8m5 > div.x6s0dn4.xkh2ocl.x1q0q8m5 > div');
        await initiationPage.waitForSelector('[href*="language"]');
        await pause(2);

        if(await initiationPage.$('div.xpvyfi4.xc9qbxq.xyamay9.x1pi30zi.x1l90r2v.x1swvt13.x1n2onr6.xq1dxzn > div > div > div.x6s0dn4.x78zum5.xl56j7k.x1608yet.xljgi0e.x1e0frkt > div') != null){
            console.log("click");
            await initiationCursor.click('div.xpvyfi4.xc9qbxq.xyamay9.x1pi30zi.x1l90r2v.x1swvt13.x1n2onr6.xq1dxzn > div > div > div.x6s0dn4.x78zum5.xl56j7k.x1608yet.xljgi0e.x1e0frkt > div');
            await pause(2);
        }

        await initiationCursor.click('[href*="language"]');
        await pause(2);

        if(await initiationPage.$('div.x9f619.x1n2onr6.x1ja2u2z.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.x78zum5.x1t2pt76 > div > div > div > div > div:nth-child(2) > div > div > div:nth-child(1) > div:nth-child(2) > div > div.xezivpi') != null){
            if(await initiationPage.$('div.x1uvtmcs.x4k7w5x > div > div > div > div.xpvyfi4.xc9qbxq > div > div') != null){
                await initiationCursor.click('div.x1uvtmcs.x4k7w5x > div > div > div > div.xpvyfi4.xc9qbxq > div > div');
            }
            await initiationCursor.click('div.x9f619.x1n2onr6.x1ja2u2z.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.x78zum5.x1t2pt76 > div > div > div > div > div:nth-child(2) > div > div > div:nth-child(1) > div:nth-child(2) > div > div.xezivpi');
            //click button drop down
            await initiationPage.waitForSelector('div.x9f619.x1n2onr6.x1ja2u2z.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.x78zum5.x1t2pt76 > div > div > div > div > div:nth-child(2) > div > div > div:nth-child(1) > div:nth-child(2) > div > div > div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x2lah0s.x193iq5w.xyamay9.x1l90r2v > div > div > div');
            await pause(1);
            await initiationCursor.click('div.x9f619.x1n2onr6.x1ja2u2z.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.x78zum5.x1t2pt76 > div > div > div > div > div:nth-child(2) > div > div > div:nth-child(1) > div:nth-child(2) > div > div > div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x2lah0s.x193iq5w.xyamay9.x1l90r2v > div > div > div');

            //click english 
            await initiationPage.waitForSelector('div.xu96u03.xm80bdy.x10l6tqk.x13vifvy > div.x1n2onr6 > div > div > div > div > div.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6 > div');
            await pause(1);
            const languageArr = await initiationPage.$$('div.xu96u03.xm80bdy.x10l6tqk.x13vifvy > div.x1n2onr6 > div > div > div > div > div.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6 > div > div');
            for (const element of languageArr) {
              const elementText = await initiationPage.evaluate(el => el.textContent, element);
          
              if (elementText === 'English (US)') {
                await element.click();
                break;
              }
            }

            //click submit
            await initiationPage.waitForSelector('div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x2lah0s.x193iq5w.x1gryazu.xezivpi > div > div:nth-child(2) > div.x1i10hfl.xjbqb8w.x1ypdohk.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1o1ewxj.x3x9cwd.x1e5q0jg.x13rtm0m.x87ps6o.x1lku1pv.x1a2a7pz.x9f619.x3nfvp2.xdt5ytf.xl56j7k.x1n2onr6.xh8yej3 > div > div.x6s0dn4.x78zum5.xl56j7k.x1608yet.xljgi0e.x1e0frkt > div > span > span');
            await pause(1);
            await initiationCursor.click('div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x2lah0s.x193iq5w.x1gryazu.xezivpi > div > div:nth-child(2) > div.x1i10hfl.xjbqb8w.x1ypdohk.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1o1ewxj.x3x9cwd.x1e5q0jg.x13rtm0m.x87ps6o.x1lku1pv.x1a2a7pz.x9f619.x3nfvp2.xdt5ytf.xl56j7k.x1n2onr6.xh8yej3 > div > div.x6s0dn4.x78zum5.xl56j7k.x1608yet.xljgi0e.x1e0frkt > div > span > span');

            //await initiationCursor.click('div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x2lah0s.x193iq5w.x1gryazu.xezivpi > div > div:nth-child(2) > div.x1i10hfl.xjbqb8w.x6umtig.x1b1mbwd.xaqea5y.xav7gou.x1ypdohk.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1o1ewxj.x3x9cwd.x1e5q0jg.x13rtm0m.x87ps6o.x1lku1pv.x1a2a7pz.x9f619.x3nfvp2.xdt5ytf.xl56j7k.x1n2onr6.xh8yej3');


        }else{
            await initiationCursor.click('div.x9f619.x1n2onr6.x1ja2u2z.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.x78zum5.x1t2pt76 > div > div > div > div > div > div > div:nth-child(2) > div > div > div:nth-child(2) > div > div > div > div > div > div > div > div > div.x9f619.x1n2onr6.x1ja2u2z.xdt5ytf.x2lah0s.x193iq5w.xeuugli.x78zum5 > div > div');
            //click english
            await initiationPage.waitForSelector('div.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6.xaci4zi.x129vozr > div > div > div:nth-child(4) > div > div.x6s0dn4.x1q0q8m5.x1qhh985.xu3j5b3.xcfux6l.x26u7qi.xm0m39n.x13fuv20.x972fbf.x9f619.x78zum5.x1q0g3np.x1iyjqo2.xs83m0k.x1qughib.xat24cr.x11i5rnm.x1mh8g0r.xdj266r.xeuugli.x18d9i69.x1sxyh0.xurb0ha.xexx8yu.x1n2onr6.x1ja2u2z.x1gg8mnh > div');
            await pause(1);
            await initiationCursor.click('div.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6.xaci4zi.x129vozr > div > div > div:nth-child(4) > div > div.x6s0dn4.x1q0q8m5.x1qhh985.xu3j5b3.xcfux6l.x26u7qi.xm0m39n.x13fuv20.x972fbf.x9f619.x78zum5.x1q0g3np.x1iyjqo2.xs83m0k.x1qughib.xat24cr.x11i5rnm.x1mh8g0r.xdj266r.xeuugli.x18d9i69.x1sxyh0.xurb0ha.xexx8yu.x1n2onr6.x1ja2u2z.x1gg8mnh > div');
            //submit
            await initiationPage.waitForSelector('div.x1uvtmcs.x4k7w5x.x1h91t0o.x1beo9mf.xaigb6o.x12ejxvf.x3igimt.xarpa2k.xedcshv.x1lytzrv.x1t2pt76.x7ja8zs.x1n2onr6.x1qrby5j.x1jfb8zj > div > div > div > div > div > div > div.x1jx94hy.xh8yej3.x1hlgzme.xvcs8rp.x1bpvpm7.xefnots.x13xjmei.xv7j57z > div > div > div > div > div:nth-child(1) > div > div');
            await pause(1);
            await initiationCursor.click('div.x1uvtmcs.x4k7w5x.x1h91t0o.x1beo9mf.xaigb6o.x12ejxvf.x3igimt.xarpa2k.xedcshv.x1lytzrv.x1t2pt76.x7ja8zs.x1n2onr6.x1qrby5j.x1jfb8zj > div > div > div > div > div > div > div.x1jx94hy.xh8yej3.x1hlgzme.xvcs8rp.x1bpvpm7.xefnots.x13xjmei.xv7j57z > div > div > div > div > div:nth-child(1) > div > div');
        }
        try {
            await initiationPage.waitForNavigation({ waitUntil: 'load' });
        } catch (error) {}
        await pause(2);
        await initiationCursor.click('[href="/"]')
        await mainChannel.send("Finish: " + workerData.username);
    }catch(error){
        errorMessage('Error with page initiation', error);
        //await logPageContent(initiationPage);
    }
}

//**Works for now */
const scrollFeed = async() => {
    try {
        await initiationPage.waitForSelector('div.x1hc1fzr.x1unhpq9 > div > div > div');

        //pick a feed and scroll through a random amount of post, interacting with a random amount of posts
        //scroll a random number of posts 5-20
        for(let i = 1; i < Math.floor(Math.random() * 8 + 5); i++){
            await pause(3);
            //scroll into view
            await initiationPage.waitForSelector(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i})`);
            await initiationPage.evaluate(i => {
                const element = document.querySelector(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i})`);
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'center',
                });
            }, i);

            //check what kind of container it is
            if(await initiationPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${i}) [aria-label="hide post"]`) != null){//post
                await mainChannel.send('post');
                await interactWithPost(i);
            }else{
                await mainChannel.send("Non-Identified Container");
            }
        }

        await pause(2);
    } catch (error) {
        errorMessage('Error scrolling feed', error);
        await logPageContent(initiationPage);
    }
}

const randomChance = (chance) => {
    if(Math.random() < chance){
        return true;
    }else{
        return false;
    }
}

const interactWithPost = async(childNum) => {
    try {
        await pause(2);
        //like
        if(randomChance(0.12)){
            await mainChannel.send('like');
            await initiationCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) div.x5ve5x3 > div.x9f619.x1n2onr6 > div:nth-child(1)`);//Like
            await pause(2);
        }

        //If post is a fan page(Whatever it means to just be a public page), randomize value to follow it
        if(await initiationPage.$(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) h4 > span > div > span`) != null && randomChance(0.15)){
            await initiationCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) h4 > span > div > span`);
        }

        //Share opportunity
        if(randomChance(0.02)){
            await mainChannel.send('share');
            await initiationCursor.click(`div.x1hc1fzr.x1unhpq9 > div > div > div:nth-child(${childNum}) div:nth-child(3) > div > div.xuxw1ft > div:nth-child(2)`);//share
            await initiationPage.waitForSelector(`div.x1qfuztq.xh8yej3 > div > div > :nth-child(1)`);
            await pause(1);
            await initiationCursor.click(`div.x1qfuztq.xh8yej3 > div > div > :nth-child(1)`);//share public to feed
            await pause(2);

            try {
                await initiationPage.waitForSelector('div.x6s0dn4.x9f619.x78zum5.x1qughib > div > div > div.x6s0dn4.x78zum5');
                await pause(2);
                await initiationCursor.click('div.x6s0dn4.x9f619.x78zum5.x1qughib > div > div > div.x6s0dn4.x78zum5');
            } catch (error) {
                await mainChannel.send("error clicning share thing: " + error);
                await initiationCursor.click('div.x9f619.x71s49j div:nth-child(1) > div.x1n2onr6 > div > div.x78zum5 > div > div > i')
            }
        }
    } catch (error) {
        errorMessage('Error interacting with post', error);
        await logPageContent(initiationPage);
    }
}

//main function
(async () => {
    try {
        if(await start()){
            //Change Language
            if(workerData.changeLanguage == true){
                //start by "checking" notifs
                await initiationPage.waitForSelector('div.x1ja2u2z > div:nth-child(2) > span > span > div > a > svg');
                await pause(1);
                await initiationCursor.click('div.x1ja2u2z > div:nth-child(2) > span > span > div > a > svg');
                await pause(3);
                //TODO: Chance to click on one notif and click back to home
                await initiationCursor.click('div.x1ja2u2z > div:nth-child(2) > span > span > div > a > svg');
                await pause(1);

                await scrollFeed();

                const initiation = await initiationPage.evaluate(() => {return document.documentElement.lang});
                if (initiation !== 'en') {
                    await changeLanguage();
                }

                await scrollFeed();
                //await initiationPage.close();
                //await initiationBrowser.close();
                //process.exit(1);
            }
        }

        console.log('finish');
    } catch (error) {
        errorMessage('Error with main function', error);
    }
})();


const fillProfile = async() => {
    try {
        // Navigate to the account settings page
        await initiationPage.waitForSelector('[aria-label="Your profile"]');
        await initiationCursor.click('[aria-label="Your profile"]');
        await pause(1);
        await initiationPage.waitForSelector('[href="/me/"]');
        await initiationCursor.click('[href="/me/"]');
        await initiationPage.waitForSelector('[aria-label="Edit profile"]');
        await pause(2);
        await initiationCursor.click('[aria-label="Edit profile"]');
        await initiationPage.waitForSelector('[aria-label="Add profile picture"]');
        await pause(1);

        /**
         * get hair color, ethnicity from an array
         * Store each choice together, ie: choice 1-4 are blonde, 5-7 dark hair, 8-10 dark skin
         * 
         * other randomizers
         * eye color, hair length, curly/wavy/straight hair, 
         * */
        let ethnicity = ['Russian', 'French', 'Spanish', 'German', 'Swedish', 'Polish', 'American', 'French',  'Asian American', 'African American', 'Indian American'];
        let hairColor = ['blonde', 'brunette', 'black hair'];
        let charecterRandomizer = Math.floor(Math.random() * ethnicity.length);
        if(charecterRandomizer > 7){
            hairColor = hairColor[2];
        }else{
            hairColor = hairColor[Math.floor(Math.random() * hairColor.length)]
        }
        ethnicity = ethnicity[charecterRandomizer];

        //**Profile pic */
        if(await initiationPage.evaluate(() => {return document.querySelector(`[aria-label="Add profile picture"]`).innerText}) == 'Add'){
            await initiationCursor.click('[aria-label="Add profile picture"]');
            await initiationPage.waitForSelector('[role="dialog"] input[type="file"]');
            await pause(1);
            let fileInput = await initiationPage.$('[role="dialog"] input[type="file"]');
    
            //!Generate a prompt
            //age = Math.floor(Math.random() * 10 + 25)

            //!Rendernet.ai
            //1:1 aspect ratio
            let response = await fetch('https://api.unsplash.com/photos/random?query=family', {
                headers: {
                    'Authorization': `Client-ID 7PvN13wlYr41F2_p7FAv_yGoCIdJzUKPNE2NDkoaApQ`
                }
            });
            let data = await response.json();
            let photo = await fetch(data.urls.full);
            let buffer = await photo.buffer();
            let destination = `./${data.id}.jpg`;
            await fs.writeFile(destination, buffer);

            //Overwrite MetaData
            overWriteMetadata(destination);

            //upload file and save
            await fileInput.uploadFile(destination);
            await initiationPage.waitForSelector('[aria-label="Save"]');
            await pause(1);
            await initiationCursor.click('[aria-label="Save"]');
            await initiationPage.waitForFunction(() => !document.querySelector('[aria-label="Save"]'));

            await fs.unlink(destination);
            await pause(1);
            await initiationCursor.click('[aria-label="Edit profile"]');
            await initiationPage.waitForSelector('div.x1q0g3np > [aria-label="Add cover photo"]');
            await pause(1);
        }

        //**Cover pic */
        if(await initiationPage.evaluate(() => {return document.querySelector(`div.x1q0g3np > [aria-label="Add cover photo"]`).innerText}) == 'Add'){
            await initiationCursor.click('div.x1q0g3np > [aria-label="Add cover photo"]');
            await initiationPage.waitForSelector('[role="dialog"] input[type="file"]');
            await pause(1);
            fileInput = await initiationPage.$('[role="dialog"] input[type="file"]');
    
            //!We might have to find a different way to get this
            response = await fetch('https://api.unsplash.com/photos/random?query=nature', {
                headers: {
                    'Authorization': `Client-ID 7PvN13wlYr41F2_p7FAv_yGoCIdJzUKPNE2NDkoaApQ`
                }
            });
            data = await response.json();
            photo = await fetch(data.urls.full);
            buffer = await photo.buffer();
            destination = `./${data.id}.jpg`;
            await fs.writeFile(destination, buffer);

            //Overwrite MetaData
            overWriteMetadata(destination);
    
            //upload and save file
            await fileInput.uploadFile(destination);
            await initiationPage.waitForSelector('[aria-label="Save"]'); // Adjust the timeout as needed
            await pause(1);
            await initiationCursor.click('[aria-label="Save"]');
            await fs.unlink(destination);
            await initiationPage.waitForFunction(() => !document.querySelector('[aria-label="Save"]'));
            await pause(2);
        }

        //**Avatar */
        if(await initiationPage.$(`[aria-label="Create avatar"]`) != null){
            await initiationCursor.click('[aria-label="Create avatar"]');
            await initiationPage.waitForSelector('[aria-label="Choice in Avatar Editor"] > .x1ypdohk');
            await pause(2);

            //make avatar choice based on charecter design
            let avatarChoice;
            if(charecterRandomizer > 8){//dark skin
                avatarChoice = '15';
            }else{//base of hair color
                if(hairColor == 'blonde'){
                    avatarChoice = '7';
                }else{
                    avatarChoice = '29'
                }
            }

            await initiationCursor.click(`[aria-label="Choice in Avatar Editor"]:nth-child(${avatarChoice})`);
            await pause(2);
            await initiationCursor.click('.xozqiw3.xcfux6l');
            await initiationPage.waitForSelector('.x6s0dn4.xwnonoy.x1npaq5j.x1c83p5e.x1enjb0b.x199158v.x14ctfv.x78zum5.x5yr21d.xl56j7k.x1199peq.xh8yej3.xbryuvx.x1mq3mr6');
            await pause(2);
            await initiationCursor.click('[aria-label="Close avatar editor"] > svg');
            await initiationPage.waitForSelector('[aria-label="Edit profile"]');
            await pause(1);
            await initiationCursor.click('[aria-label="Edit profile"]');
            await initiationPage.waitForSelector('[aria-label="Edit profile"] [aria-label="Add bio"]');
        }

        //**Bio */
        if(await initiationPage.evaluate(() => {return document.querySelector(`[aria-label="Edit profile"] [aria-label="Add bio"]`).innerText}) == 'Add'){
            await pause(2);
            await initiationCursor.click('[aria-label="Edit profile"] [aria-label="Add bio"]');
            await initiationPage.waitForSelector('[aria-label="Enter bio text"]');
            await pause(1);
    
            //generate a bio, with chatbdt  Average guy trying to make an impact on the world.
            const chat = await openai.chat.completions.create({
                messages: [{ role: 'user', content: `Imagine you are a middle age person using Facebook to interact with your friends and family. You are filling out your profile information and you want to write a bio. Here are some good examples of bios: "Make an impact on the world.", "Bringing the world closer together.", "Preserving nature.", "Co-chair, Bill and Melinda Gates Foundation Founder, Breakthrough Energy", "Just your average guy.". Write a bio similar to the ones you were provided. Your post should be no more then 100 charecters and should not cut off any words.` }],
                model: 'gpt-3.5-turbo',
            });
    
            await initiationCursor.click('[aria-label="Enter bio text"]');
            await typeWithRandomSpeed(initiationPage, (chat.choices[0].message.content).replace(/['"]/g, ''));
            await pause(2);
            await initiationCursor.click('[aria-label="Save"]');
            await initiationPage.waitForSelector('[aria-label="Share now"]');
        }

        //**Other Info */
        await pause(3);
        await initiationCursor.click('[aria-label="Edit your About info"]');
        await initiationPage.waitForSelector('.xqmdsaz > div > div > .x1hq5gj4 span.x1qq9wsj');
        await pause(1);
        
        let i = 1;
        while(i < 7){
            console.log(i);
            if(await initiationPage.$(`.xqmdsaz > div > div :nth-child(${i}) div.x13faqbe span.x1qq9wsj`) != null){
                const option = await initiationPage.evaluate((i) => {return document.querySelector(`.xqmdsaz > div > div :nth-child(${i}) div.x13faqbe span.x1qq9wsj`).textContent}, i);
        
                //college
                if(option.includes('college')){
                    let college = await fetch(`http://universities.hipolabs.com/search?country=United%20States&limit=1&offset=${Math.floor(Math.random() * 2284 + 1)}`);
                    college = await college.json();
                    console.log(college);

                    await initiationPage.evaluate(() => {
                        const element = document.querySelector('div.x6s0dn4 > div > div > div > div:nth-child(1) > div > div > div > div > div.x1iyjqo2 > div > div');
                        element.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                            inline: 'center',
                        });
                    });

                    await initiationCursor.click(`.xqmdsaz > div > div :nth-child(${i}) div.x13faqbe span.x1qq9wsj`);
                    await initiationPage.waitForSelector('[aria-label="School"]');
                    await pause(1);
                    await initiationCursor.click('[aria-label="School"]');
                    await typeWithRandomSpeed(initiationPage, college[0].name);
                    await pause(2);
                    await initiationPage.click('[aria-label*="suggested search"] > :nth-child(1)');
                    await pause(2);
                    await initiationCursor.click('[aria-label="Save"]');
                    i = 0;
                    await pause(3);
                }else if(option.includes('current city')){//current city
                    console.log(option);
                    let currentTown = await fetch(`https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/us-cities-demographics/records?limit=1&offset=${Math.floor(Math.random() * 2891 + 1)}`);
                    currentTown = await currentTown.json();
                    console.log(currentTown);

                    await initiationPage.evaluate(() => {
                        const element = document.querySelector('div.x6s0dn4 > div > div > div > div:nth-child(1) > div > div > div > div > div.x1iyjqo2 > div > div');
                        element.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                            inline: 'center',
                        });
                    });

                    await initiationCursor.click(`.xqmdsaz > div > div :nth-child(${i}) div.x13faqbe span.x1qq9wsj`);
                    await initiationPage.waitForSelector('[aria-label="Current city"]');
                    await pause(1);
                    await initiationCursor.click('[aria-label="Current city"]');
                    await typeWithRandomSpeed(initiationPage, currentTown.results[0].city + ", " + currentTown.results[0].state);
                    await pause(2);
                    await initiationPage.click('[aria-label*="suggested search"] > :nth-child(1)');
                    await pause(2);
                    await initiationCursor.click('[aria-label="Save"]');
                    i = 0;
                    await pause(3);
                }else if(option.includes('home')){//hometown
                    let hometown = await fetch(`https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/us-cities-demographics/records?limit=1&offset=${Math.floor(Math.random() * 2891 + 1)}`);
                    hometown = await hometown.json();
                    console.log(hometown);

                    await initiationPage.evaluate(() => {
                        const element = document.querySelector('div.x6s0dn4 > div > div > div > div:nth-child(1) > div > div > div > div > div.x1iyjqo2 > div > div');
                        element.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                            inline: 'center',
                        });
                    });

                    await initiationCursor.click(`.xqmdsaz > div > div :nth-child(${i}) div.x13faqbe span.x1qq9wsj`);
                    await initiationPage.waitForSelector('[aria-label="Hometown"]');
                    await pause(1);
                    await initiationCursor.click('[aria-label="Hometown"]');
                    await typeWithRandomSpeed(initiationPage, hometown.results[0].city + ", " + hometown.results[0].state);
                    await initiationPage.waitForSelector('[aria-label*="suggested search"]');
                    await pause(2);
                    await initiationPage.click('[aria-label*="suggested search"] > :nth-child(1)');
                    await pause(2);
                    await initiationCursor.click('[aria-label="Save"]');
                    i = 0;
                    await pause(3);
                }else if(option.includes('relationship')){//relationship status
                    await initiationPage.evaluate(() => {
                        const element = document.querySelector('div.x6s0dn4 > div > div > div > div:nth-child(1) > div > div > div > div > div.x1iyjqo2 > div > div');
                        element.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                            inline: 'center',
                        });
                    });

                    await initiationCursor.click(`.xqmdsaz > div > div :nth-child(${i}) div.x13faqbe span.x1qq9wsj`);
                    await initiationPage.waitForSelector('[aria-haspopup="listbox"][role="combobox"]');
                    await pause(1);
                    await initiationCursor.click('[aria-haspopup="listbox"][role="combobox"]');
                    await initiationPage.waitForSelector('.xdt5ytf.x1iyjqo2 > .x12ejxvf');
                    await pause(2);
                    await initiationCursor.click(`.xdt5ytf.x1iyjqo2 > .x12ejxvf > :nth-child(${Math.floor(Math.random() * 4 + 1)})`);
                    await pause(3);
                    await initiationCursor.click('[aria-label="Save"]');
                    i = 0;
                    await pause(3);
                }else{
                    i++;
                }
            }else{
                i++;
            }
        }
    } catch (error) {
        errorMessage('Error filling in info', error);
        //await logPageContent(initiationPage);
    }
}