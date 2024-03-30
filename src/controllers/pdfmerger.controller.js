const fetch = require('node-fetch');
const { PDFDocument, rgb, degrees, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const { base } = require('../../airtable');

async function pdfMergerController(req, res) {
  const recordID = req.query.recordID;

  try {
    const pdfUrls = await fetchData(recordID);
    const modifiedPdfBytes = await mergeAndModifyPDFs(pdfUrls, recordID);

    // Set the response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=modified.pdf'); // Fix the Content-Disposition header

    res.send(Buffer.from(modifiedPdfBytes));
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
}

async function fetchData(recordID) {
  let items = []; // Use an array to store both n and the URL
  const zakazy_podrobno = 'заказы подробно';

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
              const url = item.get('чертеж') ? item.get('чертеж')[0].url : null;
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

function findRecord(recordID) {
  const zakazy_obwee = 'заказы общее';
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
        reject(err); // Handle rejection here
      });
  });
}
function tapsyrysZholdary(recordID) {
  const zakazy_podrobno = 'заказы подробно';
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
              naimenovanie: item.get('Наименование1'),
              kol_vo: item.get('Кол-во'),
              postavshik: String(item.get('поставшик')),
              kraska_metal: item.get('краска метал'),
              nomer: item.get('номер'),
              client_from_zakaz: item.get('клиент (from заказ номер)'),
              tel1: item.get('тел1'),
              data_zdachi: item.get('дата сдачи на товар'),
              designer: item.get('дизайнер'),
              cenaDostavki: item.get('цена доставки'),
            });
          });
          fetchNextPage();
        } catch (e) {
          reject(e);
        }
      })
      .then(() => {
        data.sort((a, b) => a.n - b.n); // Sorting the data by `n` in ascending order
        resolve(data);
      })
      .catch((error) => {
        reject(error);
      });
  });
}
function dostavkaData(recordID) {
  const dostavka = 'доставки';
  return new Promise((resolve, reject) => {
    base(dostavka)
      .select({
        filterByFormula: `{record_id (from заказ)} = '${recordID}'`,
      })
      .eachPage(
        function page(records, fetchNextPage) {
          try {
            resolve(records); // Resolve with records
            fetchNextPage();
          } catch (e) {
            reject(e);
          }
        },
        function done(err) {
          if (err) {
            reject(err); // Reject if there's an error
          }
        }
      );
  });
}

