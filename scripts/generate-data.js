const fs = require('fs');
const path = require('path');

// 1. Define our diverse seed data components
const subjects = [
    "Michael Jackson her Mann Musik Gesang Pop USA Hemd leger Studio hoch ganz stehend Bühne",
    "J.Morris, Manchester Utd inside right 7th January 1948",
    "Angela Merkel Bundeskanzlerin Politik Berlin CDU Rede Parlament",
    "Champions League Finale Real Madrid Bayern München Fußball Stadion Jubel",
    "Concert Taylor Swift Eras Tour live performance guitar crowd",
    "Olaf Scholz SPD Chancellor Germany Press Conference",
    "Olympic Games Paris 2024 Athletics 100m sprint gold medal",
    "Wildlife photography lion safari Kenya Africa nature",
    "Vintage car rally classic automobile Porsche 911 exhibition",
    "SpaceX Falcon 9 rocket launch NASA space exploration"
];

const photographers = [
    "IMAGO / teutopress",
    "IMAGO / United Archives International",
    "IMAGO / Getty Images",
    "IMAGO / Reuters",
    "IMAGO / dpa",
    "IMAGO / Xinhua"
];

const restrictions = [
    "PUBLICATIONxINxGERxSUIxAUTxONLY",
    "PUBLICATIONxINxUKxUSAxONLY",
    "PUBLICATIONxINxJPNxONLY",
    "", // Some should have NO restrictions
    ""
];

// 2. Helper to get random item
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 3. Helper to generate a random date string (DD.MM.YYYY)
const getRandomDate = () => {
    const start = new Date(1940, 0, 1).getTime();
    const end = new Date(2024, 0, 1).getTime();
    const date = new Date(start + Math.random() * (end - start));
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}.${month}.${year}`;
};

// 4. Generate the 10,000 items
const generateData = (count) => {
    const data = [];
    for (let i = 1; i <= count; i++) {
        const baseText = getRandom(subjects);
        const restriction = getRandom(restrictions);
        // Combine text and sometimes add a restriction at the end
        const suchtext = restriction ? `${baseText} ${restriction}` : baseText;

        data.push({
            suchtext: suchtext,
            bildnummer: `00${50000000 + i}`, // Unique ID
            fotografen: getRandom(photographers),
            datum: getRandomDate(),
            hoehe: String(Math.floor(Math.random() * 2000) + 800),
            breite: String(Math.floor(Math.random() * 3000) + 1000)
        });
    }
    return data;
};

// 5. Write to your data.json file
const TARGET_COUNT = 10000;
const outputPath = path.join(__dirname, '../src/lib/data.json');

const finalData = generateData(TARGET_COUNT);

fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2));

console.log(`✅ Successfully generated ${TARGET_COUNT} media items at ${outputPath}`);