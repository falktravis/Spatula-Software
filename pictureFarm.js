/*const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(stealthPlugin());

//discord.js
const { Client, GatewayIntentBits } = require('discord.js');
const { Page } = require('puppeteer');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
client.login(process.env.DISCORD_BOT_TOKEN);

//error message send function
const errorMessage = (message, error) => {
    console.log(message + ': ' + error);
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

//general instantiation
let pictureBrowser;
let picturePage;

const setPrompt = async (posPrompt, negPrompt) => {
    await picturePage.click('#prompt-input');
    await picturePage.type('#prompt-input', posPrompt, {delay: 60});
    if(negPrompt != null){
        await picturePage.click('#neg_prompt-tab');
        await picturePage.type('#negative-prompt-input', negPrompt, {delay: 60});
        await picturePage.click('#prompt-tab');
    }
}

const setControlNet = async (filePath) => {
    await picturePage.click('#tab-list > :nth-child(4)');
    let fileInput = await picturePage.$('#img-upload-input');
    await fileInput.uploadFile(filePath);
}

const setFaceLock = async (filePath) => {
    await picturePage.click('#tab-list > :nth-child(5)');
    let fileInput = await picturePage.$('#img-upload-input');
    await fileInput.uploadFile(filePath);
}

const changeLanguage = async () => {
    //initiate a browser with random resi proxy and request interception
    try{
        pictureBrowser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', `--user-agent=Mozilla/5.0 (${platformConverter(workerData.platform)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36`, `--proxy-server=${workerData.proxy}`]
        });
        let pages = await pictureBrowser.pages();
        picturePage = pages[0];

        //change the viewport
        picturePage.setViewport({ width: 1366, height: 768 });

        //go to the search page
        await picturePage.goto('https://www.facebook.com/settings/?tab=language', {waitUntil: 'load'});

        /**
         * Manual Pre-Conditions
         * - Log into page
         * - Select model and other settings (Make sure its set to 1 img)
         * - Control net and Facelock off
         * 
         * Sequence
         * - Set prompt for profile generation
         * - Set Control Net for profile generation?
         * - Generate pic of profile and store link for mongo
         * - Set prompt for image generation
         * - Set Facelock
         * - Loop x 7
         *  - Set control net
         *  - Generate and store link
         * - Set mongo document
         *

        
    }catch(error){
        errorMessage('Error with page initiation', error);
    }
}
changeLanguage();*/

//manipulating metadata
const exiftool = require('node-exiftool');
const exiftoolBin = require('dist-exiftool');
const ep = new exiftool.ExiftoolProcess(exiftoolBin);

const generateMetaData = () => {
    const date = new Date(Date.now() - Math.floor(Math.random() * 86400000 * 365));
    const model = Math.floor(Math.random() * 2) + 13;
    // Add more fields as needed
    return{
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
}

//Overwrite MetaData
const test = async () => {
    await ep.open();
    await ep.writeMetadata('./testimg.png', {all: ''}, ['overwrite_original']);
    const metadata = generateMetaData();
    await ep.writeMetadata('./testimg.png', metadata, ['overwrite_original']);
    await ep.close();
}
test();