async function mergeAndModifyPDFs(pdfUrls, recordID) {
  const mergedPdf = await PDFDocument.create();
  const fontBytes = await fetch('https://pdf-lib.js.org/assets/ubuntu/Ubuntu-R.ttf').then((res) =>
    res.arrayBuffer()
  );

  mergedPdf.registerFontkit(fontkit);
  const customFont = await mergedPdf.embedFont(fontBytes);

  const data = await findRecord(recordID);
  const aikyn_chertezh = await tapsyrysZholdary(recordID);
  const dostavka = await dostavkaData(recordID);
  const address = dostavka[0].get('адрес');
  const kol_vo_reisov = dostavka[0].get('кол-во рейсов');
  const type_deliver = dostavka[0].get('тип доставки');
  const vygruzka = dostavka[0].get('выгрузка');
  const ustanovka = dostavka[0].get('установка');
  const komment = dostavka[0].get('комментарий');
  const nomer = String(data[0].get('номер'));
  const manager = String(data[0].get('Менеджер'));
  const srochno = String(data[0].get('Срочно'));
  const aty = String(data[0].get('Аты (from клиент)'));
  const nomer_zakaza = 'Номер заказ:' + ' ' + nomer;
  const manager_zakaza = 'Менеджер:' + ' ' + manager;
  const aty_from_client = 'Аты:' + ' ' + aty;
  const tel2_from_client = 'Тел:' + ' ' + String(data[0].get('тел2 (from клиент)'));
  const srochno_zakaza = 'Срочно:' + ' ' + (srochno ? 'Иа' : 'Жок');
  const fontSize = 12;
  let size = 0;
  let index = 0;
  let isFirst = true;
  for (const pdfUrl of pdfUrls) {
    const pdfBytes = await fetch(pdfUrl).then((res) => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());

    if (isFirst) {
      const firstPageDimensions = pages[0].getSize();

      // Create a new page in the merged PDF document with the same dimensions as the existing pages
      const newpage = mergedPdf.addPage([firstPageDimensions.width, firstPageDimensions.height]);

      // Add custom content only to the first page of the first PDF
      newpage.drawText(nomer_zakaza, {
        x: 10,
        y: 560,
        size: fontSize,
        font: customFont,
        color: rgb(0, 0, 0, 0),
      });

      newpage.drawText(aty_from_client, {
        x: 10,
        y: 540,
        size: fontSize,
        font: customFont,
        color: rgb(0, 0, 0, 0),
      });

      newpage.drawText(tel2_from_client, {
        x: 10,
        y: 520,
        size: fontSize,
        font: customFont,
        color: rgb(0, 0, 0, 0),
      });

      newpage.drawText(manager_zakaza, {
        x: 10,
        y: 500,
        size: fontSize,
        font: customFont,
        color: rgb(0, 0, 0, 0),
      });

      newpage.drawText(srochno_zakaza, {
        x: 10,
        y: 480,
        size: fontSize,
        font: customFont,
        color: rgb(0, 0, 0, 0),
      });

      // Set the flag to false after processing the first PDF

      // Add content to the remaining pages of each PDF
      newpage.drawText('Тапсырыс жолдары:', {
        x: 10,
        y: 450,
        size: fontSize,
        font: customFont,
        color: rgb(0, 0, 0, 0),
      });
      //50+0*5=0, 50+1*5, 50+2*5
      const arr = 'N| наименование| колво| поставщик| краска| датасдачи| дизайнер| цена-доставки'; const arrWithSpaces = arr.split(' ').join('           ');

      newpage.drawText(arrWithSpaces, {
        x: 10,
        y: 430,
        size: fontSize,
        font: customFont,
        color: rgb(0, 0, 0, 0),
      });
      aikyn_chertezh.forEach((item, index) => {
        const chertezh_podrobno = `${item.n || ''} |  ${item.naimenovanie || ''} | ${
          item.kol_vo || ''
        }шт  |  ${item.postavshik || ''} | ${item.kraska_metal || ''} | ${
          item.data_zdachi || ''
        } | ${item.designer || ''} | ${item.cenaDostavki || ''}`;

        newpage.drawText(chertezh_podrobno, {
          x: 10,
          y: 410 - index * 20,
          size: fontSize,
          font: customFont,
          color: rgb(0, 0, 0, 0),
        });
        size = 410 - index * 20;
      });
      let yPos = size;

      const details = [
        { label: 'Адрес:', value: address },
        { label: 'кол-во-рейсов:', value: kol_vo_reisov },
        { label: 'выгрузка:', value: vygruzka },
        { label: 'установка:', value: ustanovka },
        { label: 'коммент:', value: komment },
        { label: 'тип доставки:', value: type_deliver },
      ];

      details.forEach((detail, index) => {
        const line = `${detail.label} ${detail.value || ''}`;
        newpage.drawText(line, {
          x: 10,
          y: yPos - 30 - index * 20,
          size: fontSize,
          font: customFont,
          color: rgb(0, 0, 0), // Assuming you want black text
        });
      });

      isFirst = false;
    }
    const tel1 = String(aikyn_chertezh[index].tel1).substring(
      5,
      String(aikyn_chertezh[index].tel1)
    );

    const chertezh_podrobno = `N:${
      aikyn_chertezh[index].n
    } | Клиент:${aty} | Тел:${tel1} | Наименование:${String(
      aikyn_chertezh[index].naimenovanie
    ).trim()} `;
    const chertezh_lines = chertezh_podrobno.split(' ');

    pages[0].drawText(chertezh_podrobno, {
      x: 30,
      y: 550,
      size: fontSize,
      font: customFont,
      color: rgb(0, 0, 0, 0),
    });

    const chertezh_lines1 = `Кол-во:${aikyn_chertezh[index].kol_vo}шт| Датасдачи:${
      aikyn_chertezh[index].data_zdachi
    } | Поставщик:${aikyn_chertezh[index].postavshik}| Краска-металл:${
      aikyn_chertezh[index].kraska_metal || ''
    } `;

    pages[0].drawText(chertezh_lines1, {
      x: 30,
      y: 530,
      size: fontSize,
      font: customFont,
      color: rgb(0, 0, 0, 0),
    });

    index++;

    // Add copied pages to the merged PDF
    pages.forEach((page) => {
      const { width, height } = page.getSize();
      const modifiedPage = mergedPdf.addPage(page);
    });
  }

  return await mergedPdf.save();
}

module.exports = pdfMergerController;
