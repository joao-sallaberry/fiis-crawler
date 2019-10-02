const cheerio = require('cheerio');
const moment = require('moment');
const rp = require('request-promise');

const month = 9;
const year = 2019;
const funds = require('./funds.json');


function main() {
    const priceGetters = funds.map(fund => getPrice(fund.ticker));
    const allPriceGetters = Promise.all(priceGetters);
    const dividendGetters = funds.map(fund => getTotalDividend(fund, year, month));
    const allDividendGetters = Promise.all(dividendGetters);

    Promise.all([allPriceGetters, allDividendGetters])
        .then(([prices, dividends]) => {
            console.log(`FII\tQTY\tPRICES\tYIELD\tDIVIDENDS`);
            let total = 0;
            for (const [i, fund] of funds.entries()) {
                const totalDividends = fund.qty * dividends[i];
                const divYield = 100 * dividends[i] / prices[i];
                console.log(`${fund.ticker}\t${fund.qty}\t${prices[i]}\t${divYield.toFixed(2)}%\t${totalDividends.toFixed(2)}`);
                total += totalDividends;
            }
            console.log(`TOTAL\t\t\t\t${total.toFixed(2)}`);
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
            resolve(getDividendFromTable($, tableRows, year, month));
        }));
}

function getDividendFromTable($, tableRows, year, month) {
    const date = moment().year(year).month(month - 1).format('MM/YYYY');

    let ret;
    tableRows.each((index, row) => {
        const children = $(row).children();
        const rowDate = $(children[0]).text();
        if (rowDate == date) {
            const dividends = $(children[8]).text();
            ret = parseBrazilianNumber(dividends);
            return false;
        }
    });

    return ret;
}

function getPrice(ticker) {
    const options = {
        method: 'POST',
        uri: 'https://www.clubefii.com.br/pega_cotacao',
        form: { cod_neg: ticker }
    };

    return new Promise((resolve, reject) => rp(options).then(
        payload => resolve(parseBrazilianNumber(payload.split(';')[0]))
    ));
}

function parseBrazilianNumber(brNumber) {
    return parseFloat(brNumber.replace(/,/g, '.'), 10);
}
