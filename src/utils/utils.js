const { base, path, pdf, ejs } = require('../../airtable');
function findRecord(recordID) {
  const zakazy_obwee = 'Сатылым1';
  return new Promise((resolve, reject) => {
    base(zakazy_obwee)
      .select({
        filterByFormula: `{record_id} = '${recordID}'`,
      })
      .eachPage(function page(records, fetchNextPage) {
        resolve(records); // Resolve inside the callback
        fetchNextPage();
      })
      .catch((err) => {
        reject(err);
      });
  });
}
const fetchRecords = (recordID) => {
  let esf = [];
  let count = 1;
  return new Promise((resolve, reject) => {
    base('Сатылым2')
      .select({
        filterByFormula: `{record_id (from заказ номер)} = '${recordID}'`,
      })
      .eachPage(
        function page(records, fetchNextPage) {
          try {
            records.forEach((item) => {
              const naimenovanie = item.get('ТауарАты1');
              const esfCena = item.get('Баға') ? item.get('Баға').toLocaleString() : '';
              const kol_vo = item.get('Саны');
              let summa = item.get('Сомасы').toLocaleString();

              esf.push({
                Наименование: naimenovanie,
                n: count++,
                efs1: esfCena,
                kol_vo: kol_vo,
                summa: summa,
              });
            });

            fetchNextPage();
          } catch (error) {
            reject(error); // Reject if an error occurs within the try block
          }
        },
        function done(err) {
          if (err) {
            reject(err); // Reject if there's an error when fetching pages
          } else {
            resolve(esf); // Resolve with the collected data when done
          }
        }
      );
  });
};
function deliverData(recordID) {
  const dostavka = 'доставки';
  return new Promise((resolve, reject) => {
    base(dostavka)
      .select({
        filterByFormula: `{record_id (from заказ)} = '${recordID}'`,
      })
      .eachPage(
        function page(records, fetchNextPage) {
          try {
            resolve(records);
            fetchNextPage();
          } catch (e) {
            reject(e);
          }
        },
        function done(err) {
          if (err) {
            reject(err);
          }
        }
      );
  });
}
async function fetchData(recordID) {
  let items = [];
  const zakazy_podrobno = 'Сатылым2';

  return new Promise((resolve, reject) => {
    base(zakazy_podrobno)
      .select({
        filterByFormula: `{record_id (from заказ номер)} = '${recordID}'`,
      })
      .eachPage(
        function page(records, fetchNextPage) {
          try {
            records.forEach((item) => {
              const n = item.get('№');
              const url = item.get('сызба') ? item.get('сызба')[0].url : null;
              if (url) {
                items.push({ n, url });
              }
            });
            fetchNextPage();
          } catch (e) {
            reject(e);
          }
        },
        function done(err) {
          if (err) {
            reject(err);
          } else {
            const sortedUrls = items.sort((a, b) => a.n - b.n).map((item) => item.url);
            resolve(sortedUrls);
          }
        }
      );
  });
}

function tapsyrysZholdary(recordID) {
  const zakazy_podrobno = 'Сатылым2';
  let data = [];
  return new Promise((resolve, reject) => {
    base(zakazy_podrobno)
      .select({
        filterByFormula: `{record_id (from заказ номер)} = '${recordID}'`,
      })
      .eachPage(function page(records, fetchNextPage) {
        try {
          records.forEach((item) => {
            data.push({
              n: item.get('№'),
              naimenovanie: item.get('ТауарАты1'),
              kol_vo: item.get('Саны'),
              postavshik: item.get('поставшик'),
              kraska_metal: item.get('металл бояу'),
              client_from_zakaz: item.get('клиент (from заказ номер)'),
              tel1: item.get('тел1'),
              data_zdachi: item.get('дата сдачи на товар'),
              designer: item.get('дизайнер'),
              cenaDostavki: item.get('цена (доставки)'),
              nomer_zakaza: item.get('номер заказа'),
            });
          });
          fetchNextPage();
        } catch (e) {
          reject(e);
        }
      })
      .then(() => {
        data.sort((a, b) => a.n - b.n);
        resolve(data);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function tapsyrysZholdary1(recordID) {
  const zakazy_podrobno = 'Сатылым2';
  let data = [];
  return new Promise((resolve, reject) => {
    base(zakazy_podrobno)
      .select({
        filterByFormula: `{record_id (from заказ номер)} = '${recordID}'`,
      })
      .eachPage(function page(records, fetchNextPage) {
        try {
          records.forEach((item) => {
            if (item.get('сызба')) {
              data.push({
                n: item.get('№'),
                naimenovanie: item.get('ТауарАты1'),
                kol_vo: item.get('Саны'),
                postavshik: item.get('поставшик'),
                kraska_metal: item.get('металл бояу'),
                client_from_zakaz: item.get('клиент (from заказ номер)'),
                tel1: item.get('тел1'),
                data_zdachi: item.get('дата сдачи на товар'),
                designer: item.get('дизайнер'),
                cenaDostavki: item.get('цена (доставки)'),
                nomer_zakaza: item.get('номер заказа'),
              });
            }
          });
          fetchNextPage();
        } catch (e) {
          reject(e);
        }
      })
      .then(() => {
        data.sort((a, b) => a.n - b.n);
        resolve(data);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

module.exports = { findRecord, fetchRecords, deliverData, fetchData, tapsyrysZholdary, tapsyrysZholdary1};
