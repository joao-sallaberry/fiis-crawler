const cheerio = require('cheerio');
const moment = require('moment');
const rp = require('request-promise');

const month = 9;
const year = 2019;
const funds = [
    { ticker: 'alzr11', qty: 10 },
    { ticker: 'ggrc11', qty: 10 }
];


function main() {
    const dividendGetters = funds.map(fund => getTotalDividend(fund, year, month));
    Promise.all(dividendGetters)
        .then(dividends => {
            console.log(`FII\tQTY\tDIVIDENDS`);
            for (const [i, fund] of funds.entries()) {
                console.log(`${fund.ticker}\t${fund.qty}\t${dividends[i].toFixed(2)}`);
            }
            const total = dividends.reduce((acc, div) => acc + div).toFixed(2);
            console.log(`TOTAL\t\t${total}`);
        });
}

main();


function getTotalDividend(fund, year, month) {
    const options = {
        method: 'POST',
        uri: `https://fiis.com.br/${fund.ticker}/?aba=tabela`
    };

    return new Promise((resolve, reject) => rp(options)
        .then(htmlString => {
            // console.log(htmlString);
            const $ = cheerio.load(htmlString);
            const tableRows = $('#tabela tr');
            const totalDivs = getDividend($, tableRows, year, month);
            resolve(fund.qty * totalDivs);
        }));
}

function getDividend($, tableRows, year, month) {
    const date = moment().year(year).month(month - 1).format('MM/YYYY');

    let ret;
    tableRows.each((index, row) => {
        const children = $(row).children();
        const rowDate = $(children[0]).text();
        if (rowDate == date) {
            const dividends = $(children[8]).text().replace(/,/g, '.');
            ret = parseFloat(dividends, 10);
            return false;
        }
    });

    return ret;
}
